// Base de développement Windows, dédiée au projet. Aucun changement dans l'ancien SQL.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { initdb, pg_ctl } from '@embedded-postgres/windows-x64';
import pg from 'pg';

const data = resolve('.local/postgres');
mkdirSync(resolve('.local'), { recursive: true });
const envPath = resolve('.env');
if (!existsSync(envPath)) {
  const password = randomBytes(24).toString('hex');
  writeFileSync(envPath, `DATABASE_URL="postgresql://stockflow:${password}@127.0.0.1:55432/stockflow?schema=public"\nJWT_SECRET="${randomBytes(48).toString('hex')}"\nADMIN_LOGIN="admin"\nADMIN_PASSWORD="${randomBytes(24).toString('hex')}"\nPORT=3001\nCORS_ORIGIN="http://localhost:5173,http://127.0.0.1:5173"\nLOCAL_DEV_AUTH=true\n`);
}
const env = readFileSync(envPath, 'utf8');
const url = new URL(/^DATABASE_URL="?([^"\r\n]+)/m.exec(env)?.[1] ?? '');
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/stockflow') throw new Error('Ce script est réservé à la base locale dédiée sur le port 55432.');
const passwordPath = resolve('.local/init-password');
if (!existsSync(resolve(data, 'PG_VERSION'))) {
  writeFileSync(passwordPath, decodeURIComponent(url.password));
  execFileSync(initdb, ['-D', data, '-U', 'stockflow', '--pwfile', passwordPath, '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C'], { windowsHide: true, stdio: 'pipe' });
  writeFileSync(passwordPath, '');
}
try { execFileSync(pg_ctl, ['status', '-D', data], { windowsHide: true, stdio: 'pipe' }); }
catch { execFileSync(pg_ctl, ['start', '-D', data, '-l', resolve('.local/postgres.log'), '-o', '-h 127.0.0.1 -p 55432', '-w'], { windowsHide: true, stdio: 'ignore' }); }
const client = new pg.Client({ host: '127.0.0.1', port: 55432, user: 'stockflow', password: decodeURIComponent(url.password), database: 'postgres' });
await client.connect();
if (!(await client.query("SELECT 1 FROM pg_database WHERE datname = 'stockflow'")).rowCount) await client.query('CREATE DATABASE stockflow');
await client.end();
console.log('PostgreSQL local prêt sur 127.0.0.1:55432 ; secrets conservés dans backend/.env.');
