import { Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { OperationsService } from './operations';
import { pageValues } from './customers';
import { period } from './finance';
import { ApiDomainErrors, ApiList, ApiRecord, auditSchema } from './finance-contract';
import { Prisma } from '@prisma/client';
export class AuditQueryDto {
 @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?:string;
 @ApiPropertyOptional() @IsOptional() @IsUUID() actorId?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) action?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) entityType?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) entityId?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() from?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() to?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() page?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() pageSize?:string;
}
@Injectable()
export class AuditService {
 constructor(private readonly db:PrismaService,private readonly access:ShopAccess,private readonly ops:OperationsService){}
 scope(actor:Actor,shopId?:string):Prisma.AuditEventWhereInput {
  if(shopId){this.access.assert(actor,shopId);return {shopId};}
  return actor.permissions.includes('shops.all')?{}:{shopId:{in:actor.shopIds}};
 }
 list(q:AuditQueryDto,actor:Actor){
  this.ops.permission(actor,'audit.read');
  const p=pageValues(q.page,q.pageSize);
  // Date filters are inclusive Madagascar business days, applied to createdAt.
  const r=q.from||q.to?period(q.from??q.to!,q.to??q.from!):null;
  const where={...this.scope(actor,q.shopId),actorId:q.actorId,action:q.action,entityType:q.entityType,entityId:q.entityId,createdAt:r?{gte:r.start,lt:r.until}:undefined};
  return this.db.$transaction(async tx=>({items:await tx.auditEvent.findMany({where,include:{actor:{select:{id:true,name:true}},shop:{select:{id:true,name:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:p.skip,take:p.pageSize}),total:await tx.auditEvent.count({where}),page:p.page,pageSize:p.pageSize}),{isolationLevel:'RepeatableRead'});
 }
 async get(id:string,actor:Actor){
  this.ops.permission(actor,'audit.read');
  const row=await this.db.auditEvent.findFirst({where:{id,...this.scope(actor)},include:{actor:{select:{id:true,name:true}},shop:{select:{id:true,name:true}}}});
  if(!row) throw new NotFoundException('Événement introuvable dans les magasins autorisés.');return row;
 }
}
@ApiTags('audit') @ApiBearerAuth() @ApiDomainErrors() @Controller('audit')
export class AuditController {
 constructor(private readonly service:AuditService){}
 @Get() @ApiList(auditSchema) @RequirePermission('audit.read') @ApiOperation({summary:'Journal central paginé, filtré par magasin, auteur, objet, action et période'}) list(@Query() q:AuditQueryDto,@Request() r:{actor:Actor}){return this.service.list(q,r.actor);}
 @Get(':id') @ApiRecord(auditSchema) @RequirePermission('audit.read') @ApiOperation({summary:'Détail avant/après ; événements globaux réservés aux droits tous magasins'}) get(@Param('id',ParseUUIDPipe) id:string,@Request() r:{actor:Actor}){return this.service.get(id,r.actor);}
}
