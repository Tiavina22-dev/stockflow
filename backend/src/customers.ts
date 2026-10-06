import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { OperationsService } from './operations';
import { ApiDomainErrors, ApiList, ApiRecord, customerSchema } from './finance-contract';

export class CustomerDto {
 @ApiProperty() @IsUUID() shopId: string;
 @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) name: string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
 @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(200) email?: string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) nif?: string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) stat?: string;
}
export class UpdateCustomerDto extends PartialType(CustomerDto) {
 @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
export function pageValues(page='1', pageSize='25') {
 if(!/^\d+$/.test(page)||!/^\d+$/.test(pageSize)) throw new BadRequestException('Pagination invalide.');
 const p=Number(page), size=Number(pageSize);
 if(!Number.isSafeInteger(p)||p<1||p>1000000||size<1||size>100) throw new BadRequestException('Pagination hors limites.');
 return {page:p,pageSize:size,skip:(p-1)*size};
}
@Injectable()
export class CustomersService {
 constructor(private readonly db:PrismaService,private readonly access:ShopAccess,private readonly ops:OperationsService){}
 async get(id:string,actor:Actor) {
  this.ops.permission(actor,'customers.read');
  const row=await this.db.customer.findUnique({where:{id}});
  if(!row) throw new NotFoundException('Client introuvable.');
  this.access.assert(actor,row.shopId); return row;
 }
 async list(shopId:string,search:string,page:string,size:string,actor:Actor) {
  this.ops.permission(actor,'customers.read'); this.access.assert(actor,shopId);
  const p=pageValues(page,size), where={shopId,OR:search?[{name:{contains:search,mode:'insensitive' as const}},{phone:{contains:search}}]:undefined};
  return this.db.$transaction(async tx=>({items:await tx.customer.findMany({where,skip:p.skip,take:p.pageSize,orderBy:[{name:'asc'},{id:'asc'}]}),total:await tx.customer.count({where}),page:p.page,pageSize:p.pageSize}),{isolationLevel:'RepeatableRead'});
 }
 save(body:CustomerDto|UpdateCustomerDto,actor:Actor,id?:string) {
  this.ops.permission(actor,id?'customers.update':'customers.create');
  return this.ops.transaction(async tx=>{
   const old=id?await tx.customer.findUnique({where:{id}}):null;
   if(id&&!old) throw new NotFoundException('Client introuvable.');
   const shopId=old?.shopId??body.shopId;
   if(!shopId) throw new BadRequestException('Magasin requis.');
   this.access.assert(actor,shopId);
   if(old&&body.shopId&&old.shopId!==body.shopId) throw new BadRequestException('Le magasin du client ne peut pas changer.');
   if(!(await tx.shop.findUnique({where:{id:shopId}}))?.active) throw new BadRequestException('Magasin inactif.');
   if(body.name!==undefined&&!body.name.trim()) throw new BadRequestException('Nom requis.');
   const row=id?await tx.customer.update({where:{id},data:body}):await tx.customer.create({data:body as CustomerDto});
   await tx.auditEvent.create({data:{actorId:actor.id,shopId,action:id?'customer.update':'customer.create',entityType:'Customer',entityId:row.id,oldValue:old?JSON.parse(JSON.stringify(old)):undefined,newValue:JSON.parse(JSON.stringify(row))}});
   return row;
  });
 }
}
@ApiTags('customers') @ApiBearerAuth() @ApiDomainErrors() @Controller('customers')
export class CustomersController {
 constructor(private readonly service:CustomersService){}
 @Get() @ApiList(customerSchema) @RequirePermission('customers.read') list(@Query('shopId',ParseUUIDPipe) shopId:string,@Query('search') search='',@Query('page') page='1',@Query('pageSize') size='25',@Request() req:{actor:Actor}){return this.service.list(shopId,search,page,size,req.actor);}
 @Get(':id') @ApiRecord(customerSchema) @RequirePermission('customers.read') get(@Param('id',ParseUUIDPipe) id:string,@Request() req:{actor:Actor}){return this.service.get(id,req.actor);}
 @Post() @ApiRecord(customerSchema,201) @RequirePermission('customers.create') create(@Body() body:CustomerDto,@Request() req:{actor:Actor}){return this.service.save(body,req.actor);}
 @Patch(':id') @ApiRecord(customerSchema) @RequirePermission('customers.update') update(@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateCustomerDto,@Request() req:{actor:Actor}){return this.service.save(body,req.actor,id);}
}
