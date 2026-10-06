import { BadRequestException, ForbiddenException, Controller, Get, Query, Request, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags, SchemaObject } from '@nestjs/swagger';
import { ApiList, ApiRecord, ApiDomainErrors } from './finance-contract';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { pagination } from './dto';
import { period } from './finance';
import { formatAmount } from './money';

export class HistoryQueryDto {
 @IsOptional() @IsString() @MaxLength(200) recherche?:string;
 @IsOptional() @IsString() categorie?:string;
 @IsOptional() @IsString() type?:string;
 @IsOptional() @IsUUID() magasinId?:string;
 @IsOptional() @IsUUID() utilisateurId?:string;
 @IsOptional() @IsIn(['aujourd-hui','7-jours','30-jours','ce-mois','tout']) periode?:string;
 @IsOptional() @IsIn(['Validé','Brouillon','En attente','Annulé']) statut?:string;
 @IsOptional() @IsString() page?:string;
 @IsOptional() @IsString() pageSize?:string;
 @IsOptional() @IsIn(['csv','excel','pdf']) format?:string;
}
for(const key of ['recherche','categorie','type','magasinId','utilisateurId','periode','statut','page','pageSize','format']) ApiPropertyOptional({type:String})(HistoryQueryDto.prototype,key);
const categories=['vente','entree','sortie','transfert','inventaire','prix','annulation','depense','versement','facture-fournisseur'];
type Row={id:string;date:Date;categorie:string;type:string;numero:string;source:string;reference:string;referenceDetail:string;quantite:Prisma.Decimal|null;montant:Prisma.Decimal|null;ancienMontant:Prisma.Decimal|null;detailValeur:string;statut:string;utilisateurNom:string;magasinNom:string;motif:string|null};
// One transfer is one row. Scoped access includes its destination; prices with no
// shop are global and only visible to shops.all. All filtering occurs before LIMIT.
const source=Prisma.sql`WITH history AS (
 SELECT o.id::text AS id,o."businessDate" AS date,
 CASE o.type::text WHEN 'SALE' THEN 'vente' WHEN 'STOCK_IN' THEN 'entree' WHEN 'CUSTOMER_RETURN' THEN 'entree' WHEN 'STOCK_OUT' THEN 'sortie' WHEN 'TRANSFER' THEN 'transfert' WHEN 'CANCELLATION' THEN 'annulation' ELSE 'inventaire' END AS categorie,
 CASE o.type::text WHEN 'SALE' THEN 'Vente' WHEN 'STOCK_IN' THEN 'Entrée de stock' WHEN 'CUSTOMER_RETURN' THEN 'Retour client' WHEN 'STOCK_OUT' THEN 'Sortie de stock' WHEN 'TRANSFER' THEN 'Transfert' WHEN 'CANCELLATION' THEN 'Annulation' ELSE 'Inventaire' END AS type,
 COALESCE(o.number,o.id::text) AS numero,'Opération'::text AS source,
 COALESCE(l.ref,'') AS reference,COALESCE(l.names,'') AS "referenceDetail",
 CASE WHEN o.type::text='INVENTORY_ADJUSTMENT' THEN l.delta WHEN o.type::text='CANCELLATION' THEN (SELECT SUM(m."quantityDelta") FROM "StockMovement" m WHERE m."operationId"=o.id AND m."shopId"=o."shopId") WHEN o.type::text IN ('SALE','STOCK_OUT','TRANSFER') THEN -l.qty ELSE l.qty END AS quantite,
 CASE WHEN o.type::text='SALE' THEN o.total ELSE NULL END AS montant,NULL::numeric AS "ancienMontant",
 CASE WHEN o.type::text='TRANSFER' THEN s.name || ' → ' || d.name WHEN o.type::text='INVENTORY_ADJUSTMENT' THEN COALESCE(l.details,'') ELSE '' END AS "detailValeur",
 CASE o.status::text WHEN 'VALIDATED' THEN 'Validé' WHEN 'CANCELLED' THEN 'Annulé' ELSE 'Brouillon' END AS statut,
 u.name AS "utilisateurNom",s.name AS "magasinNom",o.reason AS motif,o."shopId",o."destinationShopId",u.id AS "actorId"
 FROM "Operation" o JOIN "Shop" s ON s.id=o."shopId" LEFT JOIN "Shop" d ON d.id=o."destinationShopId" JOIN "User" u ON u.id=COALESCE(o."validatedById",o."createdById")
 LEFT JOIN LATERAL (SELECT string_agg(COALESCE(ol."productReference",p.reference),', ') AS ref,string_agg(COALESCE(ol."productName",p.name),', ') AS names,SUM(ol.quantity) AS qty,SUM(ol."adjustmentDelta") AS delta,string_agg(ol."systemBefore"::text || ' → ' || ol."countedQuantity"::text,', ') AS details FROM "OperationLine" ol JOIN "Product" p ON p.id=ol."productId" WHERE ol."operationId"=o.id) l ON true
 UNION ALL
 SELECT p.id::text,p."createdAt",'prix','Modification de prix',p.id::text,p.origin,pr.reference,pr.name,NULL::numeric,p."newPrice",p."oldPrice",p.kind,'Validé',u.name,COALESCE(s.name,'Tous les magasins'),NULL::text,p."shopId",NULL::uuid,u.id FROM "PriceChange" p JOIN "Product" pr ON pr.id=p."productId" JOIN "User" u ON u.id=p."userId" LEFT JOIN "Shop" s ON s.id=p."shopId"
 UNION ALL
 SELECT f.id::text,f."businessDate",CASE f.kind::text WHEN 'EXPENSE' THEN 'depense' WHEN 'REMITTANCE' THEN 'versement' ELSE 'facture-fournisseur' END,CASE f.kind::text WHEN 'EXPENSE' THEN 'Dépense' WHEN 'REMITTANCE' THEN 'Versement' ELSE 'Facture fournisseur' END,f.number,'Finance',COALESCE(f."supplierReference",f.number),COALESCE(f.note,f."supplierName",f.reason,''),NULL::numeric,f.amount,NULL::numeric,CASE WHEN f.kind::text='REMITTANCE' AND f."expectedAmount" IS NOT NULL THEN 'Attendu : ' || f."expectedAmount"::text || ' ; écart : ' || f.difference::text ELSE '' END,CASE f.status::text WHEN 'VALIDATED' THEN 'Validé' WHEN 'CANCELLED' THEN 'Annulé' ELSE 'Brouillon' END,u.name,s.name,f.reason,f."shopId",NULL::uuid,u.id FROM "FinanceOperation" f JOIN "Shop" s ON s.id=f."shopId" JOIN "User" u ON u.id=COALESCE(f."validatedById",f."createdById")
)`;
function row(r:Row){return {...r,date:r.date.toISOString(),quantite:r.quantite===null?null:Number(r.quantite),montant:r.montant===null?null:Number(r.montant),ancienMontant:r.categorie==='prix'&&r.ancienMontant!==null?Number(r.ancienMontant):undefined};}
const historySchema:SchemaObject={type:'object',properties:{...Object.fromEntries(['id','date','categorie','type','numero','source','reference','referenceDetail','detailValeur','statut','utilisateurNom','magasinNom'].map(key=>[key,{type:'string'}])),quantite:{type:'number',nullable:true},montant:{type:'number',nullable:true},ancienMontant:{type:'number'},motif:{type:'string',nullable:true}}};
@ApiTags('history') @ApiBearerAuth() @ApiDomainErrors() @Controller('history')
export class HistoryController {
 constructor(private readonly db:PrismaService,private readonly access:ShopAccess){}
 where(q:HistoryQueryDto,actor:Actor,ignoreCategory=false){
  const conditions:Prisma.Sql[]=[];
  const scope=(id:string)=>Prisma.sql`("shopId"=${id}::uuid OR "destinationShopId"=${id}::uuid)`;
  if(q.magasinId){this.access.assert(actor,q.magasinId);conditions.push(scope(q.magasinId));}
  else if(!actor.permissions.includes('shops.all')) conditions.push(actor.shopIds.length?Prisma.sql`(${Prisma.join(actor.shopIds.map(scope),' OR ')})`:Prisma.sql`false`);
  if(q.utilisateurId) conditions.push(Prisma.sql`"actorId"=${q.utilisateurId}::uuid`);
  if(q.categorie&&!ignoreCategory) conditions.push(Prisma.sql`categorie=${q.categorie}`);
  if(q.type) conditions.push(Prisma.sql`type=${q.type}`);
  if(q.statut) conditions.push(Prisma.sql`statut=${q.statut}`);
  if(q.recherche?.trim()) {const term='%'+q.recherche.trim()+'%';conditions.push(Prisma.sql`(reference ILIKE ${term} OR "referenceDetail" ILIKE ${term} OR numero ILIKE ${term})`);}
  if(q.periode&&q.periode!=='tout') {
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo'}).format(new Date());const start=new Date(today+'T00:00:00Z');
   if(q.periode==='ce-mois') start.setUTCDate(1);else if(q.periode!=='aujourd-hui') start.setUTCDate(start.getUTCDate()-(q.periode==='7-jours'?6:29));
   const r=period(start.toISOString().slice(0,10),today);conditions.push(Prisma.sql`date>=${r.start} AND date<${r.until}`);
  }
  return conditions.length?Prisma.sql`WHERE ${Prisma.join(conditions,' AND ')}`:Prisma.empty;
 }
 @Get() @ApiList(historySchema) @RequirePermission('audit.read') @ApiOperation({summary:'Historique métier unifié, filtres avant pagination et total exact'})
 async list(@Query() q:HistoryQueryDto,@Request() r:{actor:Actor}) {
  let p:ReturnType<typeof pagination>;try{p=pagination(q);}catch{throw new BadRequestException('Pagination invalide.');}const where=this.where(q,r.actor);
  return this.db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<Row[]>(Prisma.sql`${source} SELECT * FROM history ${where} ORDER BY date DESC,id DESC LIMIT ${p.pageSize} OFFSET ${p.skip}`);
   const count=await tx.$queryRaw<{total:bigint}[]>(Prisma.sql`${source} SELECT COUNT(*) AS total FROM history ${where}`);
   return {items:rows.map(row),total:Number(count[0].total),page:p.page,pageSize:p.pageSize};
  },{isolationLevel:'RepeatableRead'});
 }
 @Get('counts') @ApiRecord({type:'object',additionalProperties:{type:'integer'}}) @RequirePermission('audit.read') @ApiOperation({summary:'Compteurs avec les mêmes filtres, hors catégorie'})
 async counts(@Query() q:HistoryQueryDto,@Request() r:{actor:Actor}) {
  const rows=await this.db.$queryRaw<{categorie:string;total:bigint}[]>(Prisma.sql`${source} SELECT categorie,COUNT(*) AS total FROM history ${this.where(q,r.actor,true)} GROUP BY categorie`);
  return {...Object.fromEntries(categories.map(c=>[c,Number(rows.find(r=>r.categorie===c)?.total??0)])),tout:rows.reduce((n,r)=>n+Number(r.total),0)};
 }
 @Get('actors') @RequirePermission('audit.read') @ApiOperation({summary:'Auteurs présents dans le périmètre consultable'})
 actors(@Request() r:{actor:Actor}) {return this.db.$queryRaw(Prisma.sql`${source} SELECT DISTINCT "actorId"::text AS id,"utilisateurNom" AS nom FROM history ${this.where({},r.actor)} ORDER BY nom`);}
 @Get('export') @RequirePermission('audit.read') @ApiOperation({summary:'Export intégral des filtres ; reports.export également requis'})
 async export(@Query() q:HistoryQueryDto,@Request() r:{actor:Actor},@Res() res:Response) {
  this.accessExport(r.actor);
  const rows=await this.db.$queryRaw<Row[]>(Prisma.sql`${source} SELECT * FROM history ${this.where(q,r.actor)} ORDER BY date DESC,id DESC`);
  const headers=['Date','Type','Numéro','Référence','Détail','Quantité','Montant','Utilisateur','Magasin','Statut','Motif'];
  const cells=rows.map(r=>[r.date.toISOString(),r.type,r.numero,r.reference,r.referenceDetail,r.quantite?.toString()??'',r.montant?.toString()??'',r.utilisateurNom,r.magasinNom,r.statut,r.motif??'']);
  if(q.format==='pdf') {res.type('application/pdf');const doc=new PDFDocument({size:'A4',margin:35});doc.pipe(res);doc.fontSize(15).text('Historique des opérations').fontSize(9);for(const r of rows) doc.moveDown().text(`${r.date.toISOString()} | ${r.type} ${r.numero}\n${r.magasinNom} | ${r.utilisateurNom} | ${r.statut}\n${r.referenceDetail}${r.montant!==null?' | '+formatAmount(r.montant):''}${r.motif?' | '+r.motif:''}`);doc.end();return;}
  if(q.format==='excel') {res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Historique');sheet.addRow(headers);for(const c of cells) sheet.addRow(c);await workbook.xlsx.write(res);res.end();return;}
  const quote=(v:string)=>'"'+(/^[=+@-]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';res.type('text/csv; charset=utf-8').send('\ufeff'+[headers,...cells].map(c=>c.map(quote).join(';')).join('\r\n'));
 }
 accessExport(actor:Actor){if(!actor.permissions.includes('reports.export')) throw new ForbiddenException('Permission reports.export requise.');}
}
