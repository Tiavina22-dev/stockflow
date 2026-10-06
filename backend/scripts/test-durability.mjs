import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const url=new URL(process.env.DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.port!=='55432') throw Error('Base locale dédiée requise');
url.pathname='/stockflow_test';
const observer=new pg.Client({connectionString:url.toString()}); await observer.connect();
for(const setting of ['fsync','synchronous_commit','full_page_writes']) assert.equal((await observer.query(`SHOW ${setting}`)).rows[0][setting],'on');
const writer=new pg.Client({connectionString:url.toString()}); writer.on('error',()=>{}); await writer.connect();
const code=randomUUID();
await writer.query('BEGIN');
await writer.query('INSERT INTO "Role" (id,code,name) VALUES ($1,$2,$2)',[randomUUID(),code]);
writer.connection.stream.destroy();
let cleared=false;
for(let attempt=0;attempt<20;attempt++) {
 const row=await observer.query('SELECT count(*)::int AS n FROM "Role" WHERE code=$1',[code]);
 assert.equal(row.rows[0].n,0);
 const active=await observer.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE state=$1 AND query LIKE $2',['idle in transaction','INSERT INTO "Role"%']);
 if(!active.rows[0].n){cleared=true;break;}
 await new Promise(resolve=>setTimeout(resolve,50));
}
assert.ok(cleared); await observer.end();
console.log('WAL durable activé ; interruption de connexion avant COMMIT : écriture annulée.');
