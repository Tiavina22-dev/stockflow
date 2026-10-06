import { Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Actor, RequirePermission } from './auth';
import { PrismaService } from './prisma.service';

export class StockSettingsDto { @IsBoolean() allowNegativeStock: boolean; }
export class CompanySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(150) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) nif?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) stat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) rcs?: string;
  @ApiPropertyOptional({ default: 'Ar' }) @IsOptional() @IsString() @MinLength(1) @MaxLength(8) currencyLabel?: string;
  @ApiPropertyOptional({ enum: [5, 20] }) @IsOptional() @IsIn([5, 20]) taxRate?: number;
}

@ApiTags('settings') @ApiBearerAuth() @Controller('settings')
export class SettingsController {
  constructor(private readonly db: PrismaService) {}
  @Get('stock') @RequirePermission('settings.read') get() { return this.db.stockSettings.upsert({ where: { id: 'global' }, create: {}, update: {} }); }
  @Patch('stock') @RequirePermission('settings.update') update(@Body() body: StockSettingsDto, @Request() req: { actor: Actor }) {
    return this.db.$transaction(async tx => {
      const before = await tx.stockSettings.upsert({ where: { id: 'global' }, create: {}, update: {} });
      const updated = await tx.stockSettings.update({ where: { id: 'global' }, data: body });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'settings.stock', entityType: 'StockSettings', entityId: 'global', oldValue: before, newValue: updated } });
      return updated;
    });
  }
  @Get('company') @RequirePermission('settings.read') async company() {
    const settings = await this.db.companySettings.upsert({ where: { id: 'global' }, create: {}, update: {} });
    return { ...settings, amountDecimals: 2, timeZone: 'Indian/Antananarivo', hideTaxOnPrint: settings.taxRate.equals(5) };
  }
  @Patch('company') @RequirePermission('settings.update') async updateCompany(@Body() body: CompanySettingsDto, @Request() req: { actor: Actor }) {
    return this.db.$transaction(async tx => {
      const before = await tx.companySettings.upsert({ where: { id: 'global' }, create: {}, update: {} });
      const updated = await tx.companySettings.update({ where: { id: 'global' }, data: body });
      await tx.auditEvent.create({ data: { actorId: req.actor.id, action: 'settings.company', entityType: 'CompanySettings', entityId: 'global', oldValue: JSON.parse(JSON.stringify(before)), newValue: JSON.parse(JSON.stringify(updated)) } });
      return updated;
    });
  }
}
