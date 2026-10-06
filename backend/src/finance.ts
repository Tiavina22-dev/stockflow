import { SupplierConsultationQuery, SupplierScopeQuery, supplierList, suppliers } from './supplier-consultation';
import { BadRequestException, Body, ConflictException, Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FinanceKind, OperationStatus, PaymentMethod, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { businessDate, decimal, OperationsService, ReasonDto } from './operations';
import { pageValues } from './customers';
import { ApiDomainErrors, ApiList, ApiRecord, financeSchema, summarySchema, reconciliationSchema } from './finance-contract';

export class FinanceBaseDto {
 @ApiProperty() @IsUUID() shopId:string;
 @ApiProperty({example:'2026-10-01'}) @IsString() businessDate:string;
 @ApiProperty() @IsUUID() requestKey:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) note?:string;
}
export class ExpenseDto extends FinanceBaseDto {
 @ApiProperty({example:'30000.00'}) @IsNumberString() amount:string;
 @ApiProperty() @IsString() @MinLength(1) @MaxLength(1000) reason:string;
 @ApiPropertyOptional({enum:PaymentMethod,default:'CASH'}) @IsOptional() @IsEnum(PaymentMethod) paymentMethod?:PaymentMethod;
}
export class RemittanceDto extends FinanceBaseDto {
 @ApiProperty() @IsNumberString() amount:string;
 @ApiProperty({description:'Premier jour inclus'}) @IsString() periodFrom:string;
 @ApiProperty({description:'Dernier jour inclus'}) @IsString() periodTo:string;
}
export class SupplierLineDto {
 @ApiProperty() @IsUUID() productId:string;
 @ApiProperty() @IsNumberString() quantity:string;
 @ApiProperty() @IsNumberString() unitPrice:string;
}
export class SupplierInvoiceDto extends FinanceBaseDto {
 @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) supplierName:string;
 @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) supplierReference:string;
 @ApiPropertyOptional({description:'Réception STOCK_IN existante, éventuellement encore en brouillon'}) @IsOptional() @IsUUID() receiptId?:string;
 @ApiPropertyOptional({description:'Facture fournisseur annulée à remplacer, original conservé'}) @IsOptional() @IsUUID() originalFinanceId?:string;
 @ApiProperty({type:[SupplierLineDto]}) @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>SupplierLineDto) lines:SupplierLineDto[];
}
export class LinkReceiptDto { @ApiProperty() @IsUUID() receiptId:string; }
export class FinanceQueryDto {
 @ApiProperty() @IsUUID() shopId:string;
 @ApiPropertyOptional() @IsOptional() @IsString() from?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() to?:string;
 @ApiPropertyOptional({enum:OperationStatus}) @IsOptional() @IsEnum(OperationStatus) status?:OperationStatus;
 @ApiPropertyOptional() @IsOptional() @IsString() page?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() pageSize?:string;
}
export class SummaryQueryDto {
 @ApiProperty() @IsUUID() shopId:string;
 @ApiProperty() @IsString() from:string;
 @ApiProperty() @IsString() to:string;
}
const prefix:Record<FinanceKind,string>={EXPENSE:'expenses',REMITTANCE:'remittances',SUPPLIER_INVOICE:'supplier-invoices'};
const include={lines:true,attachments:{select:{id:true,originalName:true,mimeType:true,size:true,createdAt:true}}} as const;
export function period(from:string,to:string){
 const start=businessDate(from),end=businessDate(to);
 if(start>end||end.getTime()-start.getTime()>366*86400000) throw new BadRequestException('Période invalide ou supérieure à 367 jours.');
 return {start,end,until:new Date(end.getTime()+86400000)};
}
@Injectable()
export class FinanceService {
 constructor(private readonly db:PrismaService,private readonly access:ShopAccess,private readonly ops:OperationsService){}
 check(actor:Actor,kind:FinanceKind,action:string){this.ops.permission(actor,`${prefix[kind]}.${action}`);}
 async read(tx:Prisma.TransactionClient,id:string,kind:FinanceKind,actor:Actor){
  const row=await tx.financeOperation.findUnique({where:{id},include});
  if(!row||row.kind!==kind) throw new NotFoundException('Opération financière introuvable.');
  this.access.assert(actor,row.shopId); return row;
 }
 get(id:string,kind:FinanceKind,actor:Actor){this.check(actor,kind,'read');return this.read(this.db,id,kind,actor);}
 list(q:FinanceQueryDto,kind:FinanceKind,actor:Actor){
  this.check(actor,kind,'read');this.access.assert(actor,q.shopId);
  const p=pageValues(q.page,q.pageSize),range=q.from&&q.to?period(q.from,q.to):null;
  if(Boolean(q.from)!==Boolean(q.to)) throw new BadRequestException('from et to sont requis ensemble.');
  const where={kind,shopId:q.shopId,status:q.status,businessDate:range?{gte:range.start,lt:range.until}:undefined};
  return this.db.$transaction(async tx=>({items:await tx.financeOperation.findMany({where,include,skip:p.skip,take:p.pageSize,orderBy:[{businessDate:'desc'},{id:'desc'}]}),total:await tx.financeOperation.count({where}),page:p.page,pageSize:p.pageSize}),{isolationLevel:'RepeatableRead'});
 }
 async create(kind:FinanceKind,body:ExpenseDto|RemittanceDto|SupplierInvoiceDto,actor:Actor,existingTx?:Prisma.TransactionClient){
  this.check(actor,kind,'create');this.access.assert(actor,body.shopId);
  const date=businessDate(body.businessDate),hash=createHash('sha256').update(JSON.stringify({kind,...body,requestKey:undefined})).digest('hex');
  const work=async (tx:Prisma.TransactionClient)=>{
   const existing=await tx.financeOperation.findUnique({where:{requestKey:body.requestKey},include});
   if(existing){if(existing.createdById!==actor.id||existing.requestHash!==hash) throw new ConflictException('Clé déjà utilisée avec un autre contenu.');return existing;}
   if(!(await tx.shop.findUnique({where:{id:body.shopId}}))?.active) throw new BadRequestException('Magasin inactif ou absent.');
   const company=await tx.companySettings.upsert({where:{id:'global'},create:{},update:{}});
   const seq=await tx.businessSequence.upsert({where:{kind_year:{kind,year:Number(body.businessDate.slice(0,4))}},create:{kind,year:Number(body.businessDate.slice(0,4)),value:1},update:{value:{increment:1}}});
   let extra:Prisma.FinanceOperationUncheckedCreateInput={kind,shopId:body.shopId,businessDate:date,amount:0,currencyLabel:company.currencyLabel,createdById:actor.id,requestKey:body.requestKey,requestHash:hash,number:`${kind}-${seq.year}-${String(seq.value).padStart(6,'0')}`,note:body.note};
   if(kind==='EXPENSE'){
    const b=body as ExpenseDto;if(!b.reason.trim()) throw new BadRequestException('Motif obligatoire.');
    extra={...extra,amount:decimal(b.amount,2,true),reason:b.reason,paymentMethod:b.paymentMethod??'CASH'};
   }else if(kind==='REMITTANCE'){
    const b=body as RemittanceDto,r=period(b.periodFrom,b.periodTo);
    if(date<r.end) throw new BadRequestException('Le versement ne peut pas précéder sa période.');
    extra={...extra,amount:decimal(b.amount,2),paymentMethod:'CASH',periodFrom:r.start,periodTo:r.end};
   }else{
    const b=body as SupplierInvoiceDto;
    if(!b.supplierName.trim()||!b.supplierReference.trim()||!b.lines.length||new Set(b.lines.map(l=>l.productId)).size!==b.lines.length) throw new BadRequestException('Fournisseur, référence et lignes distinctes requis.');
    const lines=[];let total=new Prisma.Decimal(0);
    for(const line of b.lines){
     const product=await tx.product.findUnique({where:{id:line.productId}});if(!product?.active) throw new BadRequestException('Produit absent ou inactif.');
     const quantity=decimal(line.quantity,3,true),unitPrice=decimal(line.unitPrice,2),value=quantity.mul(unitPrice).toDecimalPlaces(2);
     total=total.add(value);lines.push({productId:product.id,productName:product.name,productReference:product.reference,quantity,unitPrice,total:value});
    }
    if(total.gte('1000000000000000')) throw new BadRequestException('Total hors limites.');
    let receiptId=b.receiptId;
    if(b.originalFinanceId){
     const original=await this.read(tx,b.originalFinanceId,kind,actor);
     if(original.status!=='CANCELLED'||original.shopId!==body.shopId)throw new BadRequestException('Le remplacement exige une facture annulée du même magasin.');
     if(receiptId&&receiptId!==original.receiptId)throw new BadRequestException('Conserver la réception de la facture originale.');
     receiptId=original.receiptId??undefined;
    }
    if(receiptId) await this.receipt(tx,receiptId,body.shopId,actor);
    extra={...extra,amount:total,supplierName:b.supplierName.trim(),supplierReference:b.supplierReference.trim(),receiptId,originalFinanceId:b.originalFinanceId,lines:{create:lines}};
   }
   const row=await tx.financeOperation.create({data:extra,include});
   await this.audit(tx,actor,row.id,row.shopId,`${prefix[kind]}.create`,null,row);
   return row;
  };
  return existingTx?work(existingTx):this.ops.transaction(work);
 }
 async receipt(tx:Prisma.TransactionClient,id:string,shopId:string,actor:Actor){
  const r=await tx.operation.findUnique({where:{id},include:{lines:true}});
  if(!r||r.type!=='STOCK_IN'||r.shopId!==shopId||r.status==='CANCELLED'||r.superseded) throw new BadRequestException('Réception STOCK_IN du même magasin requise.');
  this.access.assert(actor,r.shopId);return r;
 }
 async link(id:string,receiptId:string,actor:Actor){
  this.check(actor,'SUPPLIER_INVOICE','create');
  return this.ops.transaction(async tx=>{
   const row=await this.read(tx,id,'SUPPLIER_INVOICE',actor);
   if(row.status!=='DRAFT'||row.receiptId) throw new ConflictException('Seul un brouillon sans réception peut être rattaché.');
   await this.receipt(tx,receiptId,row.shopId,actor);
   const updated=await tx.financeOperation.update({where:{id},data:{receiptId},include});
   await this.audit(tx,actor,id,row.shopId,'supplier-invoices.link',row,updated);return updated;
  });
 }
 async totals(tx:Prisma.TransactionClient,shopId:string,from:string,to:string){
  const r=period(from,to);
  const sales=await tx.operation.findMany({where:{shopId,type:'SALE',status:'VALIDATED',superseded:false,businessDate:{gte:r.start,lt:r.until}},select:{id:true,total:true,paymentMethod:true,currencyLabel:true}});
  const expenses=await tx.financeOperation.findMany({where:{shopId,kind:'EXPENSE',status:'VALIDATED',businessDate:{gte:r.start,lt:r.until}},select:{id:true,amount:true,paymentMethod:true,currencyLabel:true}});
  const currencies=new Set([...sales,...expenses].map(s=>s.currencyLabel));
  if(currencies.size>1) throw new BadRequestException('Plusieurs devises sur la période : consolidation refusée.');
  const unknown=sales.filter(s=>!s.paymentMethod);
  const sum=(values:Prisma.Decimal[])=>values.reduce((n,v)=>n.add(v),new Prisma.Decimal(0));
  const salesTotal=sum(sales.map(s=>s.total)),expenseTotal=sum(expenses.map(s=>s.amount));
  const cashSales=sum(sales.filter(s=>s.paymentMethod==='CASH').map(s=>s.total)),cashExpenses=sum(expenses.filter(s=>s.paymentMethod==='CASH').map(s=>s.amount));
  return {salesTotal:salesTotal.toFixed(2),expenseTotal:expenseTotal.toFixed(2),amountAfterExpenses:salesTotal.sub(expenseTotal).toFixed(2),cashSales:cashSales.toFixed(2),cashExpenses:cashExpenses.toFixed(2),expectedCash:cashSales.sub(cashExpenses).toFixed(2),unknownPaymentSales:unknown.map(s=>s.id),currencyLabel:[...currencies][0]??null,saleIds:sales.map(s=>s.id),expenseIds:expenses.map(s=>s.id)};
 }
 async summary(q:SummaryQueryDto,actor:Actor){
  this.ops.permission(actor,'reports.read');this.access.assert(actor,q.shopId);
  return this.db.$transaction(tx=>this.totals(tx,q.shopId,q.from,q.to),{isolationLevel:'RepeatableRead'});
 }
 async validate(id:string,kind:FinanceKind,actor:Actor,existingTx?:Prisma.TransactionClient,journalContext?:string){
  this.check(actor,kind,'validate');
  const work=async (tx:Prisma.TransactionClient)=>{
   const row=await this.read(tx,id,kind,actor);
   if(row.journalId && row.journalId!==journalContext) throw new BadRequestException('Validez le journal complet depuis le cahier.');
   if(row.status!=='DRAFT') throw new ConflictException('Opération déjà validée ou annulée.');
   if(!(await tx.shop.findUnique({where:{id:row.shopId}}))?.active) throw new BadRequestException('Magasin inactif.');
   let snapshot:Prisma.InputJsonValue={amount:row.amount.toFixed(2),currencyLabel:row.currencyLabel},expectedAmount:Prisma.Decimal|undefined,difference:Prisma.Decimal|undefined;
   if(kind==='REMITTANCE'){
    const from=row.periodFrom!,to=row.periodTo!;
    if(to>new Date())throw new BadRequestException('Une période future ne peut pas être clôturée.');
    const overlap=await tx.financeOperation.findFirst({where:{shopId:row.shopId,kind,status:'VALIDATED',periodFrom:{lte:to},periodTo:{gte:from}}});
    if(overlap) throw new ConflictException('Une clôture validée couvre déjà cette période.');
    const day=(d:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo'}).format(d);
    const totals=await this.totals(tx,row.shopId,day(from),day(to));
    if(totals.unknownPaymentSales.length) throw new BadRequestException('Des ventes historiques ont un paiement inconnu ; clôture refusée.');
    if(totals.currencyLabel&&totals.currencyLabel!==row.currencyLabel) throw new BadRequestException('Devise différente de celle du versement.');
    expectedAmount=new Prisma.Decimal(totals.expectedCash);difference=row.amount.sub(expectedAmount);
    snapshot={...totals,currencyLabel:row.currencyLabel,amountRemitted:row.amount.toFixed(2),difference:difference.toFixed(2),periodFrom:day(from),periodTo:day(to)};
   }
   if(kind==='SUPPLIER_INVOICE'){
    if(!row.receiptId) throw new BadRequestException('Rattacher une réception avant validation.');
    const receipt=await this.receipt(tx,row.receiptId,row.shopId,actor);
    if(receipt.status!=='VALIDATED') throw new BadRequestException('La réception doit être validée séparément.');
    if(receipt.currencyLabel!==row.currencyLabel) throw new BadRequestException('Devise réception/facture différente.');
    if(receipt.lines.length!==row.lines.length||row.lines.some(l=>!receipt.lines.some(r=>r.productId===l.productId&&r.quantity.equals(l.quantity)))) throw new BadRequestException('Les produits et quantités doivent correspondre à la réception.');
    snapshot={supplierName:row.supplierName,supplierReference:row.supplierReference,receiptId:receipt.id,receiptNumber:receipt.number,currencyLabel:row.currencyLabel,amount:row.amount.toFixed(2),lines:row.lines.map(l=>({productId:l.productId,name:l.productName,reference:l.productReference,quantity:l.quantity.toString(),unitPrice:l.unitPrice.toFixed(2),total:l.total.toFixed(2)}))};
   }
   const updated=await tx.financeOperation.update({where:{id},data:{status:'VALIDATED',validatedById:actor.id,validatedAt:new Date(),expectedAmount,difference,snapshot},include});
   await this.audit(tx,actor,id,row.shopId,`${prefix[kind]}.validate`,row,updated);return updated;
  };
  return existingTx?work(existingTx):this.ops.transaction(work);
 }
 async cancel(id:string,kind:FinanceKind,reason:string,actor:Actor){
  this.check(actor,kind,'cancel');if(!reason.trim()) throw new BadRequestException('Motif obligatoire.');
  return this.ops.transaction(async tx=>{
   const row=await this.read(tx,id,kind,actor);if(row.status==='CANCELLED') throw new ConflictException('Déjà annulée.');
   if(row.journalId && row.status==='DRAFT') throw new BadRequestException('Ce brouillon appartient a un journal complet.');
   const updated=await tx.financeOperation.update({where:{id},data:{status:'CANCELLED',cancelledAt:new Date()},include});
   await this.audit(tx,actor,id,row.shopId,`${prefix[kind]}.cancel`,row,updated,reason);return updated;
  });
 }
 async reconciliation(id:string,actor:Actor){
  this.check(actor,'REMITTANCE','read');
  return this.db.$transaction(async tx=>{
   const row=await this.read(tx,id,'REMITTANCE',actor);
   const day=(d:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo'}).format(d);
   const live=await this.totals(tx,row.shopId,day(row.periodFrom!),day(row.periodTo!));
   const sameCurrency=!live.currencyLabel||live.currencyLabel===row.currencyLabel;
   const delta=row.expectedAmount&&sameCurrency?new Prisma.Decimal(live.expectedCash).sub(row.expectedAmount).toFixed(2):null;
   const snapshot=row.snapshot as {saleIds?:string[];expenseIds?:string[]}|null;
   const changed=(before:string[]|undefined,after:string[])=>JSON.stringify([...(before??[])].sort())!==JSON.stringify([...after].sort());
   const sourcesChanged=Boolean(snapshot)&&(changed(snapshot?.saleIds,live.saleIds)||changed(snapshot?.expenseIds,live.expenseIds));
   return {original:row.snapshot,current:live,expectedChange:delta,sourcesChanged,requiresReview:row.status!=='DRAFT'&&(!sameCurrency||sourcesChanged||delta!=='0.00'||live.unknownPaymentSales.length>0)};
  },{isolationLevel:'RepeatableRead'});
 }
 audit(tx:Prisma.TransactionClient,actor:Actor,id:string,shopId:string,action:string,old:unknown,value:unknown,reason?:string){return tx.auditEvent.create({data:{actorId:actor.id,shopId,entityType:'FinanceOperation',entityId:id,action,reason,oldValue:old?JSON.parse(JSON.stringify(old)):undefined,newValue:JSON.parse(JSON.stringify(value))}});}
}

@ApiTags('expenses') @ApiBearerAuth() @ApiDomainErrors() @Controller('expenses')
export class ExpensesController {
 constructor(private readonly s:FinanceService){}
 @Get() @ApiList(financeSchema) @RequirePermission('expenses.read') list(@Query() q:FinanceQueryDto,@Request() r:{actor:Actor}){return this.s.list(q,'EXPENSE',r.actor);}
 @Get(':id') @ApiRecord(financeSchema) @RequirePermission('expenses.read') get(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.get(id,'EXPENSE',r.actor);}
 @Post() @ApiRecord(financeSchema,201) @RequirePermission('expenses.create') @ApiOperation({summary:'Créer un brouillon de dépense, sans déduction immédiate'}) create(@Body() b:ExpenseDto,@Request() r:{actor:Actor}){return this.s.create('EXPENSE',b,r.actor);}
 @Post(':id/validate') @ApiRecord(financeSchema,201) @RequirePermission('expenses.validate') validate(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.validate(id,'EXPENSE',r.actor);}
 @Post(':id/cancel') @ApiRecord(financeSchema,201) @RequirePermission('expenses.cancel') cancel(@Param('id',ParseUUIDPipe) id:string,@Body() b:ReasonDto,@Request() r:{actor:Actor}){return this.s.cancel(id,'EXPENSE',b.reason,r.actor);}
}
@ApiTags('remittances') @ApiBearerAuth() @ApiDomainErrors() @Controller('remittances')
export class RemittancesController {
 constructor(private readonly s:FinanceService){}
 @Get() @ApiList(financeSchema) @RequirePermission('remittances.read') list(@Query() q:FinanceQueryDto,@Request() r:{actor:Actor}){return this.s.list(q,'REMITTANCE',r.actor);}
 @Get(':id') @ApiRecord(financeSchema) @RequirePermission('remittances.read') get(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.get(id,'REMITTANCE',r.actor);}
 @Get(':id/reconciliation') @ApiRecord(reconciliationSchema) @RequirePermission('remittances.read') reconcile(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.reconciliation(id,r.actor);}
 @Post() @ApiRecord(financeSchema,201) @RequirePermission('remittances.create') @ApiOperation({summary:'Brouillon du montant réellement remis, distinct du montant attendu'}) create(@Body() b:RemittanceDto,@Request() r:{actor:Actor}){return this.s.create('REMITTANCE',b,r.actor);}
 @Post(':id/validate') @ApiRecord(financeSchema,201) @RequirePermission('remittances.validate') validate(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.validate(id,'REMITTANCE',r.actor);}
 @Post(':id/cancel') @ApiRecord(financeSchema,201) @RequirePermission('remittances.cancel') cancel(@Param('id',ParseUUIDPipe) id:string,@Body() b:ReasonDto,@Request() r:{actor:Actor}){return this.s.cancel(id,'REMITTANCE',b.reason,r.actor);}
}
@ApiTags('supplier-invoices') @ApiBearerAuth() @ApiDomainErrors() @Controller('supplier-invoices')
export class SupplierInvoicesController {
 constructor(private readonly s:FinanceService,private readonly db:PrismaService){}
 @Get('consultation') @ApiList({type:'object',additionalProperties:true}) @RequirePermission('supplier-invoices.read')
 consultation(@Query() q:SupplierConsultationQuery,@Request() r:{actor:Actor}){return supplierList(this.db,q,r.actor);}
 @Get('suppliers') @ApiRecord({type:'array',items:{type:'object',properties:{id:{type:'string'},nom:{type:'string'}}}}) @RequirePermission('supplier-invoices.read')
 suppliers(@Query() q:SupplierScopeQuery,@Request() r:{actor:Actor}){return suppliers(this.db,r.actor,q.shopId);}
 @Get() @ApiList(financeSchema) @RequirePermission('supplier-invoices.read') list(@Query() q:FinanceQueryDto,@Request() r:{actor:Actor}){return this.s.list(q,'SUPPLIER_INVOICE',r.actor);}
 @Get(':id') @ApiRecord(financeSchema) @RequirePermission('supplier-invoices.read') get(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.get(id,'SUPPLIER_INVOICE',r.actor);}
 @Post() @ApiRecord(financeSchema,201) @RequirePermission('supplier-invoices.create') @ApiOperation({summary:'Facture fournisseur en brouillon ; ne crée aucun mouvement ni changement de prix'}) create(@Body() b:SupplierInvoiceDto,@Request() r:{actor:Actor}){return this.s.create('SUPPLIER_INVOICE',b,r.actor);}
 @Post(':id/receipt') @ApiRecord(financeSchema,201) @RequirePermission('supplier-invoices.create') link(@Param('id',ParseUUIDPipe) id:string,@Body() b:LinkReceiptDto,@Request() r:{actor:Actor}){return this.s.link(id,b.receiptId,r.actor);}
 @Post(':id/validate') @ApiRecord(financeSchema,201) @RequirePermission('supplier-invoices.validate') validate(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.s.validate(id,'SUPPLIER_INVOICE',r.actor);}
 @Post(':id/cancel') @ApiRecord(financeSchema,201) @RequirePermission('supplier-invoices.cancel') cancel(@Param('id',ParseUUIDPipe) id:string,@Body() b:ReasonDto,@Request() r:{actor:Actor}){return this.s.cancel(id,'SUPPLIER_INVOICE',b.reason,r.actor);}
}
@ApiTags('reports') @ApiBearerAuth() @Controller('reports/finance')
export class FinanceReportsController {
 constructor(private readonly s:FinanceService){}
 @Get() @ApiRecord(summarySchema) @RequirePermission('reports.read') @ApiOperation({summary:'Ventes, dépenses, montant après dépenses et attendu espèces sur la période réelle'}) summary(@Query() q:SummaryQueryDto,@Request() r:{actor:Actor}){return this.s.summary(q,r.actor);}
}
