import { Controller, Get, Injectable, Param, Query, Request, BadRequestException, Res } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
const D = Prisma.Decimal;
const num = (n: Prisma.Decimal.Value) => new D(n).toDecimalPlaces(2).toNumber();
const money = (n: Prisma.Decimal.Value) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num(n))} Ar`;
const date = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Indian/Antananarivo' }).format(d);
const indicator = (libelle: string, valeur: string, evolution = 'Sur la période choisie') => ({ libelle, valeur, evolution, tendance: 'stable' as const });
export function reportRange(period: string) {
  const now = date(new Date()), start = new Date(`${now}T00:00:00Z`);
  if (period === '7-jours' || period === '30-jours') start.setUTCDate(start.getUTCDate() - (period === '7-jours' ? 6 : 29));
  else if (period === 'ce-mois') start.setUTCDate(1);
  else if (period === 'trimestre') { start.setUTCDate(1); start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3); }
  else if (period === 'annee') { start.setUTCDate(1); start.setUTCMonth(0); }
  else if (period === '12-mois') { start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 11); }
  else throw new BadRequestException('Période inconnue.');
  return { from: start.toISOString().slice(0, 10), to: now };
}
const rangeDays = (from: string, to: string) => {
  const days: string[] = []; const d = new Date(`${from}T00:00:00Z`);
  while (d.toISOString().slice(0, 10) <= to) { days.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return days;
};
@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService, private readonly access: ShopAccess) {}
  async snapshot(shopId: string, actor: Actor) {
    this.access.assert(actor, shopId);
    return this.db.$transaction(async tx => {
      const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId } });
      const products = await tx.product.findMany({ include: { category: true, balances: { where: { shopId } } } });
      const operations = await tx.operation.findMany({ where: { OR: [{ shopId }, { destinationShopId: shopId }] }, include: { lines: { include: { product: { include: { category: true } } } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      const movements = await tx.stockMovement.findMany({ where: { shopId }, include: { operation: { select: { destinationShopId: true, shopId: true } } }, orderBy: { businessDate: 'asc' } });
      const prices = await tx.priceChange.findMany({ where: { OR: [{ shopId }, { shopId: null }] } });
      return { shop, products, operations, movements, prices };
    }, { isolationLevel: 'RepeatableRead', timeout: 20000 });
  }
  async report(kind: string, shopId: string, period: string, productId: string, actor: Actor) {
    const data = await this.snapshot(shopId, actor), range = reportRange(period);
    const inRange = (d: Date) => date(d) >= range.from && date(d) <= range.to;
    const all = data.operations.filter(o => o.type === 'SALE' && !o.superseded && o.shopId === shopId && inRange(o.businessDate));
    const sales = all.filter(o => o.status === 'VALIDATED');
    const total = sales.reduce((n, s) => n.add(s.total), new D(0));
    const days = rangeDays(range.from, range.to);
    const daily = days.map(day => ({ date: day, montant: num(sales.filter(s => date(s.businessDate) === day).reduce((n, s) => n.add(s.total), new D(0))) }));
    const quantities = (id: string) => sales.reduce((n, s) => n.add(s.lines.filter(l => l.productId === id).reduce((q, l) => q.add(l.quantity), new D(0))), new D(0));
    const revenue = (id: string) => sales.reduce((n, s) => {
      const subtotal = s.total.add(s.discount);
      const lineTotal = s.lines.filter(l => l.productId === id).reduce((q, l) => q.add(l.lineTotal ?? 0), new D(0));
      return n.add(subtotal.gt(0) ? lineTotal.mul(s.total).div(subtotal) : 0);
    }, new D(0));
    const balance = (id: string) => data.products.find(p => p.id === id)?.balances[0]?.quantity ?? new D(0);
    const previousFrom = new Date(`${range.from}T00:00:00Z`); previousFrom.setUTCDate(previousFrom.getUTCDate() - days.length);
    const previous = data.operations.filter(s => s.type === 'SALE' && s.status === 'VALIDATED' && !s.superseded && date(s.businessDate) >= previousFrom.toISOString().slice(0, 10) && date(s.businessDate) < range.from);
    const growth = (id: string) => { const prior = previous.reduce((n, s) => n.add(s.lines.filter(l => l.productId === id).reduce((q, l) => q.add(l.quantity), new D(0))), new D(0)); return prior.gt(0) ? num(quantities(id).sub(prior).mul(100).div(prior)) : 0; };
    const soldProducts = data.products.filter(p => quantities(p.id).gt(0));
    if (kind === 'ventes') {
      const evolution = daily.map((p, i) => ({ ...p, moyenne7Jours: num(daily.slice(Math.max(0, i - 6), i + 1).reduce((n, d) => n.add(d.montant), new D(0)).div(Math.min(7, i + 1))) }));
      const best = [...daily].sort((a, b) => b.montant - a.montant)[0] ?? { date: range.to, montant: 0 };
      const sellers = [...new Set(sales.map(s => s.createdById))].map(id => { const list = sales.filter(s => s.createdById === id); return { vendeurId: id, vendeurNom: list[0].createdBy.name, ventes: list.length, montant: num(list.reduce((n, s) => n.add(s.total), new D(0))) }; });
      return { chiffreDAffaires: indicator('Total des ventes', money(total), 'Après remises ; dépenses suivies séparément'), nombreDeVentes: indicator('Nombre de ventes', String(sales.length)), panierMoyen: indicator('Panier moyen', money(sales.length ? total.div(sales.length) : 0)), ventesValidees: indicator('Ventes validées', `${all.length ? num(new D(sales.length).mul(100).div(all.length)) : 0} %`), evolution, meilleureJournee: { ...best, evolution: 'Sur la période choisie' }, parVendeur: sellers, parHeure: Array.from({ length: 24 }, (_, heure) => ({ heure, ventes: sales.filter(s => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Indian/Antananarivo', hour: '2-digit', hourCycle: 'h23' }).format(s.createdAt)) === heure).length })), analyse: days.map(day => { const list = sales.filter(s => date(s.businessDate) === day); const value = list.reduce((n, s) => n.add(s.total), new D(0)); return { id: `${shopId}:${day}`, date: day, magasinNom: data.shop.name, ventes: list.length, chiffreDAffaires: num(value), panierMoyen: num(list.length ? value.div(list.length) : 0), statut: 'Validée' }; }) };
    }
    if (kind === 'stock') {
      const movements = data.movements.filter(m => inRange(m.businessDate));
      const current = data.products.reduce((n, p) => n.add(balance(p.id)), new D(0));
      const initial = current.sub(movements.reduce((n, m) => n.add(m.quantityDelta), new D(0)));
      let cumulative = initial;
      const evolution = days.map(day => { const list = movements.filter(m => date(m.businessDate) === day); const incoming = list.filter(m => m.quantityDelta.gt(0)).reduce((n, m) => n.add(m.quantityDelta), new D(0)); const outgoing = list.filter(m => m.quantityDelta.lt(0)).reduce((n, m) => n.sub(m.quantityDelta), new D(0)); cumulative = cumulative.add(incoming).sub(outgoing); return { periode: day, entrees: num(incoming), sorties: num(outgoing), stockCumule: num(cumulative) }; });
      const value = data.products.reduce((n, p) => n.add(D.max(balance(p.id), 0).mul(p.supplierPrice ?? 0)), new D(0));
      const totalSold = sales.reduce((n, s) => n.add(s.lines.reduce((q, l) => q.add(l.quantity), new D(0))), new D(0));
      const average = initial.add(current).div(2);
      return { stockTotal: indicator('Stock total', String(num(current))), stockEntrant: indicator('Stock entrant', String(num(movements.filter(m => m.quantityDelta.gt(0)).reduce((n, m) => n.add(m.quantityDelta), new D(0))))), valeurDuStock: indicator('Valeur du stock', money(value), data.products.some(p => balance(p.id).gt(0) && p.supplierPrice === null) ? 'Valeur partielle : coûts inconnus' : 'Coût fournisseur actuel'), rotationMoyenne: indicator('Rotation moyenne', average.gt(0) ? String(num(totalSold.div(average))) : 'Non calculable'), mouvements: evolution, parMagasin: [{ id: shopId, libelle: data.shop.name, valeur: num(current), valeurAffichee: String(num(current)) }], rotationParCategorie: [...new Set(data.products.map(p => p.category.name))].map(categorie => { const ps = data.products.filter(p => p.category.name === categorie); const stock = ps.reduce((n, p) => n.add(balance(p.id)), new D(0)); return { categorie, rotation: stock.gt(0) ? num(ps.reduce((n, p) => n.add(quantities(p.id)), new D(0)).div(stock)) : 0 }; }), faibleRotation: data.products.filter(p => balance(p.id).gt(0)).map(p => ({ produitId: p.id, produitNom: p.name, categorie: p.category.name, stock: num(balance(p.id)), ventes: num(quantities(p.id)) })).sort((a, b) => a.ventes - b.ventes).slice(0, 5), transferts: movements.filter(m => m.type.startsWith('TRANSFER')).map(m => ({ id: m.id, trajet: m.type === 'TRANSFER_OUT' ? `Depuis ${data.shop.name}` : `Vers ${data.shop.name}`, produitNom: data.products.find(p => p.id === m.productId)?.name ?? '', quantite: num(m.quantityDelta.abs()) })), analyse: data.products.map(p => { const ms = movements.filter(m => m.productId === p.id), final = balance(p.id), delta = ms.reduce((n, m) => n.add(m.quantityDelta), new D(0)); return { id: p.id, produitNom: p.name, magasinNom: data.shop.name, stockInitial: num(final.sub(delta)), entrees: num(ms.filter(m => m.quantityDelta.gt(0)).reduce((n, m) => n.add(m.quantityDelta), new D(0))), sorties: num(ms.filter(m => m.quantityDelta.lt(0)).reduce((n, m) => n.sub(m.quantityDelta), new D(0))), stockFinal: num(final), valeur: num(D.max(final, 0).mul(p.supplierPrice ?? 0)), statut: final.lte(0) ? 'Rupture' : final.lte(p.lowStockThreshold) ? 'Stock bas' : 'Normal' }; }) };
    }
    if (kind === 'produits') {
      let margin = new D(0), net = new D(0), unknown = false;
      for (const sale of sales) {
        const subtotal = sale.total.add(sale.discount);
        for (const line of sale.lines) {
          if (line.supplierPrice === null || sale.taxRate === null) { unknown = true; continue; }
          const soldNet = subtotal.gt(0) ? new D(line.lineTotal ?? 0).mul(sale.total).div(subtotal).div(new D(1).add(sale.taxRate.div(100))) : new D(0);
          net = net.add(soldNet); margin = margin.add(soldNet.sub(line.quantity.mul(line.supplierPrice)));
        }
      }
      const rate = !unknown && net.gt(0) ? num(margin.mul(100).div(net)) : null;
      return { produitsVendus: indicator('Produits vendus', String(soldProducts.length)), nouveauxProduits: indicator('Nouveaux produits', String(data.products.filter(p => inRange(p.createdAt)).length)), produitsActifs: indicator('Produits actifs', String(data.products.filter(p => p.active).length)), margeMoyenne: indicator('Marge estimée', rate === null ? 'Non calculable' : `${rate} %`, unknown ? 'Coûts historiques manquants' : 'Montant HT et coûts historiques enregistrés'), parCategorie: [...new Set(soldProducts.map(p => p.category.name))].map(categorie => { const ps = soldProducts.filter(p => p.category.name === categorie); return { categorie, chiffreDAffaires: num(ps.reduce((n, p) => n.add(revenue(p.id)), new D(0))), marge: 0 }; }), enProgression: soldProducts.filter(p => growth(p.id) > 0).map(p => ({ produitId: p.id, produitNom: p.name, produitCategorie: p.category.name, evolution: growth(p.id) })), enBaisse: data.products.filter(p => growth(p.id) < 0).map(p => ({ produitId: p.id, produitNom: p.name, produitCategorie: p.category.name, evolution: growth(p.id) })), produitsSuivis: data.products.map(p => ({ produitId: p.id, produitNom: p.name })), evolutionProduit: days.map(day => { const list = sales.filter(s => date(s.businessDate) === day); return { date: day, ventes: num(list.reduce((n, s) => n.add(s.lines.filter(l => l.productId === productId).reduce((q, l) => q.add(l.quantity), new D(0))), new D(0))), chiffreDAffaires: num(list.reduce((n, s) => { const subtotal = s.total.add(s.discount); const lines = s.lines.filter(l => l.productId === productId).reduce((q, l) => q.add(l.lineTotal ?? 0), new D(0)); return n.add(subtotal.gt(0) ? lines.mul(s.total).div(subtotal) : 0); }, new D(0))) }; }), classement: soldProducts.map(p => ({ rang: 0, produitId: p.id, produitNom: p.name, categorie: p.category.name, stock: num(balance(p.id)), chiffreDAffaires: num(revenue(p.id)), ventes: num(quantities(p.id)), evolution: growth(p.id) })).sort((a, b) => b.ventes - a.ventes).map((p, i) => ({ ...p, rang: i + 1 })) };
    }
    if (kind === 'prix-ecarts') {
      const ecarts = sales.flatMap(s => s.lines.filter(l => l.expectedUnitPrice !== null && l.unitPrice !== null && !l.expectedUnitPrice.equals(l.unitPrice)).map(l => ({ id: l.id, date: date(s.businessDate), produitNom: l.productName ?? l.product.name, magasinNom: data.shop.name, prixAttendu: num(l.expectedUnitPrice!), prixPratique: num(l.unitPrice!), ecart: num(l.unitPrice!.sub(l.expectedUnitPrice!)), utilisateurNom: s.createdBy.name, quantity: l.quantity })));
      const impacted = ecarts.reduce((n, e) => n.add(new D(e.ecart).mul(e.quantity)), new D(0));
      return { ecartsDetectes: indicator('Écarts détectés', String(ecarts.length)), produitsConcernes: indicator('Produits concernés', String(new Set(ecarts.map(e => e.produitNom)).size)), montantImpacte: indicator('Montant impacté', money(impacted)), modificationsDePrix: indicator('Modifications de prix', String(data.prices.filter(p => inRange(p.createdAt)).length)), ecarts: ecarts.map(({ quantity, ...e }) => e), plusGrosEcarts: [...ecarts].sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart)).slice(0, 5).map(e => ({ id: e.id, libelle: e.produitNom, valeur: Math.abs(e.ecart), valeurAffichee: money(e.ecart) })), evolutionDesEcarts: days.map(day => ({ date: day, ecart: num(ecarts.filter(e => e.date === day).reduce((n, e) => n.add(new D(e.ecart).mul(e.quantity)), new D(0))) })), magasinsAvecPlusDEcarts: ecarts.length ? [{ id: shopId, libelle: data.shop.name, valeur: ecarts.length, valeurAffichee: String(ecarts.length) }] : [] };
    }
    throw new BadRequestException('Rapport inconnu.');
  }
  async dashboard(shopId: string, period: string, actor: Actor) {
    const data = await this.snapshot(shopId, actor), range = reportRange(period), today = date(new Date());
    const sales = data.operations.filter(o => o.type === 'SALE' && o.status === 'VALIDATED' && !o.superseded && o.shopId === shopId);
    const selected = sales.filter(s => date(s.businessDate) >= range.from && date(s.businessDate) <= range.to);
    const days = rangeDays(range.from, range.to);
    const months = [...new Set(days.map(d => d.slice(0, 7)))];
    const evolution = (period === '12-mois' ? months : days).map(d => ({ date: d, montant: num(selected.filter(s => date(s.businessDate).startsWith(d)).reduce((n, s) => n.add(s.total), new D(0))) }));
    const top = data.products.map(p => ({ produitId: p.id, produitPosition: 0, produitNom: p.name, produitCategorie: p.category.name, photoUrl: p.photoUrl ?? undefined, quantiteVendue: num(selected.reduce((n, s) => n.add(s.lines.filter(l => l.productId === p.id).reduce((q, l) => q.add(l.quantity), new D(0))), new D(0))) })).filter(p => p.quantiteVendue > 0).sort((a, b) => b.quantiteVendue - a.quantiteVendue).slice(0, 5).map((p, i) => ({ ...p, produitPosition: i + 1 }));
    const week = reportRange('7-jours');
    const types: Record<string, string> = { SALE: 'Vente', STOCK_IN: 'Entrée stock', STOCK_OUT: 'Sortie stock', CUSTOMER_RETURN: 'Retour', TRANSFER: 'Transfert', INVENTORY_ADJUSTMENT: 'Correction stock', CANCELLATION: 'Correction stock' };
    return { resume: { ventesDes7DerniersJours: sales.filter(s => date(s.businessDate) >= week.from && date(s.businessDate) <= today).length, ventesEvolution: 'Ventes validées', chiffreDAffairesMensuel: num(sales.filter(s => date(s.businessDate).slice(0, 7) === today.slice(0, 7)).reduce((n, s) => n.add(s.total), new D(0))), chiffreDAffairesEvolution: 'Total des ventes après remises', produitsEnStockFaible: data.products.filter(p => (p.balances[0]?.quantity ?? new D(0)).gt(0) && (p.balances[0]?.quantity ?? new D(0)).lte(p.lowStockThreshold)).length, rupturesDeStock: data.products.filter(p => p.active && (p.balances[0]?.quantity ?? new D(0)).lte(0)).length }, evolution, top, activites: data.operations.filter(o => !o.superseded).slice(0, 5).map(o => ({ id: o.id, date: o.createdAt.toISOString(), type: types[o.type], numero: o.number ?? o.id.slice(0, 8), description: o.lines.map(l => l.productName ?? l.product.name).join(', ') || o.reason || 'Opération', utilisateurNom: o.createdBy.name, montant: o.type === 'SALE' ? num(o.total) : null, quantite: num(o.lines.reduce((n, l) => n.add(l.quantity), new D(0))), statut: o.status === 'VALIDATED' ? 'Validée' : o.status === 'CANCELLED' ? 'Annulée' : 'En attente' })) };
  }
}
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('dashboard') @RequirePermission('reports.read') dashboard(@Query('shopId') id: string, @Query('period') period: string, @Request() req: { actor: Actor }) { return this.reports.dashboard(id, period ?? '7-jours', req.actor); }
  @Get('export/:kind') @RequirePermission('reports.export')
  async export(@Param('kind') kind: string, @Query('shopId') id: string, @Query('period') period: string, @Query('productId') productId: string, @Query('format') format: string, @Request() req: { actor: Actor }, @Res() res: Response) {
    if (!['csv', 'excel', 'pdf'].includes(format)) throw new BadRequestException('Format inconnu.');
    const kinds = kind === 'vue-generale' ? ['ventes', 'stock', 'produits', 'prix-ecarts'] : [kind];
    const documents = await Promise.all(kinds.map(k => this.reports.report(k, id, period, productId, req.actor)));
    const rows: Record<string, unknown>[] = [];
    documents.forEach((doc, i) => {
      const value = doc as unknown as Record<string, unknown>;
      const list = (value.analyse ?? value.classement ?? value.ecarts ?? []) as Record<string, unknown>[];
      for (const item of list) rows.push({ rapport: kinds[i], ...item });
    });
    const columns = [...new Set(rows.flatMap(r => Object.keys(r)))];
    if (!columns.length) columns.push('rapport');
    const extension = format === 'excel' ? 'xlsx' : format;
    res.setHeader('Content-Disposition', `attachment; filename="stockflow-${kind}-${period}.${extension}"`);
    if (format === 'csv') {
      const escape = (value: unknown) => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
      res.type('text/csv; charset=utf-8').send('\uFEFF' + [columns.map(escape).join(';'), ...rows.map(r => columns.map(c => escape(r[c])).join(';'))].join('\r\n'));
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Rapport');
      sheet.columns = columns.map(key => ({ header: key, key, width: 24 }));
      rows.forEach(r => sheet.addRow(r));
      sheet.getRow(1).font = { bold: true };
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
    } else {
      res.type('application/pdf');
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      doc.pipe(res); doc.fontSize(16).text(`StockFlow - ${kind}`); doc.fontSize(10).text(`Periode : ${period} | Montants en Ar`).moveDown();
      rows.forEach(row => { doc.fontSize(9).text(columns.map(c => `${c}: ${String(row[c] ?? '')}`).join(' | ')).moveDown(0.5); });
      if (!rows.length) doc.text('Aucune donnée sur cette période.');
      doc.end();
    }
  }
  @Get(':kind') @RequirePermission('reports.read') get(@Param('kind') kind: string, @Query('shopId') id: string, @Query('period') period: string, @Query('productId') productId: string, @Request() req: { actor: Actor }) { return this.reports.report(kind, id, period ?? '30-jours', productId, req.actor); }
}
