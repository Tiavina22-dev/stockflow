import { BadRequestException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Request, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FinanceKind } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { Response } from 'express';
import { Actor } from './auth';
import { FinanceService } from './finance';
import { OperationsService } from './operations';
import { PrismaService } from './prisma.service';
import { ApiDomainErrors, ApiRecord } from './finance-contract';
const folder=()=>resolve(process.env.UPLOAD_DIR??'.local/uploads');
const kinds:Record<string,FinanceKind>={expenses:'EXPENSE',remittances:'REMITTANCE','supplier-invoices':'SUPPLIER_INVOICE'};
@ApiTags('finance-attachments') @ApiBearerAuth() @ApiDomainErrors() @Controller('finance')
export class FinanceMediaController {
 constructor(private readonly db:PrismaService,private readonly finance:FinanceService,private readonly ops:OperationsService){}
 kind(route:string){const kind=kinds[route];if(!kind)throw new NotFoundException();return kind;}
 @Post(':kind/:id/attachments') @ApiConsumes('multipart/form-data') @ApiBody({schema:{type:'object',properties:{file:{type:'string',format:'binary'}}}})
 @ApiOperation({summary:'Ajouter un justificatif conservé',description:'kind = expenses, remittances ou supplier-invoices. Permission <kind>.create et magasin autorisé vérifiés serveur. PDF/PNG/JPG, 10 Mo maximum.'})
 @ApiRecord({type:'object',properties:{id:{type:'string',format:'uuid'},financeId:{type:'string',format:'uuid'},originalName:{type:'string'},mimeType:{type:'string'},size:{type:'integer'},uploaderId:{type:'string',format:'uuid'},createdAt:{type:'string',format:'date-time'}}},201)
 @UseInterceptors(FileInterceptor('file',{limits:{fileSize:10*1024*1024,files:1}}))
 async upload(@Param('kind') route:string,@Param('id',ParseUUIDPipe) id:string,@UploadedFile() file:{buffer:Buffer;originalname:string}|undefined,@Request() r:{actor:Actor}){
  const kind=this.kind(route);this.finance.check(r.actor,kind,'create');await this.finance.read(this.db,id,kind,r.actor);
  if(!file)throw new BadRequestException('Justificatif requis.');
  const b=file.buffer;
  const ext=b.subarray(0,5).toString()==='%PDF-'?'pdf':b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':b[0]===255&&b[1]===216&&b[2]===255?'jpg':null;
  if(!ext)throw new BadRequestException('PDF, PNG ou JPG requis.');
  const name=`${randomUUID()}.${ext}`;await mkdir(folder(),{recursive:true});await writeFile(resolve(folder(),name),b,{flag:'wx'});
  return this.ops.transaction(async tx=>{
   const row=await this.finance.read(tx,id,kind,r.actor);
   if(row.status==='CANCELLED')throw new BadRequestException('Opération annulée.');
   const attachment=await tx.financeAttachment.create({data:{financeId:id,location:name,originalName:basename(file.originalname).slice(0,255),mimeType:ext==='pdf'?'application/pdf':`image/${ext==='jpg'?'jpeg':ext}`,size:b.length,uploaderId:r.actor.id}});
   await tx.auditEvent.create({data:{actorId:r.actor.id,shopId:row.shopId,action:'finance.attachment.add',entityType:'FinanceOperation',entityId:id,newValue:{attachmentId:attachment.id,name:attachment.originalName}}});
   const {location,...result}=attachment;return result;
  });
 }
 @Get(':kind/:id/attachments/:attachmentId')
 @ApiOperation({summary:'Télécharger un justificatif privé',description:'Permission <kind>.read et magasin autorisé vérifiés serveur.'})
 @ApiResponse({status:200,content:{'application/pdf':{schema:{type:'string',format:'binary'}},'image/png':{schema:{type:'string',format:'binary'}},'image/jpeg':{schema:{type:'string',format:'binary'}}}})
 async download(@Param('kind') route:string,@Param('id',ParseUUIDPipe) id:string,@Param('attachmentId',ParseUUIDPipe) attachmentId:string,@Request() r:{actor:Actor},@Res() res:Response){
  await this.finance.get(id,this.kind(route),r.actor);
  const attachment=await this.db.financeAttachment.findFirst({where:{id:attachmentId,financeId:id}});
  if(!attachment||!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(attachment.location))throw new NotFoundException();
  let data:Buffer;try{data=await readFile(resolve(folder(),attachment.location));}catch{throw new NotFoundException('Fichier indisponible.');}
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Disposition',`attachment; filename="${attachment.id}.${attachment.location.split('.').pop()}"`);res.type(attachment.mimeType);res.send(data);
 }
}
