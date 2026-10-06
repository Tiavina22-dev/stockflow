import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Post, Request, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { readSettings, nextNumber } from './application-settings';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { businessDate, OperationsService } from './operations';
import { formatAmount, invoiceTotals } from './money';

export class IssueInvoiceDto {
  @ApiProperty() @IsUUID() saleOperationId: string;
  @ApiPropertyOptional({ description: 'Client actif du magasin de la vente ; coordonnées copiées' }) @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional({ example: '2026-10-04', description: 'Date métier Madagascar, distincte de la date réelle d’émission' }) @IsOptional() @IsString() invoiceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) customerStat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) customerNif?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly db: PrismaService, private readonly access: ShopAccess, private readonly operations: OperationsService) {}
  issue(body: IssueInvoiceDto, actor: Actor) {
    this.operations.permission(actor, 'invoices.create');
    return this.operations.transaction(async tx => {
      const sale = await tx.operation.findUnique({ where: { id: body.saleOperationId }, include: { lines: true, shop: true } });
      if (!sale) throw new NotFoundException('Vente introuvable.');
      this.access.assert(actor, sale.shopId);
      const existing = await tx.customerInvoice.findUnique({ where: { saleOperationId: sale.id } });
      if (sale.type !== 'SALE' || sale.status !== 'VALIDATED' || sale.superseded) throw new BadRequestException('Une facture exige une vente validée et effective.');
      if (existing) return existing;
      if (sale.taxRate === null) throw new BadRequestException('TVA historique inconnue : une facture ne peut pas être émise depuis cette vente importée.');
      const customer = body.customerId ? await tx.customer.findUnique({ where: { id: body.customerId } }) : null;
      if (body.customerId && (!customer?.active || customer.shopId !== sale.shopId)) throw new BadRequestException('Client actif du magasin de la vente requis.');
      const date = body.invoiceDate ? businessDate(body.invoiceDate) : new Date();
      if (date > new Date()) throw new BadRequestException('La date de facture ne peut pas être future.');
      let ancestorId = sale.originalId;
      let originalInvoice = null;
      // Chercher la facture précédente dans la chaîne de révisions, jamais dans un nom libre.
      while (ancestorId) {
        const invoice = await tx.customerInvoice.findUnique({ where: { saleOperationId: ancestorId } });
        if (invoice) { originalInvoice = invoice; break; }
        const ancestor = await tx.operation.findUnique({ where: { id: ancestorId }, select: { originalId: true } });
        ancestorId = ancestor?.originalId ?? null;
      }
      if (originalInvoice && !body.reason?.trim()) throw new BadRequestException('Motif obligatoire pour une facture de remplacement.');
      const company = await tx.companySettings.upsert({ where: { id: 'global' }, create: {}, update: {} });
      const issuedAt = new Date();
      const number=await nextNumber(tx,'CUSTOMER_INVOICE',date);
      const printSettings=await readSettings(tx,'facturation');
      const snapshot = {
        version: 3, printSettings, invoiceDate: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Indian/Antananarivo' }).format(date),
        company: { name: company.name, address: company.address, phone: company.phone, email:String(printSettings.email??''), nif: company.nif, stat: company.stat, rcs: company.rcs },
        shop: { id: sale.shopId, code: sale.shop.code, name: sale.shop.name, address: sale.shop.address },
        customer: { ...(sale.customerSnapshot as Prisma.JsonObject ?? {}), id: customer?.id ?? sale.customerId, name: body.customerName ?? customer?.name ?? (sale.customerSnapshot as Prisma.JsonObject)?.name ?? '', address: body.customerAddress ?? customer?.address ?? (sale.customerSnapshot as Prisma.JsonObject)?.address ?? '', nif: body.customerNif ?? customer?.nif ?? (sale.customerSnapshot as Prisma.JsonObject)?.nif ?? '', stat: body.customerStat ?? customer?.stat ?? (sale.customerSnapshot as Prisma.JsonObject)?.stat ?? '', phone: body.customerPhone ?? customer?.phone ?? (sale.customerSnapshot as Prisma.JsonObject)?.phone ?? '' },
        sale: { id: sale.id, number: sale.number, businessDate: sale.businessDate.toISOString() },
        currencyLabel: sale.currencyLabel, paymentTerms: body.paymentTerms ?? '',
        originalInvoiceNumber: originalInvoice?.number ?? null,
        discount: sale.discount.toFixed(2), ...invoiceTotals(sale.total, sale.taxRate),
        lines: sale.lines.map(line => ({ productId: line.productId, name: line.productName ?? '', reference: line.productReference ?? '', quantity: line.quantity.toString(), unitPrice: line.unitPrice?.toFixed(2) ?? '0.00', lineTotalTtc: line.lineTotal?.toFixed(2) ?? '0.00' })),
      };
      const invoice = await tx.customerInvoice.create({ data: { number, saleOperationId: sale.id, shopId: sale.shopId, issuedById: actor.id, issuedAt, originalInvoiceId: originalInvoice?.id, reason: body.reason, snapshot } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: originalInvoice ? 'invoice.replace' : 'invoice.issue', entityType: 'CustomerInvoice', entityId: invoice.id, shopId: invoice.shopId, reason: body.reason, newValue: { number: invoice.number, saleOperationId: sale.id, originalInvoiceId: originalInvoice?.id ?? null } } });
      return invoice;
    });
  }
  async get(id: string, actor: Actor) {
    const invoice = await this.db.customerInvoice.findUnique({ where: { id }, include: { replacement: { select: { id: true, number: true } } } });
    if (!invoice) throw new NotFoundException('Facture introuvable.');
    this.access.assert(actor, invoice.shopId);
    return invoice;
  }
}

