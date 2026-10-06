import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Request, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiExtraModels, ApiOperation, ApiProperty, ApiTags, SchemaObject } from '@nestjs/swagger';
import { ApiList, ApiRecord, ApiDomainErrors, financeSchema } from './finance-contract';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateNested, validate } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { businessDate, decimal, OperationsService } from './operations';
import { FinanceService, FinanceQueryDto, period } from './finance';
import { consultJournals, journalDetail, journalUsers, JournalConsultationQuery, consultJournalSchema, consultDetailSchema } from './journal-consultation';
export class JournalLineDto { @IsUUID() productId:string; @IsString() quantity:string; @IsString() unitPrice:string; @IsOptional() @IsString() note?:string; }
export class JournalExpenseDto { @IsString() amount:string; @IsString() reason:string; @IsOptional() @IsString() note?:string; }
export class JournalDto {
 @IsUUID() shopId:string;
 @IsString() date:string;
 @IsUUID() requestKey:string;
 @IsIn(['DRAFT','VALIDATED']) status:'DRAFT'|'VALIDATED';
 @IsArray() @ArrayMaxSize(500) @ValidateNested({each:true}) @Type(()=>JournalLineDto) lines:JournalLineDto[];
 @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>JournalExpenseDto) expenses:JournalExpenseDto[];
 @IsOptional() @IsString() amountRemitted?:string;
 @IsOptional() @IsString() remittanceNote?:string;
}
for(const [dto,keys] of [[JournalLineDto,['productId','quantity','unitPrice','note']],[JournalExpenseDto,['amount','reason','note']],[JournalDto,['shopId','date','requestKey','status','amountRemitted','remittanceNote']]] as const) for(const key of keys) ApiProperty({type:String,required:!['note','amountRemitted','remittanceNote'].includes(key)})(dto.prototype,key);
ApiProperty({type:[JournalLineDto]})(JournalDto.prototype,'lines');ApiProperty({type:[JournalExpenseDto]})(JournalDto.prototype,'expenses');
type Photo={buffer:Buffer;originalname:string};
const folder=()=>resolve(process.env.UPLOAD_DIR??'.local/uploads','journals');
const children={operations:{include:{lines:true}},finance:true,attachments:{select:{id:true,originalName:true,mimeType:true,size:true,createdAt:true}}} as const;
const journalSchema:SchemaObject={type:'object',required:['id','shopId','businessDate','status','operations','finance','attachments'],properties:{id:{type:'string',format:'uuid'},shopId:{type:'string',format:'uuid'},businessDate:{type:'string',format:'date-time'},status:{type:'string',enum:['DRAFT','VALIDATED','CANCELLED']},createdById:{type:'string',format:'uuid'},createdAt:{type:'string',format:'date-time'},validatedAt:{type:'string',format:'date-time',nullable:true},operations:{type:'array',items:{type:'object',properties:{id:{type:'string',format:'uuid'},number:{type:'string'},total:{type:'string'},lines:{type:'array',items:{type:'object',additionalProperties:true}}},additionalProperties:true}},finance:{type:'array',items:financeSchema},attachments:{type:'array',items:{type:'object',properties:{id:{type:'string',format:'uuid'},originalName:{type:'string'},mimeType:{type:'string'},size:{type:'integer'},createdAt:{type:'string',format:'date-time'}}}},warnings:{type:'array',items:{type:'string'}}}};
function childKey(key:string,index:string) {const h=createHash('sha256').update(`${key}:${index}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
@ApiTags('cash-journals') @ApiExtraModels(JournalDto,JournalLineDto,JournalExpenseDto) @ApiBearerAuth() @ApiDomainErrors() @Controller('cash-journals')
export class CashJournalsController {
 constructor(private readonly db:PrismaService,private readonly ops:OperationsService,private readonly finance:FinanceService,private readonly access:ShopAccess){}
 async result(tx:Prisma.TransactionClient,id:string) {
  const journal=await tx.cashJournal.findUniqueOrThrow({where:{id},include:children});
  const products=[...new Set(journal.operations.flatMap(o=>o.lines.map(l=>l.productId)))];
  return {...journal,warnings:journal.status==='VALIDATED'?await this.ops.stockWarnings(tx,[journal.shopId],products):[]};
 }
 async validateTx(tx:Prisma.TransactionClient,id:string,actor:Actor) {
  const journal=await tx.cashJournal.findUnique({where:{id},include:children});
  if(!journal) throw new NotFoundException('Journal introuvable.');this.access.assert(actor,journal.shopId);
  if(journal.status!=='DRAFT') throw new ConflictException('Journal déjà validé.');
  // No independent operation validation: only the complete journal can be validated.
  for(const sale of journal.operations) await this.ops.validateTx(tx,sale.id,actor,id);
  for(const expense of journal.finance.filter(f=>f.kind==='EXPENSE')) await this.finance.validate(expense.id,'EXPENSE',actor,tx,id);
  for(const remit of journal.finance.filter(f=>f.kind==='REMITTANCE')) await this.finance.validate(remit.id,'REMITTANCE',actor,tx,id);
  await tx.cashJournal.update({where:{id},data:{status:'VALIDATED',validatedAt:new Date()}});
  await tx.auditEvent.create({data:{actorId:actor.id,shopId:journal.shopId,action:'journal.validate',entityType:'CashJournal',entityId:id}});
 }
 @Get() @RequirePermission('sales.read') @ApiRecord({type:'array',items:journalSchema}) @ApiOperation({summary:'Journaux du magasin, incluant brouillons ; lecture financière requise'})
 async list(@Query() q:FinanceQueryDto,@Request() r:{actor:Actor}) {
  this.ops.permission(r.actor,'expenses.read');this.ops.permission(r.actor,'remittances.read');this.access.assert(r.actor,q.shopId);
  const range=q.from&&q.to?period(q.from,q.to):null;
  return this.db.cashJournal.findMany({where:{shopId:q.shopId,businessDate:range?{gte:range.start,lt:range.until}:undefined,status:q.status},include:children,orderBy:[{businessDate:'desc'},{id:'desc'}]});
 }
 @Get('consultation') @ApiList(consultJournalSchema) @RequirePermission('sales.read') @ApiOperation({summary:'Cahiers paginés : filtres magasin/date/auteur/recherche et tri ; droits financiers requis'})
 consult(@Query() q:JournalConsultationQuery,@Request() r:{actor:Actor}) {return consultJournals(this.db,q,r.actor);}
 @Get('consultation/users') @ApiRecord({type:'array',items:{type:'object',properties:{id:{type:'string',format:'uuid'},nom:{type:'string'}}}}) @RequirePermission('sales.read') @ApiOperation({summary:'Auteurs des cahiers accessibles ; droits financiers requis'})
 users(@Request() r:{actor:Actor}) {return journalUsers(this.db,r.actor);}
 @Get('consultation/:id') @ApiRecord(consultDetailSchema) @RequirePermission('sales.read') @ApiOperation({summary:'Détail financier du cahier et liens privés des justificatifs'})
 detail(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}) {return journalDetail(this.db,id,r.actor);}
 @Post() @RequirePermission('sales.create') @ApiConsumes('multipart/form-data')
 @ApiRecord(journalSchema,201)
 @ApiBody({schema:{type:'object',properties:{payload:{type:'string',description:'JSON JournalDto : shopId/date/requestKey/status/lines/expenses/amountRemitted/remittanceNote'},photos:{type:'array',items:{type:'string',format:'binary'}}}}})
 @ApiOperation({summary:'Saisie atomique du cahier ; une vente par ligne, dépenses et versement liés, photos privées'})
 @UseInterceptors(FilesInterceptor('photos',10,{limits:{fileSize:10*1024*1024,files:10,fieldSize:1024*1024}}))
 async create(@Body('payload') payload:string,@UploadedFiles() photos:Photo[]|undefined,@Request() r:{actor:Actor}) {
  let body:JournalDto;try{body=plainToInstance(JournalDto,JSON.parse(payload));}catch{throw new BadRequestException('JSON du journal invalide.');}
  if(!body||typeof body!=='object'||Array.isArray(body)) throw new BadRequestException('Journal invalide.');
  const errors=await validate(body,{whitelist:true,forbidNonWhitelisted:true});if(errors.length) throw new BadRequestException('Champs du journal invalides.');
  this.access.assert(r.actor,body.shopId);const date=businessDate(body.date);
  if(!body.lines.length&&!body.expenses.length) throw new BadRequestException('Au moins une vente ou dépense requise.');
  for(const l of body.lines){decimal(l.quantity,3,true);decimal(l.unitPrice,2);}
  for(const e of body.expenses){decimal(e.amount,2,true);if(!e.reason.trim()) throw new BadRequestException('Motif de dépense obligatoire.');}
  if(body.amountRemitted!==undefined) decimal(body.amountRemitted,2);
  const files=(photos??[]).map(f=>{const b=f.buffer,ext=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':b[0]===255&&b[1]===216&&b[2]===255?'jpg':b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'?'webp':null;if(!ext)throw new BadRequestException('Photos JPG, PNG ou WEBP requises.');return {...f,ext,hash:createHash('sha256').update(b).digest('hex'),location:`${randomUUID()}.${ext}`};});
  const hash=createHash('sha256').update(JSON.stringify({body,photos:files.map(f=>({name:f.originalname,hash:f.hash}))})).digest('hex');
  let retain=false;
  try {
   if(files.length){await mkdir(folder(),{recursive:true});for(const f of files) await writeFile(resolve(folder(),f.location),f.buffer,{flag:'wx'});}
   const result=await this.ops.transaction(async tx=>{
    const existing=await tx.cashJournal.findUnique({where:{requestKey:body.requestKey},include:children});
    if(existing){if(existing.createdById!==r.actor.id||existing.requestHash!==hash)throw new ConflictException('Clé de saisie déjà utilisée avec un autre contenu.');return {journal:existing,reused:true};}
    const journal=await tx.cashJournal.create({data:{shopId:body.shopId,createdById:r.actor.id,businessDate:date,requestKey:body.requestKey,requestHash:hash}});
    for(const [i,l] of body.lines.entries()) {
     const sale=await this.ops.create({type:'SALE',shopId:body.shopId,businessDate:body.date,status:'DRAFT',requestKey:childKey(body.requestKey,`sale:${i}`),lines:[{productId:l.productId,quantity:l.quantity,unitPrice:l.unitPrice}],note:l.note},r.actor,undefined,tx,body.status==='VALIDATED');
     await tx.operation.update({where:{id:sale.id},data:{journalId:journal.id}});
    }
    for(const [i,e] of body.expenses.entries()) {
     const expense=await this.finance.create('EXPENSE',{shopId:body.shopId,businessDate:body.date,requestKey:childKey(body.requestKey,`expense:${i}`),amount:e.amount,reason:e.reason,note:e.note,paymentMethod:'CASH'},r.actor,tx);
     await tx.financeOperation.update({where:{id:expense.id},data:{journalId:journal.id}});
    }
    if(body.amountRemitted!==undefined){const remit=await this.finance.create('REMITTANCE',{shopId:body.shopId,businessDate:body.date,requestKey:childKey(body.requestKey,'remit'),amount:body.amountRemitted,periodFrom:body.date,periodTo:body.date,note:body.remittanceNote},r.actor,tx);await tx.financeOperation.update({where:{id:remit.id},data:{journalId:journal.id}});}
    for(const f of files) await tx.cashJournalAttachment.create({data:{journalId:journal.id,originalName:basename(f.originalname).slice(0,255),location:f.location,mimeType:f.ext==='jpg'?'image/jpeg':`image/${f.ext}`,size:f.buffer.length}});
    await tx.auditEvent.create({data:{actorId:r.actor.id,shopId:body.shopId,action:'journal.create',entityType:'CashJournal',entityId:journal.id,newValue:{sales:body.lines.length,expenses:body.expenses.length,photos:files.length}}});
    if(body.status==='VALIDATED') await this.validateTx(tx,journal.id,r.actor);
    return {journal:await this.result(tx,journal.id),reused:false};
   });
   retain=!result.reused;return result.journal;
  } finally {if(!retain) for(const f of files) await unlink(resolve(folder(),f.location)).catch(()=>{});}
 }
 @Post(':id/validate') @RequirePermission('sales.validate') @ApiRecord(journalSchema,201) @ApiOperation({summary:'Valider toutes les opérations du journal dans une transaction'})
 validate(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}) {return this.ops.transaction(async tx=>{await this.validateTx(tx,id,r.actor);return this.result(tx,id);});}
 @Get(':id/attachments/:attachmentId') @RequirePermission('sales.read') @ApiOperation({summary:'Justificatif privé du journal ; accès magasin contrôlé'})
 async photo(@Param('id',ParseUUIDPipe) id:string,@Param('attachmentId',ParseUUIDPipe) attachmentId:string,@Request() r:{actor:Actor},@Res() res:Response) {
  const j=await this.db.cashJournal.findUnique({where:{id},include:{attachments:true}});if(!j)throw new NotFoundException();this.access.assert(r.actor,j.shopId);
  this.ops.permission(r.actor,'expenses.read');this.ops.permission(r.actor,'remittances.read');
  const f=j.attachments.find(f=>f.id===attachmentId);if(!f||!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(f.location)) throw new NotFoundException();
  let data:Buffer;try{data=await readFile(resolve(folder(),f.location));}catch{throw new NotFoundException('Fichier indisponible.');}
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.type(f.mimeType).send(data);
 }
}
