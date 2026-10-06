import { CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Post, Request, SetMetadata, UnauthorizedException, Body, BadRequestException, HttpException, applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiExtension, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';

export const Public = () => SetMetadata('public', true);
export const RequirePermission = (code: string) => applyDecorators(
  SetMetadata('permission', code), ApiExtension('x-required-permission', code),
  ApiResponse({ status: 401, description: 'Jeton absent, invalide ou compte désactivé.' }),
  ApiResponse({ status: 403, description: 'Permission ou périmètre magasin insuffisant.' }),
);
export type Actor = { id: string; name: string; login: string; role: string; permissions: string[]; shopIds: string[] };

export class ResetPasswordDto {
 @ApiProperty() @IsString() @MinLength(32) @MaxLength(128) token:string;
 @ApiProperty({minLength:12,maxLength:128}) @IsString() @MinLength(12) @MaxLength(128) password:string;
}

export class LoginDto {
  @ApiProperty() @IsString() @MaxLength(100) login: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) password: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string }; actor?: Actor }>();
    const token = /^Bearer (.+)$/i.exec(req.headers.authorization ?? '')?.[1];
    if (!token) throw new UnauthorizedException('Jeton manquant.');
    let id: string; let sessionVersion = 0;
    try { const claims = await this.jwt.verifyAsync<{ sub: string; ver?: number }>(token); id = claims.sub; sessionVersion = claims.ver ?? 0; } catch { throw new UnauthorizedException('Jeton invalide ou expiré.'); }
    if (!id) throw new UnauthorizedException('Jeton invalide.');
    const user = await this.db.user.findUnique({ where: { id }, include: { role: { include: { permissions: { include: { permission: true } } } }, shops: true, permissionOverrides: { include: { permission: true } } } });
    if (!user?.active || (user.sessionVersion ?? 0) !== sessionVersion) throw new UnauthorizedException('Compte indisponible.');
    req.actor = { id: user.id, name: user.name, login: user.login, role: user.role.code, permissions: effectivePermissions(user), shopIds: user.shops.map(row => row.shopId) };
    const needed = this.reflector.getAllAndOverride<string>('permission', [context.getHandler(), context.getClass()]);
    if (needed && !req.actor.permissions.includes(needed)) throw new ForbiddenException(`Permission requise : ${needed}`);
    return true;
  }
}

@Injectable()
export class ShopAccess {
  assert(actor: Actor, shopId: string) {
    if (!shopId) throw new BadRequestException('shopId requis.');
    if (!actor.permissions.includes('shops.all') && !actor.shopIds.includes(shopId)) throw new ForbiddenException('Accès au magasin refusé.');
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly attempts=new Map<string,{count:number;until:number}>();
  limit(key:string) {
    const now=Date.now();for(const [k,v] of this.attempts) if(v.until<=now) this.attempts.delete(k);
    const value=this.attempts.get(key)??{count:0,until:now+5*60*1000};
    if(value.count>=30||this.attempts.size>=10000) throw new HttpException('Trop de tentatives. Réessayez dans quelques minutes.',429);
    value.count++;this.attempts.set(key,value);
  }
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService) {}
  @Public() @Post('login') @ApiOperation({ summary: 'Connexion ; renvoie un JWT de 15 minutes' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides.' })
  async login(@Body() body: LoginDto,@Request() req?:{ip?:string}) {
    this.limit(`login:${req?.ip??'local'}`);
    const user = await this.db.user.findUnique({ where: { login: body.login } });
    if (!user?.active || !(await argon2.verify(user.passwordHash, body.password))) throw new UnauthorizedException('Identifiants invalides.');
    await this.db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return { accessToken: await this.jwt.signAsync({ sub: user.id, ver: user.sessionVersion }), tokenType: 'Bearer', expiresIn: 900,
      user: { id: user.id, name: user.name, login: user.login } };
  }
  @Post('logout') @ApiBearerAuth() @ApiOperation({summary:'Révoquer les sessions du compte courant'})
  async logout(@Request() req: {actor:Actor}) {
    await this.db.user.update({where:{id:req.actor.id},data:{sessionVersion:{increment:1}}});
    return {loggedOut:true};
  }
  @Public() @Post('reset-password') @ApiOperation({summary:'Consommer un lien administrateur, valable 30 minutes et une seule fois'})
  async reset(@Body() body: ResetPasswordDto,@Request() req?:{ip?:string}) {
    this.limit(`reset:${req?.ip??'local'}`);
    const tokenHash=createHash('sha256').update(body.token).digest('hex');
    const preliminary=await this.db.passwordResetToken.findUnique({where:{tokenHash},include:{user:true}});
    if(!preliminary?.user.active || preliminary.usedAt || preliminary.expiresAt<=new Date()) throw new BadRequestException('Lien invalide ou expiré.');
    const passwordHash=await argon2.hash(body.password,{type:argon2.argon2id});
    await this.db.$transaction(async tx=>{
      const reset=await tx.passwordResetToken.findUnique({where:{tokenHash},include:{user:true}});
      if(!reset || !reset.user.active) throw new BadRequestException('Lien invalide ou expiré.');
      const consumed=await tx.passwordResetToken.updateMany({where:{id:reset.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
      if(consumed.count!==1) throw new BadRequestException('Lien invalide ou expiré.');
      await tx.user.update({where:{id:reset.userId},data:{passwordHash,sessionVersion:{increment:1}}});
      await tx.passwordResetToken.updateMany({where:{userId:reset.userId,usedAt:null},data:{usedAt:new Date()}});
      await tx.auditEvent.create({data:{actorId:reset.userId,action:'user.password.reset',entityType:'User',entityId:reset.userId}});
    });
    return {reset:true};
  }
  @Get('me') @ApiBearerAuth() @ApiOperation({ summary: 'Profil courant sans hash de mot de passe' })
  me(@Request() req: { actor: Actor }) { return req.actor; }
}

export function effectivePermissions(user: {role:{permissions:{permission:{code:string}}[]}; permissionOverrides?:{allowed:boolean;permission:{code:string}}[]}) {
 const codes=new Set(user.role.permissions.map(row=>row.permission.code));
 for(const row of user.permissionOverrides??[]) { if(row.allowed) codes.add(row.permission.code); else codes.delete(row.permission.code); }
 return [...codes];
}
