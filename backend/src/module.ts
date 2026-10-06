import { LegacyController } from './legacy';
import { SupplierPriceReviewController } from './supplier-price-review';
import { ProductDetailsController } from './product-details';
import { CashJournalsController } from './cash-journals';
import { ApplicationSettingsController, PreferencesController } from './application-settings';
import { HistoryController } from './history';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AuthGuard, ShopAccess } from './auth';
import { BrandsController, CategoriesController, ProductsController, ReferenceService, ShopsController, StockController, UnitsController } from './catalog';
import { PrismaService } from './prisma.service';
import { PermissionsController, RolesController, UsersController } from './users';
import { OperationsController, OperationsService } from './operations';
import { MediaController } from './media';
import { SettingsController } from './settings';
import { ReportsController, ReportsService } from './reports';
import { InvoicesController, InvoicesService } from './invoices';
import { BackupsController, BackupsService } from './backups';
import { CustomersController, CustomersService } from './customers';
import { FinanceService, ExpensesController, RemittancesController, SupplierInvoicesController, FinanceReportsController } from './finance';
import { AuditController, AuditService } from './audit';
import { FinanceMediaController } from './finance-media';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '15m', issuer: 'stockflow' }, verifyOptions: { issuer: 'stockflow' } })],
  controllers: [LegacyController, SupplierPriceReviewController, ProductDetailsController, PreferencesController, CashJournalsController, ApplicationSettingsController, HistoryController, AuthController, UsersController, RolesController, PermissionsController, ShopsController, CategoriesController, UnitsController, BrandsController, ProductsController, StockController, OperationsController, MediaController, SettingsController, FinanceReportsController, ReportsController, InvoicesController, BackupsController, CustomersController, ExpensesController, RemittancesController, SupplierInvoicesController, AuditController, FinanceMediaController],
  providers: [PrismaService, ShopAccess, ReferenceService, OperationsService, ReportsService, InvoicesService, BackupsService, CustomersService, FinanceService, AuditService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
