import 'reflect-metadata';
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service';

const permissions = ['shops.all', 'shops.read', 'shops.create', 'shops.update', 'users.read', 'users.create', 'users.update', 'users.role.assign', 'products.read', 'products.create', 'products.update', 'products.price.update', 'stock.read', 'stock.in', 'stock.out', 'stock.transfer', 'stock.inventory', 'stock.adjust', 'stock.return', 'sales.read', 'sales.create', 'sales.validate', 'sales.cancel', 'sales.correct', 'reports.read', 'reports.export', 'settings.read', 'settings.update', 'audit.read', 'invoices.read', 'invoices.create', 'customers.read', 'customers.create', 'customers.update', 'expenses.read', 'expenses.create', 'expenses.validate', 'expenses.cancel', 'remittances.read', 'remittances.create', 'remittances.validate', 'remittances.cancel', 'supplier-invoices.read', 'supplier-invoices.create', 'supplier-invoices.validate', 'supplier-invoices.cancel'];
const roles = ['ADMIN', 'RESPONSABLE', 'VENDEUR', 'GESTIONNAIRE_STOCK', 'COMPTABLE', 'RESPONSABLE_SAISIE'];

async function main() {
  const login = process.env.ADMIN_LOGIN;
  const password = process.env.ADMIN_PASSWORD;
  const minimumLength = process.env.LOCAL_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production' ? 8 : 12;
  if (!login || !password || password.length < minimumLength) throw new Error(`ADMIN_LOGIN et ADMIN_PASSWORD (${minimumLength} caractères minimum) requis.`);
  const db = new PrismaService();
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    await db.$transaction(async tx => {
      for (const code of permissions) await tx.permission.upsert({ where: { code }, create: { code }, update: {} });
      for (const code of roles) await tx.role.upsert({ where: { code }, create: { code, name: code }, update: {} });
      const admin = await tx.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
      const all = await tx.permission.findMany();
      for (const permission of all) await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: admin.id, permissionId: permission.id } }, create: { roleId: admin.id, permissionId: permission.id }, update: {} });
      const matrices: Record<string, string[]> = {
        COMPTABLE: permissions.filter(p => !p.startsWith('users.') && !p.startsWith('settings.') && !['shops.all', 'shops.create', 'shops.update'].includes(p)),
        RESPONSABLE_SAISIE: ['shops.read', 'products.read', 'products.create', 'products.update', 'stock.read', 'stock.in', 'stock.out', 'stock.return', 'stock.transfer', 'sales.read', 'sales.create', 'sales.validate', 'reports.read', 'audit.read', 'customers.read', 'customers.create', 'customers.update', 'expenses.read', 'expenses.create', 'remittances.read', 'remittances.create', 'supplier-invoices.read', 'supplier-invoices.create'],
      };
      for (const [code, grants] of Object.entries(matrices)) {
        const role = await tx.role.findUniqueOrThrow({ where: { code } });
        for (const permission of all.filter(p => grants.includes(p.code))) await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, create: { roleId: role.id, permissionId: permission.id }, update: {} });
      }
      const existing = await tx.user.findUnique({ where: { login } });
      if (!existing) await tx.user.create({ data: { name: 'Administrateur', login, passwordHash, roleId: admin.id } });
    }, { timeout: 60000 });
  } finally { await db.$disconnect(); }
}
void main();
