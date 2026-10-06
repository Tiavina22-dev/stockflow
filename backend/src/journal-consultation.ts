import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, SchemaObject } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { Actor, ShopAccess } from './auth';
import { PrismaService } from './prisma.service';
import { pageValues } from './customers';
import { period } from './finance';

export class JournalConsultationQuery {
 @IsOptional() @IsUUID() magasinId?:string;
 @IsOptional() @IsUUID() utilisateurId?:string;
 @IsString() du:string;
 @IsString() au:string;
 @IsOptional() @IsString() @MaxLength(200) recherche?:string;
 @IsOptional() @IsIn(['date','numero','magasin','totalVentes','depenses','versement','ecart']) colonne?:string;
 @IsOptional() @IsIn(['asc','desc']) sens?:string;
 @IsOptional() @IsString() page?:string;
 @IsOptional() @IsString() pageSize?:string;
}
for(const key of ['magasinId','utilisateurId','recherche','colonne','sens','page','pageSize']) ApiPropertyOptional({type:String})(JournalConsultationQuery.prototype,key);
for(const key of ['du','au']) ApiProperty({type:String,format:'date'})(JournalConsultationQuery.prototype,key);
const text:SchemaObject={type:'string'},amount:SchemaObject={type:'number'};
export const consultJournalSchema:SchemaObject={type:'object',properties:{id:{type:'string',format:'uuid'},numero:text,identifiant:text,date:{type:'string',format:'date'},magasinNom:text,saisiPar:text,statut:{type:'string',enum:['Validé','Brouillon','Annulé']},totalVentes:amount,depenses:amount,versement:{...amount,nullable:true},ecart:{...amount,nullable:true},montantAttendu:{...amount,nullable:true,description:'Attendu historique de la clôture espèces, toutes sources de sa période'}}};
export const consultDetailSchema:SchemaObject={...consultJournalSchema,properties:{...consultJournalSchema.properties,depensesDuJour:{type:'array',items:{type:'object',properties:{id:text,libelle:text,montant:amount,note:text}}},justificatifs:{type:'array',items:{type:'object',properties:{id:text,nom:text,url:{...text,description:'Chemin API privé ; JWT requis pour télécharger'}}}}}};

function scope(actor:Actor, shopId?:string) {
 for(const code of ['sales.read','expenses.read','remittances.read']) {
  if(!actor.permissions.includes(code)) throw new ForbiddenException(`Permission requise : ${code}`);
 }
 if(shopId) {new ShopAccess().assert(actor,shopId);return Prisma.sql`j."shopId"=${shopId}::uuid`;}
 return actor.permissions.includes('shops.all')?Prisma.sql`TRUE`:actor.shopIds.length?Prisma.sql`j."shopId" IN (${Prisma.join(actor.shopIds.map(id=>Prisma.sql`${id}::uuid`))})`:Prisma.sql`FALSE`;
}
type Row={id:string;date:Date;numero:string;identifiant:string;magasinNom:string;saisiPar:string;status:string;totalVentes:Prisma.Decimal;depenses:Prisma.Decimal;versement:Prisma.Decimal|null;ecart:Prisma.Decimal|null;montantAttendu:Prisma.Decimal|null};
function source(where:Prisma.Sql) {return Prisma.sql`WITH cahiers AS (
 SELECT j.id,j."businessDate" AS date,'CAH-' || EXTRACT(YEAR FROM j."businessDate" AT TIME ZONE 'Indian/Antananarivo')::text || '-' || j.id::text AS numero,
 'CAH-' || EXTRACT(YEAR FROM j."businessDate" AT TIME ZONE 'Indian/Antananarivo')::text || '-' || j.id::text AS identifiant,
 s.name AS "magasinNom",u.name AS "saisiPar",j.status::text,
 COALESCE(v.total,0) AS "totalVentes",COALESCE(f.expenses,0) AS depenses,f.remitted AS versement,
 f.difference AS ecart,f.expected AS "montantAttendu"
 FROM "CashJournal" j JOIN "Shop" s ON s.id=j."shopId" JOIN "User" u ON u.id=j."createdById"
 LEFT JOIN LATERAL (SELECT SUM(o.total) AS total FROM "Operation" o WHERE o."journalId"=j.id AND o.type='SALE' AND NOT o.superseded AND o.status<>'CANCELLED') v ON TRUE
 LEFT JOIN LATERAL (SELECT SUM(amount) FILTER (WHERE kind='EXPENSE') AS expenses,SUM(amount) FILTER (WHERE kind='REMITTANCE') AS remitted,
 SUM(difference) FILTER (WHERE kind='REMITTANCE') AS difference,SUM("expectedAmount") FILTER (WHERE kind='REMITTANCE') AS expected
 FROM "FinanceOperation" WHERE "journalId"=j.id AND status<>'CANCELLED') f ON TRUE
 WHERE ${where})`;}
