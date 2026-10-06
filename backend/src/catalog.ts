import { Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, Query, Request, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { CreateProductDto, CreateShopDto, NameDto, PageDto, UpdateNameDto, UpdateProductDto, UpdateShopDto, pagination } from './dto';
import { PrismaService } from './prisma.service';
import { readSettings } from './application-settings';

function parsePage(query: PageDto) { try { return pagination(query); } catch { throw new BadRequestException('Pagination invalide : page >= 1 et pageSize entre 1 et 100.'); } }

@ApiTags('shops') @ApiBearerAuth() @Controller('shops')
export class ShopsController {
  constructor(private readonly db: PrismaService, private readonly access: ShopAccess) {}
  @Get() @RequirePermission('shops.read') @ApiOperation({ summary: 'Magasins accessibles' })
  async list(@Request() req: { actor: Actor }) {
    return this.db.shop.findMany({ where: req.actor.permissions.includes('shops.all') ? {} : { id: { in: req.actor.shopIds } }, orderBy: { name: 'asc' } });
  }
  @Post() @RequirePermission('shops.create') @ApiOperation({ summary: 'Créer un magasin' })
  create(@Body() body: CreateShopDto, @Request() req: { actor: Actor }) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(874303)::text`;
      if(body.isMain) await tx.shop.updateMany({where:{isMain:true},data:{isMain:false}});
      const shop = await tx.shop.create({ data: body });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'shop.create', entityType: 'Shop', entityId: shop.id, shopId: shop.id, newValue: JSON.parse(JSON.stringify(shop)) } });
      return shop;
    });
  }
  @Get(':id') @RequirePermission('shops.read') @ApiOperation({ summary: 'Détail magasin' })
  async one(@Param('id') id: string, @Request() req: { actor: Actor }) {
    this.access.assert(req.actor, id);
    const shop = await this.db.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Magasin introuvable.');
    return shop;
  }
  @Patch(':id') @RequirePermission('shops.update') @ApiOperation({ summary: 'Modifier ou désactiver un magasin' })
  async update(@Param('id') id: string, @Body() body: UpdateShopDto, @Request() req: { actor: Actor }) {
    this.access.assert(req.actor, id);
    const result = await this.db.$transaction(async tx => {
      const before = await tx.shop.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Magasin introuvable.');
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(874303)::text`;
      if(before.isMain && body.active===false) throw new BadRequestException('Choisissez un autre magasin principal avant de desactiver celui-ci.');
      if(body.isMain) await tx.shop.updateMany({where:{isMain:true,id:{not:id}},data:{isMain:false}});
      const updated = await tx.shop.update({ where: { id }, data: body });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'shop.update', entityType: 'Shop', entityId: id, shopId: id, oldValue: JSON.parse(JSON.stringify(before)), newValue: JSON.parse(JSON.stringify(updated)) } });
      return updated;
    });
    return result;
  }
 @Delete(':id') @RequirePermission('shops.update')
 async archive(@Param('id') id:string,@Request() req:{actor:Actor}) {
  this.access.assert(req.actor,id);
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(874303)::text`;
   const before=await tx.shop.findUnique({where:{id}});
   if(!before) throw new NotFoundException('Magasin introuvable.');
   if(before.isMain || await tx.operation.count({where:{OR:[{shopId:id},{destinationShopId:id}]}}) || await tx.financeOperation.count({where:{shopId:id}}) || await tx.stockBalance.count({where:{shopId:id,quantity:{not:0}}})) throw new BadRequestException('Magasin principal ou historique : desactivez-le apres avoir choisi un autre magasin principal.');
   const after=await tx.shop.update({where:{id},data:{active:false}});
   await tx.auditEvent.create({data:{actorId:req.actor.id,action:'shop.archive',entityType:'Shop',entityId:id,shopId:id,oldValue:JSON.parse(JSON.stringify(before)),newValue:JSON.parse(JSON.stringify(after))}});return after;
  });
 }
}

@Injectable()
export class ReferenceService {
  constructor(private readonly db: PrismaService) {}
  list(kind: 'category' | 'unit' | 'brand') {
    if (kind === 'category') return this.db.category.findMany({ orderBy: { name: 'asc' }, include: {_count:{select:{products:true}}} });
    if (kind === 'unit') return this.db.unit.findMany({ orderBy: { name: 'asc' }, include: {_count:{select:{products:true}}} });
    return this.db.brand.findMany({ orderBy: { name: 'asc' }, include: {_count:{select:{products:true}}} });
  }
  create(kind: 'category' | 'unit' | 'brand', input: NameDto, actorId: string) {
    return this.db.$transaction(async tx => {
      const created = kind === 'category' ? await tx.category.create({ data: input }) : kind === 'unit' ? await tx.unit.create({ data: input }) : await tx.brand.create({ data: input });
      await tx.auditEvent.create({ data: { actorId, action: `${kind}.create`, entityType: kind, entityId: created.id, newValue: JSON.parse(JSON.stringify(created)) } });
      return created;
    });
  }
  async archive(kind:'category'|'unit'|'brand',id:string,actorId:string) {
    const field=kind==='category'?'categoryId':kind==='unit'?'unitId':'brandId';
    if(await this.db.product.count({where:{[field]:id}})) throw new BadRequestException('Cet element est utilise par des produits. Reclassez-les avant de le retirer.');
    return this.update(kind,id,{active:false},actorId);
  }
  async update(kind: 'category' | 'unit' | 'brand', id: string, data: UpdateNameDto, actorId: string) {
    return this.db.$transaction(async tx => {
      const before = kind === 'category' ? await tx.category.findUnique({ where: { id } }) : kind === 'unit' ? await tx.unit.findUnique({ where: { id } }) : await tx.brand.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Référentiel introuvable.');
      const updated = kind === 'category' ? await tx.category.update({ where: { id }, data }) : kind === 'unit' ? await tx.unit.update({ where: { id }, data }) : await tx.brand.update({ where: { id }, data });
      await tx.auditEvent.create({ data: { actorId, action: `${kind}.update`, entityType: kind, entityId: id, oldValue: JSON.parse(JSON.stringify(before)), newValue: JSON.parse(JSON.stringify(updated)) } });
      return updated;
    });
  }
}

@ApiTags('categories') @ApiBearerAuth() @Controller('categories')
export class CategoriesController {
  constructor(private readonly ref: ReferenceService) {}
  @Delete(':id') @RequirePermission('products.update') archive(@Param('id') id:string,@Request() req:{actor:Actor}) {return this.ref.archive('category',id,req.actor.id);}
  @Get() @RequirePermission('products.read') list() { return this.ref.list('category'); }
  @Post() @RequirePermission('products.create') create(@Body() body: NameDto, @Request() req: { actor: Actor }) { return this.ref.create('category', body, req.actor.id); }
  @Patch(':id') @RequirePermission('products.update') update(@Param('id') id: string, @Body() body: UpdateNameDto, @Request() req: { actor: Actor }) { return this.ref.update('category', id, body, req.actor.id); }
}
@ApiTags('units') @ApiBearerAuth() @Controller('units')
export class UnitsController {
  constructor(private readonly ref: ReferenceService) {}
  @Delete(':id') @RequirePermission('products.update') archive(@Param('id') id:string,@Request() req:{actor:Actor}) {return this.ref.archive('unit',id,req.actor.id);}
  @Get() @RequirePermission('products.read') list() { return this.ref.list('unit'); }
  @Post() @RequirePermission('products.create') create(@Body() body: NameDto, @Request() req: { actor: Actor }) { return this.ref.create('unit', body, req.actor.id); }
  @Patch(':id') @RequirePermission('products.update') update(@Param('id') id: string, @Body() body: UpdateNameDto, @Request() req: { actor: Actor }) { return this.ref.update('unit', id, body, req.actor.id); }
}
@ApiTags('brands') @ApiBearerAuth() @Controller('brands')
export class BrandsController {
  constructor(private readonly ref: ReferenceService) {}
  @Delete(':id') @RequirePermission('products.update') archive(@Param('id') id:string,@Request() req:{actor:Actor}) {return this.ref.archive('brand',id,req.actor.id);}
  @Get() @RequirePermission('products.read') list() { return this.ref.list('brand'); }
  @Post() @RequirePermission('products.create') create(@Body() body: NameDto, @Request() req: { actor: Actor }) { return this.ref.create('brand', body, req.actor.id); }
  @Patch(':id') @RequirePermission('products.update') update(@Param('id') id: string, @Body() body: UpdateNameDto, @Request() req: { actor: Actor }) { return this.ref.update('brand', id, body, req.actor.id); }
}

function nonnegative(value: string | undefined, field: string): Prisma.Decimal | undefined {
  if (value === undefined) return undefined;
  const parsed = new Prisma.Decimal(value);
  if (parsed.isNegative() || !parsed.isFinite()) throw new BadRequestException(`${field} doit être positif ou nul.`);
  return parsed;
}

@ApiTags('products') @ApiBearerAuth() @Controller('products')
export class ProductsController {
  constructor(private readonly db: PrismaService) {}
  @Get() @RequirePermission('products.read') @ApiOperation({ summary: 'Produits paginés, recherche par nom, référence et code-barres' })
  async list(@Query() query: PageDto) {
    const { page, pageSize, skip } = parsePage(query);
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } : {};
    const [items, total] = await this.db.$transaction([this.db.product.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' }, include: { category: true, unit: true, brand: true } }), this.db.product.count({ where })]);
    return { items, total, page, pageSize };
  }
  @Get(':id') @RequirePermission('products.read')
  async one(@Param('id') id: string) {
    const product = await this.db.product.findUnique({ where: { id }, include: { category: true, unit: true, brand: true } });
    if (!product) throw new NotFoundException('Produit introuvable.');
    return product;
  }
  @Post() @RequirePermission('products.create') @ApiOperation({ summary: 'Créer un produit sans mouvement ni quantité initiale' })
  async create(@Body() body: CreateProductDto, @Request() req: { actor: Actor }) {
    const category = await this.db.category.findUnique({ where: { id: body.categoryId } });
    const unit = await this.db.unit.findUnique({ where: { id: body.unitId } });
    if (!category?.active || !unit?.active) throw new BadRequestException('Catégorie ou unité inactive/introuvable.');
    if (body.brandId && !(await this.db.brand.findUnique({ where: { id: body.brandId } }))?.active) throw new BadRequestException('Marque inactive/introuvable.');
    const { supplierPrice, salePrice, lowStockThreshold, reason, ...rest } = body;
    return this.db.$transaction(async tx => {
      const stockRules=await readSettings(tx,'stock');
      const product = await tx.product.create({ data: { ...rest, supplierPrice: supplierPrice === null ? null : nonnegative(supplierPrice, 'supplierPrice'), salePrice: nonnegative(salePrice, 'salePrice'), lowStockThreshold: nonnegative(lowStockThreshold, 'lowStockThreshold') ?? new Prisma.Decimal(stockRules.seuilParDefautDeStockFaible) } });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'product.create', entityType: 'Product', entityId: product.id, newValue: JSON.parse(JSON.stringify(product)) } });
      return product;
    });
  }
  @Patch(':id') @RequirePermission('products.update') @ApiOperation({ summary: 'Modifier les métadonnées ; les prix suivent une opération dédiée' })
  async update(@Param('id') id: string, @Body() body: UpdateProductDto, @Request() req: { actor: Actor }) {
    const { lowStockThreshold, supplierPrice, salePrice, reason, ...rest } = body;
    return this.db.$transaction(async tx => {
      const before = await tx.product.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Produit introuvable.');
      const supplier = supplierPrice === null ? null : nonnegative(supplierPrice, 'supplierPrice');
      const selling = nonnegative(salePrice, 'salePrice');
      const changedSupplier = supplierPrice !== undefined && (supplier === null ? before.supplierPrice !== null : !supplier!.equals(before.supplierPrice ?? -1));
      const changedSelling = selling !== undefined && !selling.equals(before.salePrice ?? -1);
      if (changedSupplier || changedSelling) {
        if (!req.actor.permissions.includes('products.price.update')) throw new ForbiddenException('Permission requise : products.price.update');
        if (!reason?.trim()) throw new BadRequestException('Motif du changement de prix requis.');
        for (const [kind, oldPrice, newPrice] of [['supplier', before.supplierPrice, supplier], ['sale', before.salePrice, selling]] as const) {
          if (newPrice !== undefined && newPrice !== null && !(oldPrice?.equals(newPrice) ?? false)) await tx.priceChange.create({ data: { productId: id, kind, oldPrice, newPrice, origin: 'catalogue', userId: req.actor.id } });
        }
      }
      if (rest.categoryId && !(await tx.category.findUnique({ where: { id: rest.categoryId } }))?.active) throw new BadRequestException('Catégorie invalide.');
      if (rest.unitId && !(await tx.unit.findUnique({ where: { id: rest.unitId } }))?.active) throw new BadRequestException('Unité invalide.');
      const updated = await tx.product.update({ where: { id }, data: { ...rest, supplierPrice: supplier, salePrice: selling, lowStockThreshold: nonnegative(lowStockThreshold, 'lowStockThreshold') } });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'product.update', entityType: 'Product', entityId: id, oldValue: JSON.parse(JSON.stringify(before)), newValue: JSON.parse(JSON.stringify(updated)) } });
      return updated;
    });
  }
}

@ApiTags('stock') @ApiBearerAuth() @Controller('stock')
export class StockController {
  constructor(private readonly db: PrismaService, private readonly access: ShopAccess) {}
  @Get() @RequirePermission('stock.read') @ApiOperation({ summary: 'Solde validé par produit et magasin ; aucun stock créé par le catalogue' })
  async list(@Query('shopId') shopId: string, @Query('productId') productId: string | undefined, @Request() req: { actor: Actor }) {
    this.access.assert(req.actor, shopId);
    const shop = await this.db.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Magasin introuvable.');
    const products = await this.db.product.findMany({ where: { id: productId, active: true }, include: { category: true, unit: true, balances: { where: { shopId } }, prices: { where: { shopId } } }, orderBy: { name: 'asc' } });
    return products.map(({ balances, prices, ...product }) => ({ productId: product.id, shopId, quantity: balances[0]?.quantity ?? new Prisma.Decimal(0), product: { ...product, salePrice: prices[0]?.price ?? product.salePrice }, shopName: shop.name }));
  }
}