export function printInvoice(invoice: { number: string; issuedAt: Date; snapshot: Prisma.JsonValue }, res: Response) {
  const s = invoice.snapshot as unknown as {
    invoiceDate?:string; printSettings?:Record<string,any>; company: { email?:string; name: string; address: string; phone: string; nif: string; stat: string; rcs: string };
    customer: { name: string; address: string; nif: string; stat?:string; phone?:string }; currencyLabel: string; paymentTerms: string;
    originalInvoiceNumber: string | null; lines: { name: string; quantity: string; unitPrice: string; lineTotalTtc: string }[];
    discount: string; totalTtc: string; totalHt: string; taxAmount: string; taxRate: string; hideTaxOnPrint: boolean;
  };
  const visible=(key:string)=>s.printSettings?.[key]!==false;
  const ticket=s.printSettings?.affichageSurLaFacture==='ticket-80mm';
  const doc = new PDFDocument({ size: ticket?[226.77,842]:'A4', margin: ticket?12:40 });
  res.type('application/pdf'); res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);
  doc.pipe(res);
  doc.fontSize(16).text(s.company.name).fontSize(10);
  if(visible('afficherAdresse')) doc.text(s.company.address);
  if(visible('afficherTelephoneEtEmail')) doc.text(s.company.phone).text(s.company.email??'');
  if (visible('afficherIdentifiantsFiscaux') && s.company.nif) doc.text(`NIF : ${s.company.nif}`);
  if (visible('afficherIdentifiantsFiscaux') && s.company.stat) doc.text(`STAT : ${s.company.stat}`);
  if (visible('afficherIdentifiantsFiscaux') && s.company.rcs) doc.text(`RCS : ${s.company.rcs}`);
  doc.moveDown().fontSize(14).text(`Facture ${invoice.number}`).fontSize(10).text(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Indian/Antananarivo' }).format(s.invoiceDate ? businessDate(s.invoiceDate) : invoice.issuedAt));
  if (s.originalInvoiceNumber) doc.text(`Remplace la facture ${s.originalInvoiceNumber} — original conservé`);
  if (visible('afficherInformationsClient') && s.customer.name) doc.moveDown().text(s.customer.name).text(s.customer.address);
  if (visible('afficherInformationsClient') && s.customer.nif) doc.text(`NIF client : ${s.customer.nif}`);
  if (visible('afficherInformationsClient') && s.customer.stat) doc.text(`STAT client : ${s.customer.stat}`);
  if (visible('afficherInformationsClient') && s.customer.phone) doc.text(`Téléphone client : ${s.customer.phone}`);
  doc.moveDown();
  for (const line of s.lines) doc.text(`${line.name} | ${line.quantity} × ${formatAmount(line.unitPrice, s.currencyLabel)} | ${formatAmount(line.lineTotalTtc, s.currencyLabel)}`);
  if (new Prisma.Decimal(s.discount).gt(0)) doc.moveDown().text(`Remise : ${formatAmount(s.discount, s.currencyLabel)}`);
  if (!s.hideTaxOnPrint) doc.moveDown().text(`Total HT : ${formatAmount(s.totalHt, s.currencyLabel)}`).text(`TVA ${s.taxRate} % : ${formatAmount(s.taxAmount, s.currencyLabel)}`);
  doc.moveDown().fontSize(12).text(`Total : ${formatAmount(s.totalTtc, s.currencyLabel)}`);
  if (visible('afficherConditionsDePaiement') && s.paymentTerms) doc.moveDown().fontSize(10).text(s.paymentTerms);
  doc.end();
}

@ApiTags('customer-invoices') @ApiBearerAuth() @Controller('customer-invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}
  @Post() @RequirePermission('invoices.create') @ApiOperation({ summary: 'Émettre une facture immuable depuis une vente validée ; une seule facture par révision' })
  issue(@Body() body: IssueInvoiceDto, @Request() req: { actor: Actor }) { return this.invoices.issue(body, req.actor); }
  @Get(':id/pdf') @RequirePermission('invoices.read') @ApiOperation({ summary: 'PDF depuis le snapshot ; rubrique TVA masquée à 5 %' })
  async pdf(@Param('id') id: string, @Request() req: { actor: Actor }, @Res() res: Response) { printInvoice(await this.invoices.get(id, req.actor), res); }
  @Get(':id') @RequirePermission('invoices.read') @ApiOperation({ summary: 'Consulter la facture originale et son éventuel remplacement' })
  get(@Param('id') id: string, @Request() req: { actor: Actor }) { return this.invoices.get(id, req.actor); }
}