function display(r:Row) {
 return {...r,date:new Intl.DateTimeFormat('en-CA',{timeZone:'Indian/Antananarivo',year:'numeric',month:'2-digit',day:'2-digit'}).format(r.date),statut:r.status==='VALIDATED'?'Validé':r.status==='CANCELLED'?'Annulé':'Brouillon',
 totalVentes:Number(r.totalVentes),depenses:Number(r.depenses),versement:r.versement===null?null:Number(r.versement),ecart:r.ecart===null?null:Number(r.ecart),montantAttendu:r.montantAttendu===null?null:Number(r.montantAttendu)};
}
export async function consultJournals(db:PrismaService,q:JournalConsultationQuery,actor:Actor) {
 const p=pageValues(q.page,q.pageSize),range=period(q.du,q.au);
 const where=Prisma.sql`${scope(actor,q.magasinId)} AND j."businessDate">=${range.start} AND j."businessDate"<${range.until} ${q.utilisateurId?Prisma.sql`AND j."createdById"=${q.utilisateurId}::uuid`:Prisma.empty}`;
 const search=q.recherche?.trim();const filter=search?Prisma.sql`WHERE strpos(lower(numero || ' ' || "magasinNom"),lower(${search}))>0`:Prisma.empty;
 const columns:Record<string,string>={date:'date',numero:'numero',magasin:'"magasinNom"',totalVentes:'"totalVentes"',depenses:'depenses',versement:'versement',ecart:'ecart'};
 const column=columns[q.colonne??'date'];if(!column)throw new BadRequestException('Tri invalide.');
 const order=Prisma.raw(`${column} ${q.sens==='asc'?'ASC':'DESC'} NULLS LAST, id ASC`);
 return db.$transaction(async tx=>{
  const items=await tx.$queryRaw<Row[]>(Prisma.sql`${source(where)} SELECT * FROM cahiers ${filter} ORDER BY ${order} LIMIT ${p.pageSize} OFFSET ${p.skip}`);
  const [count]=await tx.$queryRaw<{total:bigint}[]>(Prisma.sql`${source(where)} SELECT count(*) AS total FROM cahiers ${filter}`);
  return {items:items.map(display),total:Number(count.total),page:p.page,pageSize:p.pageSize};
 },{isolationLevel:'RepeatableRead'});
}
export async function journalUsers(db:PrismaService,actor:Actor) {
 return db.$queryRaw<{id:string;nom:string}[]>(Prisma.sql`SELECT DISTINCT u.id,u.name AS nom FROM "CashJournal" j JOIN "User" u ON u.id=j."createdById" WHERE ${scope(actor)} ORDER BY nom,u.id`);
}
export async function journalDetail(db:PrismaService,id:string,actor:Actor) {
 return db.$transaction(async tx=>{
  const [row]=await tx.$queryRaw<Row[]>(Prisma.sql`${source(Prisma.sql`${scope(actor)} AND j.id=${id}::uuid`)} SELECT * FROM cahiers`);
  if(!row)throw new NotFoundException('Journal introuvable.');
  const expenses=await tx.financeOperation.findMany({where:{journalId:id,kind:'EXPENSE',status:{not:'CANCELLED'}},orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,reason:true,amount:true,note:true}});
  const files=await tx.cashJournalAttachment.findMany({where:{journalId:id},orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,originalName:true}});
  return {...display(row),depensesDuJour:expenses.map(e=>({id:e.id,libelle:e.reason??'',montant:Number(e.amount),note:e.note??''})),justificatifs:files.map(f=>({id:f.id,nom:f.originalName,url:`/cash-journals/${id}/attachments/${f.id}`}))};
 },{isolationLevel:'RepeatableRead'});
}
