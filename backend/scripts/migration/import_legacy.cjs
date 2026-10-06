/* Import distinct du runtime API. Tout le SQL métier est atomique et sérialisable. */
require('dotenv').config();
const { PrismaClient, Prisma } = require(process.env.MIGRATION_CLIENT_PATH || '@prisma/client');
const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const { createReadStream } = require('node:fs');
const argon2 = require('argon2');
const D = Prisma.Decimal;
const digest = b => createHash('sha256').update(b).digest('hex');
function id(hash, kind, key) { // UUID stable sans dépendance supplémentaire.
  const b=createHash('sha256').update(`stockflow-import:${hash}:${kind}:${key}`).digest().subarray(0,16);
  b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;
  const s=b.toString('hex');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
function date(s) { const d=new Date(s.length===10?`${s}T00:00:00+03:00`:`${s.replace(' ','T')}+03:00`); if(!Number.isFinite(d.getTime()))throw Error('Date invalide');return d; }
function price(s) { if(s===null||s===undefined)return null;const n=new D(s);return n.isFinite()&&n.gte(0)&&n.decimalPlaces()<=2?n:null; }
function within(root, relative) {const p=path.resolve(root,relative);if(p===root||!p.startsWith(root+path.sep))throw Error('Chemin hors racine');return p;}
async function insertRecords(tx,batch,hash,mapping,rejected) {
  const rows=batch.map(r=>({...r,sourceHash:hash,targetId:mapping.get(`${r.sourceTable}:${r.sourceKey}`)??null,
    classification:rejected.has(r.sourceKey)&&r.sourceTable==='mvt'?`ANOMALIE:${rejected.get(r.sourceKey)}`:mapping.has(`${r.sourceTable}:${r.sourceKey}`)?'IMPORTE':'ARCHIVE_A_VERIFIER'}));
  await tx.$executeRaw`INSERT INTO "LegacyRecord" (id,"sourceHash","sourceTable","sourceKey",payload,"targetId",classification)
    SELECT id::uuid,"sourceHash","sourceTable","sourceKey",payload,"targetId"::uuid,classification
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(id text,"sourceHash" text,"sourceTable" text,"sourceKey" text,payload jsonb,"targetId" text,classification text)`;
}
async function run() {
  const [prepared, sourceRoot, mode]=process.argv.slice(2);
  if(!prepared||!sourceRoot||!['--rollback','--apply'].includes(mode))throw Error('Usage: node import_legacy.cjs paquet dossier-source --rollback|--apply');
  const plan=JSON.parse(await fs.readFile(path.resolve(prepared,'plan.json'),'utf8'));
  if(plan.version!==1||plan.sourceHash!=='130272329474771cfdbc9c64bde52366436a0f053f6d00c3e1baae58dab37b3f')throw Error('Source non approuvée');
  if(digest(await fs.readFile(path.resolve(prepared,'records.ndjson')))!==plan.recordFileHash)throw Error('Archive altérée');
  const db=new PrismaClient();
  try {
    const existing=await db.$queryRaw`SELECT "sourceHash",summary FROM "LegacyImport" WHERE "sourceHash"=${plan.sourceHash}`;
    if(existing.length){console.log(JSON.stringify({alreadyImported:true,summary:existing[0].summary}));return;}
    if(mode==='--apply') {
      const {createBackup,backupRoot}=await import('../backup-tools.mjs');
      const backup=await createBackup({root:await backupRoot(),databaseUrl:process.env.DATABASE_URL,uploadDirectory:path.resolve(process.env.UPLOAD_DIR??'.local/uploads'),dueOnly:false});
      console.log(JSON.stringify({backup}));
    }
    const files=[], photos=new Map(); const root=path.resolve(sourceRoot), uploads=path.resolve(process.env.UPLOAD_DIR??'.local/uploads');
    for(const f of plan.files) {
      const src=within(root,f.relativePath);if((await fs.lstat(src)).isSymbolicLink())throw Error('Lien symbolique source refusé');
      const bytes=await fs.readFile(src);if(bytes.length!==f.size||digest(bytes)!==f.sha256)throw Error('Justificatif source altéré');
      const location=path.join('legacy',plan.sourceHash,f.sha256);
      if(mode==='--apply') {const target=within(uploads,location);await fs.mkdir(path.dirname(target),{recursive:true});
        try{await fs.writeFile(target,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||digest(await fs.readFile(target))!==f.sha256)throw e;}}
      files.push({id:id(plan.sourceHash,'file',f.relativePath),sourceHash:plan.sourceHash,...f,location});
    }
    for(const p of plan.products) {
      const raw=(p.img_path_x??'').replaceAll('\\','/').replace(/^\.\//,'');
      const f=plan.files.find(f=>f.relativePath===raw);if(!f)continue;
      const bytes=await fs.readFile(within(root,f.relativePath));
      const ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;
      if(!ext)continue;
      const name=`${id(plan.sourceHash,'photo',p.id_x)}.${ext}`;
      if(mode==='--apply') {await fs.mkdir(uploads,{recursive:true});try{await fs.writeFile(within(uploads,name),bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||digest(await fs.readFile(within(uploads,name)))!==f.sha256)throw e;}}
      photos.set(p.id_x,`${process.env.PUBLIC_API_URL??'http://127.0.0.1:3001/api/v1'}/media/${name}`);
    }
    const historicalPassword=await argon2.hash(randomBytes(48).toString('hex'),{type:argon2.argon2id});
    let summary;
    const rollback=Error('MIGRATION_TEST_ROLLBACK');
    try { await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1844926)`;
      const before={products:await tx.product.findMany(),operations:await tx.operation.findMany(),balances:await tx.stockBalance.findMany()};
      const actor=await tx.user.findFirstOrThrow({where:{login:'admin',active:true}});
      const map=new Map(),shopMap=new Map(),categoryMap=new Map(),unitMap=new Map(),authorMap=new Map();
      const role=await tx.role.create({data:{id:id(plan.sourceHash,'role','archive'),code:`LEGACY_${plan.sourceHash.slice(0,8)}`,name:'Auteurs historiques — accès désactivé'}});
      for(const name of plan.authors) {const uid=id(plan.sourceHash,'author',name);await tx.user.create({data:{id:uid,name:name||'Auteur historique inconnu',login:`legacy-${uid}`,roleId:role.id,passwordHash:historicalPassword,active:false}});authorMap.set(name,uid);}
      for(const r of plan.shops) {const sid=id(plan.sourceHash,'shop',r.shop_id);await tx.shop.create({data:{id:sid,name:r.short_name,code:`LEGACY-${r.shop_id}`,active:true,isMain:false}});shopMap.set(r.short_name,sid);map.set(`shop:${r.shop_id}`,sid);}
      for(const [rows,model,field,nameField,mapped] of [[plan.categories,tx.category,'id_cat','nom_cat',categoryMap],[plan.units,tx.unit,'id_unite','nom_unite',unitMap]]) {
        for(const r of rows){const name=(r[nameField]||'').trim()||`Ancien ${field} ${r[field]}`;const value=await model.upsert({where:{name},create:{name,description:r.note_cat||''},update:{}});mapped.set(r[field],value.id);map.set(`${field==='id_cat'?'categorie':'unite'}:${r[field]}`,value.id);}
      }
      const catFallback=await tx.category.upsert({where:{name:'Ancienne catégorie inconnue'},create:{name:'Ancienne catégorie inconnue'},update:{}});
      const unitFallback=await tx.unit.upsert({where:{name:'Ancienne unité inconnue'},create:{name:'Ancienne unité inconnue'},update:{}});
      const refs=new Set(before.products.map(p=>p.reference)),products=new Map();
      for(const r of plan.products) {
        let reference=r.targetReference;if(refs.has(reference))reference=`LEGACY-${r.id_x}-${plan.sourceHash.slice(0,8)}`;
        if(refs.has(reference))throw Error('Collision référence non résolue');refs.add(reference);
        const p={id:r.targetId,name:r.nom_x?.trim()||`Produit historique sans nom ${r.id_x}`,reference,
          categoryId:categoryMap.get(r.id_cat)||catFallback.id,unitId:unitMap.get(r.id_unite)||unitFallback.id,
          supplierPrice:price(r.prix_fournisseur),salePrice:price(r.prix_de_vente),active:!!r.nom_x?.trim(),photoUrl:photos.get(r.id_x),
          description:`Import historique produit ${r.id_x}. Référence originale : ${r.reference_x??'(absente)'}.\n${r.note_x??''}`,
          ...(r.date_time_x&&date(r.date_time_x)?{createdAt:date(r.date_time_x)}:{})};
        await tx.product.create({data:p});products.set(r.id_x,p);map.set(`produit:${r.id_x}`,p.id);
      }
      const ops=[],lines=[],movements=[];
      for(const g of plan.groups) {
        const r=g.rows[0],sale=r.type_de_mvt==='vente',sid=shopMap.get(r.nom_client_fournisseur),uid=authorMap.get(r.user_mvt);
        let total=new D(0);const createdAt=g.rows.map(r=>date(r.date_time)).sort((a,b)=>a-b)[0];
        for(const row of g.rows) {
          const p=products.get(row.id_x),q=new D(row.qt),unitPrice=sale?new D(row.prix_unitaire):null,lineTotal=sale?q.abs().mul(unitPrice).toDecimalPlaces(2):null;
          if(lineTotal)total=total.add(lineTotal);
          lines.push({id:id(plan.sourceHash,'line',row.id_mvt),operationId:g.id,productId:p.id,quantity:q.abs(),unitPrice,lineTotal,
            supplierPrice:null,productName:p.name,productReference:p.reference,adjustmentDelta:sale?null:q,reason:sale?null:'Sous-type historique inconnu ; type source stock conservé en archive.'});
          movements.push({id:id(plan.sourceHash,'movement',row.id_mvt),operationId:g.id,productId:p.id,shopId:sid,userId:uid,type:sale?'SALE':'INVENTORY_ADJUSTMENT',quantityDelta:q,unitPrice,businessDate:date(row.Date_du_Journal_mvt),createdAt:date(row.date_time)});
          map.set(`mvt:${row.id_mvt}`,g.id);
        }
        ops.push({id:g.id,number:`LEG-${sale?'VTE':'AJU'}-${g.id}`,type:sale?'SALE':'INVENTORY_ADJUSTMENT',shopId:sid,businessDate:date(r.Date_du_Journal_mvt),createdAt,
          createdById:uid,status:'VALIDATED',validatedAt:null,validatedById:null,total,taxRate:null,currencyLabel:'Ar',
          reason:'Import historique ; validation effective source, date et validateur inconnus.',note:`Activité source ${r.numero_commande_stock??'(absente)'}. Fragment regroupé par type, magasin, activité, date et auteur. TVA, coût historique et mode de paiement inconnus.`});
      }
      await tx.operation.createMany({data:ops});await tx.operationLine.createMany({data:lines});await tx.stockMovement.createMany({data:movements});
      for(const [key,expected] of Object.entries(plan.balances)) {
        const [pid,shop]=JSON.parse(key),productId=products.get(pid).id,shopId=shopMap.get(shop);
        const agg=await tx.stockMovement.aggregate({where:{productId,shopId},_sum:{quantityDelta:true}});
        if(!new D(expected).equals(agg._sum.quantityDelta))throw Error('Réconciliation stock échouée');
        await tx.stockBalance.create({data:{productId,shopId,quantity:expected}});
      }
      summary={products:products.size,operations:ops.length,sales:ops.filter(o=>o.type==='SALE').length,movements:movements.length,quarantine:plan.quarantine,
        files:files.length,missingAttachmentDirectories:plan.missingAttachmentDirectories.length,sourceTables:plan.tables,
        existingPreserved:{products:before.products.length,operations:before.operations.length},taxAndCost:'UNKNOWN',oldCredentials:'NOT_IMPORTED'};
      await tx.$executeRaw`INSERT INTO "LegacyImport" ("sourceHash",summary) VALUES (${plan.sourceHash},${JSON.stringify(summary)}::jsonb)`;
      const rejected=new Map(plan.quarantine.map(r=>[r.sourceId,r.reason]));
      const input=readline.createInterface({input:createReadStream(path.resolve(prepared,'records.ndjson')),crlfDelay:Infinity});let batch=[],archiveCount=0;
      for await(const line of input){batch.push(JSON.parse(line));if(batch.length===1000){await insertRecords(tx,batch,plan.sourceHash,map,rejected);archiveCount+=batch.length;batch=[];}}
      if(batch.length){await insertRecords(tx,batch,plan.sourceHash,map,rejected);archiveCount+=batch.length;}
      const expectedRecords=Object.entries(plan.tables).filter(([k])=>k!=='user').reduce((n,[,v])=>n+v,0);
      if(archiveCount!==expectedRecords)throw Error('Nombre de lignes archivées incorrect');
      for(let i=0;i<files.length;i+=500)await tx.$executeRaw`INSERT INTO "LegacyFile" (id,"sourceHash","relativePath",sha256,size,location)
        SELECT id::uuid,"sourceHash","relativePath",sha256,size::bigint,location FROM jsonb_to_recordset(${JSON.stringify(files.slice(i,i+500))}::jsonb) AS x(id text,"sourceHash" text,"relativePath" text,sha256 text,size text,location text)`;
      await tx.auditEvent.create({data:{actorId:actor.id,action:'migration.import',entityType:'LegacyImport',entityId:plan.sourceHash,newValue:summary,reason:'Migration autorisée : deux magasins séparés, conservation des saisies actuelles et anomalies archivées.'}});
      for(const [model,original] of [[tx.product,before.products],[tx.operation,before.operations]]){
        const after=await model.findMany({where:{id:{in:original.map(r=>r.id)}}});
        const ordered=a=>JSON.stringify(a.sort((x,y)=>x.id.localeCompare(y.id)));
        if(ordered(original)!==ordered(after))throw Error('Données actuelles modifiées');
      }
      const originalBalances=await tx.stockBalance.findMany({where:{shopId:{notIn:[...shopMap.values()]}}});
      if(JSON.stringify(before.balances)!==JSON.stringify(originalBalances))throw Error('Stock actuel modifié');
      console.log(JSON.stringify({validation:summary,archiveCount,mode}));
      if(mode==='--rollback')throw rollback;
    },{isolationLevel:'Serializable',timeout:600000,maxWait:30000});}catch(e){if(e!==rollback)throw e;console.log('ROLLBACK de test confirmé.');}
  }finally{await db.$disconnect();}
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
