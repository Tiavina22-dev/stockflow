import { Controller, Get, Injectable, Logger, OnModuleDestroy, OnModuleInit, Post, ServiceUnavailableException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { RequirePermission } from './auth';

const runFile = promisify(execFile);
@Injectable()
export class BackupsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(BackupsService.name);
  async command(...args: string[]) {
    try {
      const { stdout } = await runFile(process.execPath, [resolve('scripts/backup.mjs'), ...args], { cwd: process.cwd(), windowsHide: true, timeout: 900000, maxBuffer: 1024 * 1024 });
      return JSON.parse(stdout);
    } catch { throw new ServiceUnavailableException('Sauvegarde indisponible ; consulter son état et les outils PostgreSQL.'); }
  }
  onModuleInit() {
    if (process.env.BACKUPS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return;
    const tick = () => { void this.command('--due').catch(() => this.logger.error('Échec de sauvegarde automatique.')); };
    tick(); this.timer = setInterval(tick, 3600000); this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
@ApiTags('backups') @ApiBearerAuth() @Controller('settings/backups')
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}
  @Get() @RequirePermission('settings.read') @ApiOperation({ summary: 'Destination locale, calendrier et derniers résultats de sauvegarde' })
  status() { return this.backups.command('--status'); }
  @Post('run') @RequirePermission('settings.update') @ApiOperation({ summary: 'Sauvegarder PostgreSQL et les fichiers dans Documents sans purger les archives' })
  run() { return this.backups.command(); }
}
