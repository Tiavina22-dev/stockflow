import { BadRequestException, Body, ConflictException, Controller, Get, Injectable, NotFoundException, Param, Post, Query, Request, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateNested, ArrayMinSize, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, OperationType, MovementType } from '@prisma/client';
import { readSettings, nextNumber } from './application-settings';
import { PrismaService } from './prisma.service';
import { createHash } from 'node:crypto';
import { Actor, RequirePermission, ShopAccess } from './auth';

export class LineDto {
  @IsUUID() productId: string;
  @IsNumberString() quantity: string;
  @IsOptional() @IsNumberString() unitPrice?: string;
  @IsOptional() @IsNumberString() supplierPrice?: string;
  @IsOptional() @IsString() reason?: string;
}
export class OperationDto {
  @IsIn(['STOCK_IN', 'STOCK_OUT', 'CUSTOMER_RETURN', 'TRANSFER', 'INVENTORY_ADJUSTMENT', 'SALE']) type: OperationType;
  @IsUUID() shopId: string;
  @IsOptional() @IsUUID() destinationShopId?: string;
  @IsString() businessDate: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LineDto) lines: LineDto[];
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsIn(['GENERAL', 'INTERNAL_CONSUMPTION']) stockOutPurpose?: 'GENERAL' | 'INTERNAL_CONSUMPTION';
  @IsOptional() @IsUUID() customerId?: string | null;
  @IsOptional() @IsIn(['CASH', 'MOBILE_MONEY', 'BANK']) paymentMethod?: 'CASH' | 'MOBILE_MONEY' | 'BANK';
  @IsOptional() @IsNumberString() discount?: string;
  @IsIn(['DRAFT', 'VALIDATED']) status: 'DRAFT' | 'VALIDATED';
  @IsUUID() requestKey: string;
}
export class ReasonDto { @IsString() reason: string; }
export const permissionFor: Record<string, string> = { STOCK_IN: 'stock.in', STOCK_OUT: 'stock.out', CUSTOMER_RETURN: 'stock.return', TRANSFER: 'stock.transfer', INVENTORY_ADJUSTMENT: 'stock.inventory', SALE: 'sales.create' };
export function decimal(value: string, scale: number, positive = false) {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new BadRequestException('Valeur décimale positive ou nulle requise.');
  const n = new Prisma.Decimal(value);
  if (!n.isFinite() || n.decimalPlaces() > scale || n.gte('1000000000000000') || (positive && n.lte(0))) throw new BadRequestException('Valeur décimale hors limites.');
  return n;
}
export function businessDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Date métier attendue : AAAA-MM-JJ.');
  const parsed = new Date(`${value}T00:00:00+03:00`);
  if (!Number.isFinite(parsed.getTime()) || new Date(parsed.getTime() + 10800000).toISOString().slice(0, 10) !== value) throw new BadRequestException('Date métier invalide.');
  return parsed;
}

