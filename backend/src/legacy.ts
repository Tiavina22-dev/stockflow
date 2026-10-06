import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Query, Request, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor, RequirePermission } from './auth';
import { PrismaService } from './prisma.service';
import { Response } from 'express';
import { resolve, sep, basename } from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

@ApiTags('legacy-migration') @ApiBearerAuth() @Controller('legacy')
export class LegacyController {
  constructor(private readonly db: PrismaService) {}
  private authorize(actor: Actor) {
    if (!actor.permissions.includes('shops.all')) throw new ForbiddenException('Les archives historiques exigent un accès à tous les magasins.');
  }
  @Get('imports') @RequirePermission('audit.read') @ApiOperation({ summary: 'Résumé des imports historiques ; audit.read et shops.all requis' })
  imports(@Request() req: {actor: Actor}) {
    this.authorize(req.actor); return this.db.$queryRaw`SELECT * FROM "LegacyImport" ORDER BY "createdAt" DESC`;
  }
  @Get('records') @RequirePermission('audit.read') @ApiOperation({ summary: 'Archives et anomalies ; paramètres table, sourceHash, page, classification' })
  records(@Query('table') table: string, @Query('sourceHash') hash: string, @Query('page') page: string, @Query('classification') classification: string, @Request() req: {actor: Actor}) {
    this.authorize(req.actor); const n=Number(page??1);
    if (!/^[a-z_0-9]+$/.test(table??'') || !/^[a-f0-9]{64}$/.test(hash??'') || !Number.isSafeInteger(n) || n<1 || n>10000) throw new BadRequestException('Table, sourceHash et page valides requis.');
    return this.db.$queryRaw`SELECT id,"sourceTable","sourceKey",payload,"targetId",classification FROM "LegacyRecord"
      WHERE "sourceHash"=${hash} AND "sourceTable"=${table} AND (${classification??''}='' OR classification=${classification??''})
      ORDER BY "sourceKey" LIMIT 100 OFFSET ${(n-1)*100}`;
  }
  @Get('files') @RequirePermission('audit.read') @ApiOperation({ summary: 'Justificatifs disponibles ; sourceHash, page ; dossiers source dans recap_vente.directory' })
  async files(@Query('sourceHash') hash: string, @Query('page') page: string, @Request() req: {actor: Actor}) {
    this.authorize(req.actor);const n=Number(page??1);
    if(!/^[a-f0-9]{64}$/.test(hash??'')||!Number.isSafeInteger(n)||n<1||n>10000)throw new BadRequestException('sourceHash et page valides requis.');
    const rows=await this.db.$queryRaw<Array<{id:string;relativePath:string;sha256:string;size:bigint}>>`SELECT id,"relativePath",sha256,size FROM "LegacyFile" WHERE "sourceHash"=${hash} ORDER BY "relativePath" LIMIT 100 OFFSET ${(n-1)*100}`;
    return rows.map(r=>({...r,size:r.size.toString()}));
  }
  @Get('files/:id') @RequirePermission('audit.read') @ApiOperation({ summary: 'Téléchargement privé d’un justificatif historique' })
  async download(@Param('id') id:string,@Request() req:{actor:Actor},@Res() res:Response) {
    this.authorize(req.actor);if(!/^[a-f0-9-]{36}$/.test(id))throw new NotFoundException();
    const rows=await this.db.$queryRaw<Array<{location:string;relativePath:string}>>`SELECT location,"relativePath" FROM "LegacyFile" WHERE id=${id}::uuid`;
    if(!rows[0])throw new NotFoundException();
    const root=resolve(process.env.UPLOAD_DIR??'.local/uploads'),file=resolve(root,rows[0].location);
    if(!file.startsWith(root+sep))throw new NotFoundException();
    try{await stat(file);}catch{throw new NotFoundException('Fichier indisponible.');}
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.attachment(basename(rows[0].relativePath));res.type('application/octet-stream');
    createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }
}
