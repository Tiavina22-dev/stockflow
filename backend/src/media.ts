import { BadRequestException, Controller, Get, Param, Post, Request, UploadedFile, UseInterceptors, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { Actor, Public, RequirePermission } from './auth';
import { PrismaService } from './prisma.service';
const folder = resolve(process.env.UPLOAD_DIR ?? '.local/uploads');
@Controller()
export class MediaController {
  constructor(private readonly db: PrismaService) {}
  @Post('users/:id/photo') @RequirePermission('users.update')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async userUpload(@Param('id') id:string,@UploadedFile() file:{buffer:Buffer}|undefined,@Request() req:{actor:Actor}) {
    if(!file) throw new BadRequestException('Photo requise.');
    const b=file.buffer,ext=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':b[0]===255&&b[1]===216&&b[2]===255?'jpg':null;
    if(!ext) throw new BadRequestException('Photo JPG ou PNG requise.');
    const user=await this.db.user.findUnique({where:{id}});if(!user) throw new NotFoundException('Utilisateur introuvable.');
    const name=`${randomUUID()}.${ext}`;
    await mkdir(resolve(folder,'users'),{recursive:true});await writeFile(resolve(folder,'users',name),b,{flag:'wx'});
    await this.db.$transaction(async tx=>{
      await tx.user.update({where:{id},data:{photoUrl:name}});
      await tx.auditEvent.create({data:{actorId:req.actor.id,action:'user.photo',entityType:'User',entityId:id,oldValue:{photoUrl:user.photoUrl},newValue:{photoUrl:name}}});
    });return {saved:true};
  }
  @Get('users/:id/photo') @RequirePermission('users.read')
  async userPhoto(@Param('id') id:string,@Res() res:Response) {
    const u=await this.db.user.findUnique({where:{id},select:{photoUrl:true}});
    if(!u?.photoUrl||!/^[a-f0-9-]{36}\.(png|jpg)$/.test(u.photoUrl)) throw new NotFoundException('Photo indisponible.');
    let b:Buffer;try{b=await readFile(resolve(folder,'users',u.photoUrl));}catch{throw new NotFoundException('Photo indisponible.');}
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.type(u.photoUrl.endsWith('.png')?'png':'jpg').send(b);
  }
  @Post('products/:id/photo') @RequirePermission('products.update')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async upload(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined, @Request() req: { actor: Actor }) {
    if (!file) throw new BadRequestException('Photo requise.');
    const b = file.buffer;
    const extension = b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'jpg' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null;
    if (!extension) throw new BadRequestException('Photo PNG, JPG ou WEBP requise.');
    if (!(await this.db.product.findUnique({ where: { id } }))) throw new NotFoundException('Produit introuvable.');
    const name = `${randomUUID()}.${extension}`;
    await mkdir(folder, { recursive: true }); await writeFile(resolve(folder, name), b, { flag: 'wx' });
    const photoUrl = `${process.env.PUBLIC_API_URL ?? 'http://127.0.0.1:3001/api/v1'}/media/${name}`;
    return this.db.$transaction(async tx => {
      const before = await tx.product.findUniqueOrThrow({ where: { id } });
      await tx.product.update({ where: { id }, data: { photoUrl } });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'product.photo', entityType: 'Product', entityId: id, oldValue: { photoUrl: before.photoUrl }, newValue: { photoUrl } } });
      return { photoUrl };
    });
  }
  @Public() @Get('media/:name') async photo(@Param('name') name: string, @Res() res: Response) {
    if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(name)) throw new NotFoundException();
    let data: Buffer; try { data = await readFile(resolve(folder, name)); } catch { throw new NotFoundException(); }
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.type(name.split('.').pop()!); res.send(data);
  }
}