@Injectable()
export class OperationsService {
  constructor(private readonly db: PrismaService, private readonly access: ShopAccess) {}
  permission(actor: Actor, permission: string) { if (!actor.permissions.includes(permission)) throw new ForbiddenException(`Permission requise : ${permission}`); }
  async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.db.$transaction(work, { isolationLevel: 'Serializable', timeout: 20000 }); }
      catch (e) { if (!(e instanceof Prisma.PrismaClientKnownRequestError) || !['P2034', 'P2002'].includes(e.code) || attempt >= 3) throw e; }
    }
  }
  async create(body: OperationDto, actor: Actor, originalId?: string, existingTx?: Prisma.TransactionClient, plannedValidation = false) {
    this.permission(actor, originalId ? 'sales.correct' : body.type==='INVENTORY_ADJUSTMENT'?'stock.adjust':permissionFor[body.type]);
    this.access.assert(actor, body.shopId);
    if (body.stockOutPurpose && body.type !== 'STOCK_OUT') throw new BadRequestException('La consommation interne est une sortie de stock.');
    if ((body.customerId !== undefined || body.paymentMethod) && body.type !== 'SALE') throw new BadRequestException('Client et paiement réservés aux ventes.');
    if (body.stockOutPurpose === 'INTERNAL_CONSUMPTION' && !body.reason?.trim()) throw new BadRequestException('Un motif est obligatoire pour la consommation interne.');
    if (body.type === 'TRANSFER') {
      if (!body.destinationShopId || body.destinationShopId === body.shopId) throw new BadRequestException('Deux magasins différents sont requis.');
      this.access.assert(actor, body.destinationShopId);
    } else if (body.destinationShopId) throw new BadRequestException('Destination réservée aux transferts.');
    if (body.status === 'VALIDATED' && body.type === 'SALE') this.permission(actor, 'sales.validate');
    if (originalId && (body.type !== 'SALE' || !body.reason?.trim())) throw new BadRequestException('Une correction exige une vente et un motif.');
    const requestHash = createHash('sha256').update(JSON.stringify({ ...body, requestKey: undefined, originalId })).digest('hex');
    const date = businessDate(body.businessDate);
    if (new Set(body.lines.map(l => l.productId)).size !== body.lines.length) throw new BadRequestException('Un produit ne doit apparaître qu’une fois.');
    const work = async (tx: Prisma.TransactionClient) => {
      const previous = await tx.operation.findUnique({ where: { requestKey: body.requestKey }, include: { lines: true } });
      if (previous) {
        if (previous.createdById !== actor.id || previous.shopId !== body.shopId || previous.requestHash !== requestHash) throw new ConflictException('Clé de requête déjà utilisée avec un autre contenu.');
        return this.result(tx, previous.id);
      }
      const stockRules=await readSettings(tx,'stock'),salesRules=await readSettings(tx,'ventes');
      if(body.type==='TRANSFER'&&!stockRules.autoriserTransfertsEntreMagasins) throw new BadRequestException('Les transferts sont desactives.');
      if(body.type==='INVENTORY_ADJUSTMENT'&&stockRules.motifObligatoirePourCorrection&&!body.reason?.trim()&&!body.lines.every(l=>l.reason?.trim())) throw new BadRequestException('Motif de correction requis.');
      if(body.type==='SALE') {
        if(body.status==='DRAFT'&&!plannedValidation&&!salesRules.autoriserBrouillons) throw new BadRequestException('Les brouillons de vente sont desactives.');
        if(salesRules.clientObligatoire&&!body.customerId&&!originalId) throw new BadRequestException('Un client est obligatoire.');
        const mode=body.paymentMethod??'CASH';
        const paymentCodes:Record<string,string>={CASH:'especes',MOBILE_MONEY:'mobile-money',BANK:'bancaire'};
        if(!originalId&&!salesRules.modesDePaiement.includes(paymentCodes[mode])) throw new BadRequestException('Ce mode de paiement est desactive.');
      }
      const shops = await tx.shop.findMany({ where: { id: { in: [body.shopId, ...(body.destinationShopId ? [body.destinationShopId] : [])] }, active: true } });
      if (shops.length !== (body.type === 'TRANSFER' ? 2 : 1)) throw new BadRequestException('Magasin inactif ou introuvable.');
      let original;
      if (originalId) {
        original = await tx.operation.findUnique({ where: { id: originalId }, include: { movements: true, lines: true } });
        if (!original || original.type !== 'SALE' || original.status === 'CANCELLED' || original.superseded || original.shopId !== body.shopId) throw new ConflictException('Vente non modifiable.');
        if(original.journalId && original.status==='DRAFT') throw new BadRequestException('Ce brouillon appartient a un journal complet.');
        if (original.status === 'VALIDATED') {
          if(!salesRules.autoriserModificationApresValidation) throw new BadRequestException('Modification apres validation desactivee.');
          if (body.status !== 'VALIDATED') throw new BadRequestException('Une vente validée doit rester validée après correction.');
          await this.reverse(tx, original, actor, body.reason!);
        }
        await tx.operation.update({ where: { id: original.id }, data: { superseded: true } });
      }
      let subtotal = new Prisma.Decimal(0);
      const customer = body.customerId ? await tx.customer.findUnique({ where: { id: body.customerId } }) : null;
      if (body.customerId && (!customer?.active || customer.shopId !== body.shopId)) throw new BadRequestException('Client actif du même magasin requis.');
      const lines = [];
      for (const line of body.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.active) throw new BadRequestException('Produit inactif ou introuvable.');
        const quantity = decimal(line.quantity, 3, body.type !== 'INVENTORY_ADJUSTMENT');
        const shopPrice = body.type === 'SALE' ? await tx.productPrice.findUnique({ where: { productId_shopId: { productId: product.id, shopId: body.shopId } } }) : null;
        const expectedUnitPrice = shopPrice?.price ?? product.salePrice;
        const unitPrice = body.type === 'SALE' ? decimal(line.unitPrice ?? expectedUnitPrice?.toString() ?? '0', 2) : undefined;
        const lineTotal = unitPrice?.mul(quantity).toDecimalPlaces(2);
        if (lineTotal) subtotal = subtotal.add(lineTotal);
        const previousLine = original?.status === 'VALIDATED' ? original.lines.find(l => l.productId === line.productId) : undefined;
        const supplierPrice = body.type === 'SALE' && original?.status === 'VALIDATED' ? (previousLine ? previousLine.supplierPrice : product.supplierPrice) : line.supplierPrice === undefined ? undefined : decimal(line.supplierPrice, 2);
        lines.push({ productId: line.productId, productName: product.name, productReference: product.reference, quantity, unitPrice, expectedUnitPrice: body.type === 'SALE' ? expectedUnitPrice : undefined, supplierPrice, lineTotal, reason: line.reason });
      }
      const discount = decimal(body.discount ?? '0', 2);
      if ((body.type !== 'SALE' && discount.gt(0)) || discount.gt(subtotal)) throw new BadRequestException('Remise supérieure au total ou réservée aux ventes.');
      const number = await nextNumber(tx, body.type, date);
      const op = await tx.operation.create({ data: { type: body.type, shopId: body.shopId, destinationShopId: body.destinationShopId, businessDate: date, createdById: actor.id, number, note: body.note, reason: body.reason, stockOutPurpose: body.type === 'STOCK_OUT' ? body.stockOutPurpose ?? 'GENERAL' : null, taxRate: original?.taxRate, currencyLabel: original?.currencyLabel, originalId, requestKey: body.requestKey, requestHash, discount, total: subtotal.sub(discount), lines: { create: lines } }, include: { lines: true } });
      if (body.type === 'SALE') await tx.operation.update({ where: { id: op.id }, data: { customerId: body.customerId === null ? null : customer?.id ?? original?.customerId, customerSnapshot: body.customerId === null ? Prisma.DbNull : customer ? { id: customer.id, name: customer.name, address: customer.address, phone: customer.phone, email: customer.email, nif: customer.nif, stat: customer.stat } : original?.customerSnapshot ?? undefined, paymentMethod: body.paymentMethod ?? (original ? original.paymentMethod : 'CASH') } });
      if (body.status === 'VALIDATED') await this.validateTx(tx, op.id, actor);
      await tx.auditEvent.create({ data: { actorId: actor.id, action: original ? 'sale.revise' : 'operation.create', entityType: 'Operation', entityId: op.id, shopId: op.shopId, reason: body.reason, newValue: { type: op.type, originalId: originalId ?? null } } });
      return this.result(tx, op.id);
    };
    return existingTx ? work(existingTx) : this.transaction(work);
  }
  async move(tx: Prisma.TransactionClient, op: { id: string; businessDate: Date }, productId: string, shopId: string, delta: Prisma.Decimal, type: MovementType, actorId: string, allowNegative = true, unitPrice?: Prisma.Decimal | null) {
    if (delta.isZero()) return;
    const balance = await tx.stockBalance.upsert({ where: { productId_shopId: { productId, shopId } }, create: { productId, shopId, quantity: delta }, update: { quantity: { increment: delta } } });
    if (!allowNegative && balance.quantity.lt(0)) throw new BadRequestException('Stock insuffisant : le paramètre interdit le stock négatif.');
    await tx.stockMovement.create({ data: { operationId: op.id, productId, shopId, quantityDelta: delta, type, unitPrice, businessDate: op.businessDate, userId: actorId } });
  }
  async validateTx(tx: Prisma.TransactionClient, id: string, actor: Actor, journalContext?: string) {
    const op = await tx.operation.findUnique({ where: { id }, include: { lines: true } });
    if (!op) throw new NotFoundException('Opération introuvable.');
    this.access.assert(actor, op.shopId);
    this.permission(actor, op.type === 'SALE' ? 'sales.validate' : op.type==='INVENTORY_ADJUSTMENT'?'stock.adjust':permissionFor[op.type]);
    if(op.journalId && op.journalId!==journalContext) throw new BadRequestException('Validez le journal complet depuis le cahier.');
    if (op.status !== 'DRAFT' || op.superseded) throw new ConflictException('Opération déjà validée, annulée ou remplacée.');
    if (op.stockOutPurpose === 'INTERNAL_CONSUMPTION' && !op.reason?.trim()) throw new BadRequestException('Motif de consommation interne requis.');
    if (!(await tx.shop.findUnique({ where: { id: op.shopId } }))?.active) throw new BadRequestException('Magasin inactif.');
    if (op.destinationShopId) {
      this.access.assert(actor, op.destinationShopId);
      if (!(await tx.shop.findUnique({ where: { id: op.destinationShopId } }))?.active) throw new BadRequestException('Destination inactive.');
    }
    const stockRules=await readSettings(tx,'stock'),salesRules=await readSettings(tx,'ventes');
    if(op.type==='INVENTORY_ADJUSTMENT'&&stockRules.validationObligatoirePourInventaire) this.permission(actor,'stock.inventory');
    if(op.type==='TRANSFER'&&!stockRules.autoriserTransfertsEntreMagasins) throw new BadRequestException('Les transferts sont desactives.');
    if(op.type==='INVENTORY_ADJUSTMENT'&&stockRules.motifObligatoirePourCorrection&&!op.reason?.trim()&&!op.lines.every(l=>l.reason?.trim())) throw new BadRequestException('Motif de correction requis.');
    if(op.type==='SALE') {
      if(salesRules.clientObligatoire&&!op.customerId) throw new BadRequestException('Un client est obligatoire.');
      const codes:Record<string,string>={CASH:'especes',MOBILE_MONEY:'mobile-money',BANK:'bancaire'};
      if(!op.paymentMethod||!salesRules.modesDePaiement.includes(codes[op.paymentMethod])) throw new BadRequestException('Mode de paiement desactive.');
    }
    const settings = await tx.stockSettings.upsert({ where: { id: 'global' }, create: {}, update: {} });
    for (const line of [...op.lines].sort((a, b) => a.productId.localeCompare(b.productId))) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product?.active) throw new BadRequestException('Produit inactif.');
      let delta = line.quantity;
      if (op.type === 'SALE' || op.type === 'STOCK_OUT' || op.type === 'TRANSFER') delta = delta.negated();
      if (op.type === 'INVENTORY_ADJUSTMENT') {
        const before = await tx.stockBalance.findUnique({ where: { productId_shopId: { productId: line.productId, shopId: op.shopId } } });
        delta = line.quantity.sub(before?.quantity ?? 0);
        await tx.operationLine.update({ where: { id: line.id }, data: { systemBefore: before?.quantity ?? new Prisma.Decimal(0), countedQuantity: line.quantity, adjustmentDelta: delta } });
      }
      if (op.type === 'SALE' && !op.originalId) await tx.operationLine.update({ where: { id: line.id }, data: { supplierPrice: product.supplierPrice } });
      if (op.type === 'STOCK_IN' && line.supplierPrice !== null && !line.supplierPrice.equals(product.supplierPrice ?? -1)) {
        await tx.priceChange.create({ data: { productId: product.id, kind: 'supplier', oldPrice: product.supplierPrice, newPrice: line.supplierPrice, origin: op.id, userId: actor.id } });
        await tx.product.update({ where: { id: product.id }, data: { supplierPrice: line.supplierPrice } });
      }
      await this.move(tx, op, line.productId, op.shopId, delta, op.type === 'TRANSFER' ? 'TRANSFER_OUT' : op.type as MovementType, actor.id, settings.allowNegativeStock, line.unitPrice);
      if (op.destinationShopId) await this.move(tx, op, line.productId, op.destinationShopId, line.quantity, 'TRANSFER_IN', actor.id, settings.allowNegativeStock);
    }
    const company = await tx.companySettings.upsert({ where: { id: 'global' }, create: {}, update: {} });
    await tx.operation.update({ where: { id }, data: { status: 'VALIDATED', validatedAt: new Date(), validatedById: actor.id, taxRate: op.originalId ? op.taxRate : company.taxRate, currencyLabel: op.originalId ? op.currencyLabel : company.currencyLabel } });
    await tx.auditEvent.create({ data: { actorId: actor.id, action: 'operation.validate', entityType: 'Operation', entityId: id, shopId: op.shopId } });
  }
  async result(tx: Prisma.TransactionClient, id: string) {
    const op = await tx.operation.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    const warnings = op.status === 'VALIDATED' ? await this.stockWarnings(tx, [op.shopId, ...(op.destinationShopId ? [op.destinationShopId] : [])], op.lines.map(l => l.productId)) : [];
    return { ...op, warnings };
  }
  async stockWarnings(tx: Prisma.TransactionClient, shops: string[], products: string[]) {
    const balances = await tx.stockBalance.findMany({ where: { shopId: { in: shops }, productId: { in: products } }, include: { product: true } });
    const rules = await readSettings(tx, 'stock');
    const warnings = balances.flatMap(b => {
      const detail = `produit ${b.product.name}, magasin ${b.shopId}, solde ${b.quantity.toString()}.`;
      if (b.quantity.lt(0)) return [`Stock négatif : ${detail}`];
      if (b.quantity.eq(0) && rules.alerteRuptureDeStock) return [`Rupture de stock : ${detail}`];
      if (b.quantity.gt(0) && b.quantity.lte(b.product.lowStockThreshold) && rules.alerteStockFaible) return [`Stock faible : ${detail}`];
      return [];
    });
    return warnings;
  }
  validate(id: string, actor: Actor) { return this.transaction(async tx => { await this.validateTx(tx, id, actor); return this.result(tx, id); }); }
  async reverse(tx: Prisma.TransactionClient, original: { id: string; shopId: string; movements: { productId: string; shopId: string; quantityDelta: Prisma.Decimal }[] }, actor: Actor, reason: string) {
    const reversal = await tx.operation.create({ data: { type: 'CANCELLATION', originalId: original.id, shopId: original.shopId, businessDate: new Date(), createdById: actor.id, validatedById: actor.id, validatedAt: new Date(), status: 'VALIDATED', reason } });
    for (const movement of original.movements) await this.move(tx, reversal, movement.productId, movement.shopId, movement.quantityDelta.negated(), 'CANCELLATION', actor.id);
  }
  cancel(id: string, actor: Actor, reason: string) {
    this.permission(actor, 'sales.cancel');
    return this.transaction(async tx => {
      const op = await tx.operation.findUnique({ where: { id }, include: { movements: true } });
      if (!op || op.type !== 'SALE') throw new NotFoundException('Vente introuvable.');
      this.access.assert(actor, op.shopId);
      if(op.journalId && op.status==='DRAFT') throw new BadRequestException('Ce brouillon appartient a un journal complet.');
      const rules=await readSettings(tx,'ventes');
      if(!rules.autoriserAnnulation) throw new BadRequestException('Annulation desactivee.');
      if(rules.motifObligatoirePourAnnulation && !reason.trim()) throw new BadRequestException('Motif obligatoire.');
      if (op.status === 'CANCELLED' || op.superseded) throw new ConflictException('Vente déjà annulée ou remplacée.');
      if (op.status === 'VALIDATED') await this.reverse(tx, op, actor, reason);
      await tx.operation.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'sale.cancel', entityType: 'Operation', entityId: id, shopId: op.shopId, reason } });
      return { cancelled: true };
    });
  }
}

