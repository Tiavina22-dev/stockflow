import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Request } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as argon2 from 'argon2';
import { Actor, RequirePermission, ShopAccess } from './auth';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PrismaService } from './prisma.service';

const safeUser = { id: true, name: true, login: true, email: true, phone: true, photoUrl: true, lastActiveAt: true, active: true, roleId: true, primaryShopId: true, createdAt: true, updatedAt: true, role: { include: { permissions: { include: { permission: true } } } }, shops: true, permissionOverrides: { include: { permission: true } } } as const;
// Only this subset is editable in the current UI. Other permissions remain role controlled.
export const editablePermissions = ['sales.create','sales.read','sales.cancel','stock.read','stock.adjust','stock.transfer','products.read','products.update','products.create','reports.read','reports.export','shops.all'];
async function assign(tx: Prisma.TransactionClient, id: string, shopId: string|null|undefined, codes?: string[]) {
  if (shopId !== undefined) {
    if (shopId && !(await tx.shop.findUnique({where:{id:shopId}}))?.active) throw new BadRequestException('Magasin actif requis.');
    await tx.userShop.deleteMany({where:{userId:id}});
    if (shopId) await tx.userShop.create({data:{userId:id,shopId}});
  }
  if (codes) {
    if (codes.some(code=>!editablePermissions.includes(code))) throw new BadRequestException('Permission non modifiable dans ce formulaire.');
    const permissions=await tx.permission.findMany({where:{code:{in:editablePermissions}}});
    await tx.userPermission.deleteMany({where:{userId:id}});
    await tx.userPermission.createMany({data:permissions.map(p=>({userId:id,permissionId:p.id,allowed:codes.includes(p.code)}))});
  }
}

@ApiTags('users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private readonly db: PrismaService, private readonly access: ShopAccess) {}
  @Get() @RequirePermission('users.read') @ApiOperation({ summary: 'Utilisateurs sans hash' })
  list() { return this.db.user.findMany({ select: safeUser, orderBy: { name: 'asc' } }); }
  @Get(':id') @RequirePermission('users.read')
  async one(@Param('id') id: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: safeUser });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }
  @Post() @RequirePermission('users.create') @ApiOperation({ summary: 'Créer un utilisateur avec mot de passe Argon2id' })
  async create(@Body() body: CreateUserDto, @Request() req: { actor: Actor }) {
    if (!req.actor.permissions.includes('users.role.assign')) throw new ForbiddenException('Permission users.role.assign requise.');
    if (body.primaryShopId) this.access.assert(req.actor, body.primaryShopId);
    const { password, permissionCodes, ...input } = body;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    return this.db.$transaction(async tx => {
      const user = await tx.user.create({ data: { ...input, passwordHash }, select: safeUser });
      await assign(tx,user.id,body.primaryShopId??null,permissionCodes);
      const result=await tx.user.findUniqueOrThrow({where:{id:user.id},select:safeUser});
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'user.create', entityType: 'User', entityId: user.id, newValue: JSON.parse(JSON.stringify(result)) } });
      return result;
    });
  }
  @Patch(':id') @RequirePermission('users.update') @ApiOperation({ summary: 'Modifier ou désactiver un compte' })
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @Request() req: { actor: Actor }) {
    if ((body.roleId || body.permissionCodes || body.primaryShopId!==undefined) && !req.actor.permissions.includes('users.role.assign')) throw new ForbiddenException('Permission users.role.assign requise.');
    if(body.primaryShopId) this.access.assert(req.actor,body.primaryShopId);
    const {password,permissionCodes,...input}=body;
    const passwordHash=password?await argon2.hash(password,{type:argon2.argon2id}):undefined;
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(874301)::text`;
      const before = await tx.user.findUnique({ where: { id }, select: safeUser });
      if (!before) throw new NotFoundException('Utilisateur introuvable.');
      if(id===req.actor.id && body.active===false) throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
      if(before.active && before.role.code==='ADMIN' && (body.active===false || body.roleId && body.roleId!==before.roleId) && await tx.user.count({where:{active:true,role:{code:'ADMIN'}}})<=1) throw new BadRequestException('Conservez au moins un administrateur actif.');
      await assign(tx,id,body.primaryShopId,permissionCodes);
      const user = await tx.user.update({ where: { id }, data: {...input,passwordHash,sessionVersion:password?{increment:1}:undefined}, select: safeUser });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'user.update', entityType: 'User', entityId: id, oldValue: JSON.parse(JSON.stringify(before)), newValue: JSON.parse(JSON.stringify(user)) } });
      return user;
    });
  }
  @Post(':id/password-reset') @RequirePermission('users.update') @ApiOperation({summary:'Créer un lien de réinitialisation à transmettre ; aucun email envoyé'})
  async resetLink(@Param('id') id:string,@Request() req:{actor:Actor}) {
    const token=randomBytes(32).toString('base64url'), expiresAt=new Date(Date.now()+30*60*1000);
    await this.db.$transaction(async tx=>{
      const user=await tx.user.findUnique({where:{id}});
      if(!user?.active) throw new NotFoundException('Compte actif introuvable.');
      await tx.passwordResetToken.updateMany({where:{userId:id,usedAt:null},data:{usedAt:new Date()}});
      await tx.passwordResetToken.create({data:{userId:id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt}});
      await tx.auditEvent.create({data:{actorId:req.actor.id,action:'user.password-reset.issue',entityType:'User',entityId:id}});
    });
    return {token,expiresAt};
  }
  @Post(':id/shops/:shopId') @RequirePermission('users.update') @ApiOperation({ summary: 'Autoriser un utilisateur sur un magasin' })
  async grantShop(@Param('id') id: string, @Param('shopId') shopId: string, @Request() req: { actor: Actor }) {
    this.access.assert(req.actor, shopId);
    return this.db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id } });
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!user || !shop) throw new NotFoundException('Utilisateur ou magasin introuvable.');
      const link = await tx.userShop.upsert({ where: { userId_shopId: { userId: id, shopId } }, create: { userId: id, shopId }, update: {} });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'user.shop.grant', entityType: 'UserShop', entityId: `${id}:${shopId}`, shopId, newValue: { userId: id, shopId } } });
      return link;
    });
  }
  @Delete(':id/shops/:shopId') @RequirePermission('users.update') @ApiOperation({ summary: 'Révoquer l’accès à un magasin' })
  async revokeShop(@Param('id') id: string, @Param('shopId') shopId: string, @Request() req: { actor: Actor }) {
    this.access.assert(req.actor, shopId);
    await this.db.$transaction(async tx => {
      const link = await tx.userShop.findUnique({ where: { userId_shopId: { userId: id, shopId } } });
      if (!link) throw new NotFoundException('Accès magasin introuvable.');
      await tx.userShop.delete({ where: { userId_shopId: { userId: id, shopId } } });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'user.shop.revoke', entityType: 'UserShop', entityId: `${id}:${shopId}`, shopId, oldValue: { userId: id, shopId } } });
    });
    return { revoked: true };
  }
}

@ApiTags('roles') @ApiBearerAuth() @Controller('roles')
export class RolesController {
  constructor(private readonly db: PrismaService) {}
  @Get() @RequirePermission('users.read') @ApiOperation({ summary: 'Rôles et codes de permission' })
  list() { return this.db.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { code: 'asc' } }); }
}

@ApiTags('permissions') @ApiBearerAuth() @Controller('permissions')
export class PermissionsController {
  constructor(private readonly db: PrismaService) {}
  @Get() @RequirePermission('users.read')
  list() { return this.db.permission.findMany({ orderBy: { code: 'asc' } }); }
}
