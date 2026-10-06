import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ArrayUnique, IsBoolean, IsEmail, IsNumberString, IsOptional, IsString, IsUUID, Length, MinLength } from 'class-validator';

export class CreateShopDto {
 @IsOptional() @IsString() managerName?:string;
 @IsOptional() @IsEmail() email?:string|null;
 @IsOptional() @IsBoolean() active?:boolean;
  @ApiProperty() @IsString() @MinLength(2) code: string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMain?: boolean;
}
export class UpdateShopDto {
 @IsOptional() @IsString() @MinLength(2) code?:string;
 @IsOptional() @IsBoolean() isMain?:boolean;
 @IsOptional() @IsString() managerName?:string;
 @IsOptional() @IsEmail() email?:string|null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
export class NameDto {
 @IsOptional() @IsString() description?:string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
}
export class UpdateNameDto {
 @IsOptional() @IsString() description?:string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
export class CreateUserDto {
 @IsOptional() @IsString() phone?:string;
 @IsOptional() @IsBoolean() active?:boolean;
 @IsOptional() @IsArray() @ArrayUnique() @IsString({each:true}) permissionCodes?:string[];
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty() @IsString() @MinLength(3) login: string;
  @ApiProperty() @IsString() @MinLength(12) password: string;
  @ApiProperty() @IsUUID() roleId: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string|null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() primaryShopId?: string;
}
export class UpdateUserDto {
 @IsOptional() @IsString() @MinLength(3) login?:string;
 @IsOptional() @IsString() phone?:string;
 @IsOptional() @IsUUID() primaryShopId?:string|null;
 @IsOptional() @IsString() @MinLength(12) password?:string;
 @IsOptional() @IsArray() @ArrayUnique() @IsString({each:true}) permissionCodes?:string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string|null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
}
export class CreateProductDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() reason?: string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty() @IsString() @MinLength(1) reference: string;
  @ApiProperty() @IsUUID() categoryId: string;
  @ApiProperty() @IsUUID() unitId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() supplierPrice?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() salePrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() lowStockThreshold?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateProductDto {
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsNumberString() supplierPrice?: string | null;
  @IsOptional() @IsNumberString() salePrice?: string;
  @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() lowStockThreshold?: string;
}
export class PageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pageSize?: string;
}
export function pagination(query: PageDto) {
  const page = Number(query.page ?? '1');
  const pageSize = Number(query.pageSize ?? '25');
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('Pagination invalide.');
  return { page, pageSize, skip: (page - 1) * pageSize };
}
