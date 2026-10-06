import { BadRequestException, Body, ConflictException, Controller, Get, Param, ParseUUIDPipe, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Actor, RequirePermission } from './auth';
import { FinanceService } from './finance';
import { OperationsService } from './operations';
import { PrismaService } from './prisma.service';
import { ApiDomainErrors, ApiRecord } from './finance-contract';

class PriceDecisionDto {
  @ApiProperty({ description: 'Identifiant opaque renvoyé par GET, incluant la version du prix' }) @IsString() @MaxLength(101) id: string;
  @ApiProperty({ enum: ['valider', 'refuser'] }) @IsIn(['valider', 'refuser']) decision: 'valider' | 'refuser';
}
class PriceDecisionsDto {
  @ApiProperty({ type: [PriceDecisionDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PriceDecisionDto) decisions: PriceDecisionDto[];
}
const action = 'supplier-price.decide';
function proposalId(lineId: string, price: Prisma.Decimal | null, updatedAt: Date) {
  return `${lineId}:${createHash('sha256').update(`${price?.toFixed(2) ?? 'null'}:${updatedAt.toISOString()}`).digest('hex')}`;
}

@ApiTags('supplier-invoices') @ApiBearerAuth() @ApiDomainErrors() @Controller('supplier-invoices')
export class SupplierPriceReviewController {
  constructor(private readonly db: PrismaService, private readonly finance: FinanceService, private readonly ops: OperationsService) {}

  private async pending(tx: Prisma.TransactionClient, id: string, actor: Actor) {
    const invoice = await this.finance.read(tx, id, 'SUPPLIER_INVOICE', actor);
    const decided = await tx.auditEvent.findMany({ where: { action, entityType: 'SupplierInvoiceLine', entityId: { in: invoice.lines.map(l => l.id) } }, select: { entityId: true } });
    const done = new Set(decided.map(d => d.entityId));
    const products = await tx.product.findMany({ where: { id: { in: invoice.lines.map(l => l.productId) } }, include: { brand: true, balances: { where: { shopId: invoice.shopId } } } });
    const shop = await tx.shop.findUniqueOrThrow({ where: { id: invoice.shopId } });
    const lines = invoice.status !== 'VALIDATED' ? [] : invoice.lines.flatMap(line => {
      const product = products.find(p => p.id === line.productId)!;
      if (done.has(line.id) || product.supplierPrice?.equals(line.unitPrice)) return [];
      return [{ line, product, token: proposalId(line.id, product.supplierPrice, product.updatedAt) }];
    });
    return { invoice, shop, lines };
  }

  @Get(':id/price-review') @RequirePermission('supplier-invoices.read') @ApiOperation({ summary: 'Prix différents du catalogue, non décidés, sur une facture validée ; ancienPrix null si inconnu' })
  @ApiRecord({ type: 'object', required: ['magasinNom', 'origine', 'lignes'], properties: { magasinNom: { type: 'string' }, origine: { type: 'string' }, lignes: { type: 'array', items: { type: 'object', required: ['id', 'produitNom', 'reference', 'fournisseurNom', 'ancienPrix', 'nouveauPrix', 'stockActuel'], properties: { id: { type: 'string' }, produitNom: { type: 'string' }, reference: { type: 'string' }, fournisseurNom: { type: 'string' }, photoUrl: { type: 'string' }, ancienPrix: { type: 'number', nullable: true }, nouveauPrix: { type: 'number' }, stockActuel: { type: 'number' } } } } } })
  get(@Param('id', ParseUUIDPipe) id: string, @Request() req: { actor: Actor }) {
    this.ops.permission(req.actor, 'products.read');
    this.ops.permission(req.actor, 'stock.read');
    return this.db.$transaction(async tx => {
      const { invoice, shop, lines } = await this.pending(tx, id, req.actor);
      return { magasinNom: shop.name, origine: `Facture fournisseur ${invoice.number}`, lignes: lines.map(({ line, product, token }) => ({
        id: token, produitNom: line.productName, reference: line.productReference, fournisseurNom: product.brand?.name ?? invoice.supplierName ?? '',
        ...(product.photoUrl ? { photoUrl: product.photoUrl } : {}), ancienPrix: product.supplierPrice ? Number(product.supplierPrice) : null,
        nouveauPrix: Number(line.unitPrice), stockActuel: Number(product.balances[0]?.quantity ?? 0),
      })) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  @Post(':id/price-review') @RequirePermission('products.price.update') @ApiOperation({ summary: 'Accepter ou refuser les prix explicitement ; transaction, audit permanent et historique ; 409 si vue périmée' })
  @ApiRecord({ type: 'object', required: ['saved'], properties: { saved: { type: 'boolean' } } }, 201)
  async decide(@Param('id', ParseUUIDPipe) id: string, @Body() body: PriceDecisionsDto, @Request() req: { actor: Actor }) {
    this.ops.permission(req.actor, 'supplier-invoices.read');
    if (new Set(body.decisions.map(d => d.id)).size !== body.decisions.length) throw new BadRequestException('Décisions distinctes requises.');
    try {
      await this.ops.transaction(async tx => {
        const { invoice, shop, lines } = await this.pending(tx, id, req.actor);
        if (invoice.status !== 'VALIDATED') throw new BadRequestException('Validez la facture avant de décider les prix.');
        if (!shop.active) throw new BadRequestException('Magasin inactif.');
        for (const decision of body.decisions) {
          const row = lines.find(l => l.token === decision.id);
          if (!row) throw new ConflictException('Prix modifié ou déjà décidé. Rechargez la vérification.');
          const { line, product } = row;
          if (decision.decision === 'valider') {
            if (!product.active) throw new BadRequestException('Produit inactif : réactivez-le avant de modifier son prix.');
            await tx.product.update({ where: { id: product.id }, data: { supplierPrice: line.unitPrice } });
            await tx.priceChange.create({ data: { productId: product.id, shopId: invoice.shopId, kind: 'supplier', oldPrice: product.supplierPrice, newPrice: line.unitPrice, userId: req.actor.id, origin: 'SUPPLIER_INVOICE' } });
          }
          await tx.auditEvent.create({ data: {
            actorId: req.actor.id, shopId: invoice.shopId, action, entityType: 'SupplierInvoiceLine', entityId: line.id,
            oldValue: { supplierPrice: product.supplierPrice?.toFixed(2) ?? null },
            newValue: { decision: decision.decision, invoiceId: invoice.id, productId: product.id, proposedPrice: line.unitPrice.toFixed(2), supplierPrice: decision.decision === 'valider' ? line.unitPrice.toFixed(2) : product.supplierPrice?.toFixed(2) ?? null },
          } });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Prix déjà décidé. Rechargez la vérification.');
      throw error;
    }
    return { saved: true };
  }
}