@ApiTags('operations') @ApiBearerAuth() @Controller('operations')
export class OperationsController {
  constructor(private readonly service: OperationsService, private readonly db: PrismaService, private readonly access: ShopAccess) {}
  @Post() create(@Body() body: OperationDto, @Request() req: { actor: Actor }) { return this.service.create(body, req.actor); }
  @Post(':id/validate') validate(@Param('id') id: string, @Request() req: { actor: Actor }) { return this.service.validate(id, req.actor); }
  @Post(':id/cancel') cancel(@Param('id') id: string, @Body() body: ReasonDto, @Request() req: { actor: Actor }) { return this.service.cancel(id, req.actor, body.reason); }
  @Post(':id/revisions') revise(@Param('id') id: string, @Body() body: OperationDto, @Request() req: { actor: Actor }) { return this.service.create(body, req.actor, id); }
  @Get() @RequirePermission('sales.read') async list(@Query('shopId') shopId: string, @Request() req: { actor: Actor }) {
    this.access.assert(req.actor, shopId);
    return this.db.operation.findMany({ where: { shopId, type: 'SALE', superseded: false }, include: { shop: true, createdBy: { select: { id: true, name: true } }, lines: { include: { product: true } } }, orderBy: [{ businessDate: 'desc' },{ createdAt:'desc' },{id:'desc'}] });
  }
  @Get(':id') @RequirePermission('sales.read') async one(@Param('id') id: string, @Request() req: { actor: Actor }) {
    const op = await this.db.operation.findUnique({ where: { id }, include: { shop: true, createdBy: { select: { id: true, name: true } }, lines: { include: { product: true } } } });
    if (!op) throw new NotFoundException('Vente introuvable.');
    this.access.assert(req.actor, op.shopId); return op;
  }
}
