import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { Actor, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { pageValues } from './customers';
import { period } from './finance';

export class SupplierScopeQuery {
 @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?:string;
}
export class SupplierConsultationQuery extends SupplierScopeQuery {
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) fournisseurId?:string;
 @ApiProperty() @IsString() du:string;
 @ApiProperty() @IsString() au:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) recherche?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() page?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() pageSize?:string;
}
function scope(actor:Actor,shopId?:string):Prisma.FinanceOperationWhereInput {
 if(shopId){new ShopAccess().assert(actor,shopId);return {shopId};}
 return actor.permissions.includes('shops.all')?{}:{shopId:{in:actor.shopIds}};
}
export function supplierList(db:PrismaService,q:SupplierConsultationQuery,actor:Actor) {
 const p=pageValues(q.page,q.pageSize),range=period(q.du,q.au);
 const where:Prisma.FinanceOperationWhereInput={...scope(actor,q.shopId),kind:'SUPPLIER_INVOICE',businessDate:{gte:range.start,lt:range.until},supplierName:q.fournisseurId,OR:q.recherche?[{number:{contains:q.recherche,mode:'insensitive'}},{supplierName:{contains:q.recherche,mode:'insensitive'}}]:undefined};
 return db.$transaction(async tx=>({items:await tx.financeOperation.findMany({where,select:{id:true,number:true,supplierName:true,businessDate:true,amount:true,status:true},orderBy:[{businessDate:'desc'},{id:'desc'}],skip:p.skip,take:p.pageSize}),total:await tx.financeOperation.count({where}),page:p.page,pageSize:p.pageSize}),{isolationLevel:'RepeatableRead'});
}
export async function suppliers(db:PrismaService,actor:Actor,shopId?:string) {
 const rows=await db.financeOperation.findMany({where:{...scope(actor,shopId),kind:'SUPPLIER_INVOICE'},select:{supplierName:true},distinct:['supplierName'],orderBy:{supplierName:'asc'}});
 // Supplier names are document snapshots, not IDs of a supplier entity.
 return rows.filter(r=>r.supplierName!==null).map(r=>({id:r.supplierName!,nom:r.supplierName!}));
}
