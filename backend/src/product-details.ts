import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Request } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { OperationsService, decimal } from './operations';
import { ApiDomainErrors, ApiRecord } from './finance-contract';

class ShopPriceDto {
 @ApiProperty({format:'uuid'}) @IsUUID() shopId:string;
 @ApiProperty({type:String,nullable:true}) @IsOptional() @IsString() price:string|null;
}
export class SaveShopPricesDto {
 @ApiProperty({type:[ShopPriceDto]}) @IsArray() @ArrayMaxSize(500) @ValidateNested({each:true}) @Type(()=>ShopPriceDto) prices:ShopPriceDto[];
 @ApiProperty({type:[ShopPriceDto],description:'Prix chargés avant édition ; contrôle de concurrence'}) @IsArray() @ArrayMaxSize(500) @ValidateNested({each:true}) @Type(()=>ShopPriceDto) expectedPrices:ShopPriceDto[];
}
const priceSchema={type:'array' as const,items:{type:'object' as const,properties:{magasinId:{type:'string' as const,format:'uuid'},magasinNom:{type:'string' as const},prixDeVente:{type:'number' as const,nullable:true}}}};
@Controller('products') @ApiTags('products') @ApiBearerAuth() @ApiDomainErrors()
export class ProductDetailsController {
 constructor(private readonly db:PrismaService,private readonly ops:OperationsService,private readonly access:ShopAccess){}
 private shops(actor:Actor) {return actor.permissions.includes('shops.all')?{}:{id:{in:actor.shopIds}};}
 async prices(tx:Prisma.TransactionClient,id:string,actor:Actor) {
  if(!await tx.product.findUnique({where:{id}}))throw new NotFoundException('Produit introuvable.');
  const rows=await tx.productPrice.findMany({where:{productId:id,shop:this.shops(actor)},include:{shop:true},orderBy:{shopId:'asc'}});
  return rows.map(r=>({magasinId:r.shopId,magasinNom:r.shop.name,prixDeVente:Number(r.price)}));
 }
 @Get(':id/detail') @RequirePermission('products.read') @ApiRecord({type:'object',additionalProperties:true})
 async detail(@Param('id',ParseUUIDPipe) id:string,@Request() req:{actor:Actor}) {
  this.ops.permission(req.actor,'stock.read');
  return this.db.$transaction(async tx=>{
   const p=await tx.product.findUnique({where:{id},include:{category:true,unit:true}});if(!p)throw new NotFoundException('Produit introuvable.');
   const stock=await tx.stockBalance.aggregate({where:{productId:id,shop:this.shops(req.actor)},_sum:{quantity:true}});
   return {id:p.id,nom:p.name,reference:p.reference,typeDeProduit:null,categorie:p.category.name,uniteDeVente:p.unit.name,uniteAuPluriel:p.unit.name,poids:null,prixDAchatMoyen:null,stockActuel:Number(stock._sum.quantity??0),stockMinimum:Number(p.lowStockThreshold),fournisseurPrincipal:null,statut:p.active?'Actif':'Inactif',photoUrl:p.photoUrl??undefined};
  },{isolationLevel:'RepeatableRead'});
 }
 @Get(':id/shop-prices') @RequirePermission('products.read') @ApiRecord(priceSchema)
 list(@Param('id',ParseUUIDPipe) id:string,@Request() req:{actor:Actor}) {return this.db.$transaction(tx=>this.prices(tx,id,req.actor));}
 @Patch(':id/shop-prices') @RequirePermission('products.price.update') @ApiRecord(priceSchema)
 save(@Param('id',ParseUUIDPipe) id:string,@Body() body:SaveShopPricesDto,@Request() req:{actor:Actor}) {
  return this.ops.transaction(async tx=>{
   const product=await tx.product.findUnique({where:{id}});if(!product)throw new NotFoundException('Produit introuvable.');
   if(!product.active)throw new BadRequestException('Produit inactif.');
   const current=await this.prices(tx,id,req.actor);
   const normalized=(rows:ShopPriceDto[])=>{
    if(new Set(rows.map(r=>r.shopId)).size!==rows.length)throw new BadRequestException('Magasins dupliqués.');
    return rows.map(r=>{this.access.assert(req.actor,r.shopId);if(r.price===undefined)throw new BadRequestException('Prix requis.');return {shopId:r.shopId,price:r.price===null?null:decimal(r.price,2).toFixed(2)};}).filter(r=>r.price!==null).sort((a,b)=>a.shopId.localeCompare(b.shopId));
   };
   const expected=normalized(body.expectedPrices),next=normalized(body.prices);
   const old=current.map(r=>({shopId:r.magasinId,price:new Prisma.Decimal(r.prixDeVente).toFixed(2)})).sort((a,b)=>a.shopId.localeCompare(b.shopId));
   if(JSON.stringify(old)!==JSON.stringify(expected))throw new ConflictException('Les prix ont changé. Rechargez avant d’enregistrer.');
   const ids=[...new Set([...old,...next].map(r=>r.shopId))];
   for(const shopId of ids.sort()) {
    const before=old.find(r=>r.shopId===shopId)?.price??null,after=next.find(r=>r.shopId===shopId)?.price??null;
    if(before===after)continue;
    if(!(await tx.shop.findUnique({where:{id:shopId}}))?.active)throw new BadRequestException('Magasin absent ou inactif.');
    if(after===null)await tx.productPrice.delete({where:{productId_shopId:{productId:id,shopId}}});
    else {
     await tx.productPrice.upsert({where:{productId_shopId:{productId:id,shopId}},create:{productId:id,shopId,price:after},update:{price:after}});
     await tx.priceChange.create({data:{productId:id,shopId,kind:'sale',oldPrice:before,newPrice:after,origin:'MANUAL_UPDATE',userId:req.actor.id}});
    }
    await tx.auditEvent.create({data:{actorId:req.actor.id,shopId,entityType:'ProductPrice',entityId:id,action:'product-price.update',oldValue:{price:before},newValue:{price:after,fallback:after===null?product.salePrice?.toString()??null:null},reason:'Enregistrement des prix par magasin'}});
   }
   return this.prices(tx,id,req.actor);
  });
 }
}
