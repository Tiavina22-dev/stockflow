require('reflect-metadata');require('dotenv/config');
const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');const {NestFactory}=require('@nestjs/core');const {ValidationPipe}=require('@nestjs/common');const {JwtService}=require('@nestjs/jwt');
test('facture client et décisions de prix : snapshots, atomicité, concurrence et permissions',{timeout:120000},async()=>{
 const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/stockflow_test';process.env.DATABASE_URL=url.toString();process.env.BACKUPS_ENABLED='false';
 const db=new PrismaClient();let app;
 try{
  const key=randomUUID(),codes=['shops.all','products.read','products.price.update','stock.read','stock.in','sales.create','sales.validate','supplier-invoices.read','supplier-invoices.create','supplier-invoices.validate','invoices.create','invoices.read','customers.read'];
  const role=await db.role.create({data:{code:key,name:key}});
  for(const code of codes){const p=await db.permission.upsert({where:{code},create:{code},update:{}});await db.rolePermission.create({data:{roleId:role.id,permissionId:p.id}});}
  const user=await db.user.create({data:{login:key,name:'Invoices test',roleId:role.id,passwordHash:'unusable'}});
  const shop=await db.shop.create({data:{code:key,name:'Factures A'}}),other=await db.shop.create({data:{code:key+'B',name:'Factures B'}});
  const cat=await db.category.create({data:{name:key}}),unit=await db.unit.create({data:{name:key}});
  const products=[];for(let i=0;i<3;i++)products.push(await db.product.create({data:{name:'Product '+i,reference:key+i,categoryId:cat.id,unitId:unit.id,salePrice:'100',supplierPrice:i===2?null:i===0?'42':'6'}}));
  const customer=await db.customer.create({data:{shopId:shop.id,name:'Original client',nif:'NIF',stat:'STAT',phone:'034',address:'Original address'}}),foreignCustomer=await db.customer.create({data:{shopId:other.id,name:'Foreign'}});
  const {AppModule}=require('../dist/module');app=await NestFactory.create(AppModule,{logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.listen(0,'127.0.0.1');
  const base=await app.getUrl()+'/api/v1',jwt=app.get(JwtService),token=await jwt.signAsync({sub:user.id,ver:0});
  const http=(path,method='GET',body,bearer=token)=>fetch(base+path,{method,headers:{Authorization:'Bearer '+bearer,...(body?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const json=async(path,method='GET',body,bearer=token)=>{const r=await http(path,method,body,bearer),v=await r.json();assert.ok(r.ok,`${r.status}: ${JSON.stringify(v)}`);return v;};
  const receipt=await json('/operations','POST',{type:'STOCK_IN',shopId:shop.id,businessDate:'2026-10-02',status:'VALIDATED',requestKey:randomUUID(),lines:products.map(p=>({productId:p.id,quantity:'10'}))});
  const sale=await json('/operations','POST',{type:'SALE',shopId:shop.id,businessDate:'2026-10-02',status:'VALIDATED',requestKey:randomUUID(),discount:'10',lines:[{productId:products[0].id,quantity:'1'}]});
  const input={saleOperationId:sale.id,customerId:customer.id,invoiceDate:'2026-10-03',customerName:'Snapshot client',customerStat:'COPIED STAT',customerPhone:'032',paymentTerms:'30 jours'};
  assert.equal((await http('/customer-invoices','POST',{...input,customerId:foreignCustomer.id})).status,400);
  assert.equal((await http('/customer-invoices','POST',{...input,invoiceDate:'2026-02-30'})).status,400);
  assert.equal((await http('/customer-invoices','POST',{...input,invoiceDate:'2099-01-01'})).status,400);
  const invoices=await Promise.all([json('/customer-invoices','POST',input),json('/customer-invoices','POST',input)]);assert.equal(invoices[0].id,invoices[1].id);
  const invoice=invoices[0];assert.equal(invoice.snapshot.invoiceDate,'2026-10-03');assert.equal(invoice.snapshot.customer.name,'Snapshot client');assert.equal(invoice.snapshot.customer.nif,'NIF');assert.equal(invoice.snapshot.customer.stat,'COPIED STAT');assert.equal(invoice.snapshot.customer.phone,'032');assert.equal(invoice.snapshot.discount,'10.00');assert.equal(invoice.snapshot.totalTtc,'90.00');
  assert.equal(await db.auditEvent.count({where:{entityId:invoice.id,action:'invoice.issue'}}),1);
  await db.customer.update({where:{id:customer.id},data:{name:'Changed',stat:'Changed'}});await db.product.update({where:{id:products[0].id},data:{name:'Changed',salePrice:'999'}});
  const frozen=await json('/customer-invoices/'+invoice.id);assert.equal(frozen.snapshot.customer.stat,'COPIED STAT');assert.equal(frozen.snapshot.lines[0].unitPrice,'100.00');
  const pdf=await http('/customer-invoices/'+invoice.id+'/pdf');assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type'),/pdf/);assert.ok((await pdf.arrayBuffer()).byteLength>500);
  const supplier=await json('/supplier-invoices','POST',{shopId:shop.id,businessDate:'2026-10-02',requestKey:randomUUID(),supplierName:'Supplier',supplierReference:key,receiptId:receipt.id,lines:products.map((p,i)=>({productId:p.id,quantity:'10',unitPrice:['50','7','2'][i]}))});
  const reviewPath='/supplier-invoices/'+supplier.id+'/price-review';assert.deepEqual((await json(reviewPath)).lignes,[]);assert.equal((await http(reviewPath,'POST',{decisions:[{id:'invalid',decision:'valider'}]})).status,400);
  await json('/supplier-invoices/'+supplier.id+'/validate','POST');
  const before=await db.stockMovement.count({where:{operationId:receipt.id}});let review=await json(reviewPath);assert.equal(review.lignes.length,3);assert.equal(review.lignes.find(l=>l.reference===products[2].reference).ancienPrix,null);assert.equal(review.lignes[0].stockActuel,9);
  const first=review.lignes.find(l=>l.reference===products[0].reference);
  assert.equal((await http(reviewPath,'POST',{decisions:[{id:first.id,decision:'valider'},{id:'wrong',decision:'refuser'}]})).status,409);
  assert.equal(String((await db.product.findUniqueOrThrow({where:{id:products[0].id}})).supplierPrice),'42');assert.equal(await db.auditEvent.count({where:{entityId:{in:supplier.lines.map(l=>l.id)},action:'supplier-price.decide'}}),0);
  await db.product.update({where:{id:products[0].id},data:{supplierPrice:'43'}});assert.equal((await http(reviewPath,'POST',{decisions:[{id:first.id,decision:'valider'}]})).status,409);
  review=await json(reviewPath);const decisions=review.lignes.map(l=>({id:l.id,decision:l.reference===products[1].reference?'refuser':'valider'}));
  const races=await Promise.all([http(reviewPath,'POST',{decisions}),http(reviewPath,'POST',{decisions})]);assert.deepEqual(races.map(r=>r.status).sort(),[201,409]);
  assert.equal(String((await db.product.findUniqueOrThrow({where:{id:products[0].id}})).supplierPrice),'50');assert.equal(String((await db.product.findUniqueOrThrow({where:{id:products[1].id}})).supplierPrice),'6');assert.equal(String((await db.product.findUniqueOrThrow({where:{id:products[2].id}})).supplierPrice),'2');assert.deepEqual((await json(reviewPath)).lignes,[]);
  assert.equal(await db.priceChange.count({where:{productId:{in:products.map(p=>p.id)},origin:'SUPPLIER_INVOICE'}}),2);assert.equal(await db.auditEvent.count({where:{entityId:{in:supplier.lines.map(l=>l.id)},action:'supplier-price.decide'}}),3);assert.equal(await db.stockMovement.count({where:{operationId:receipt.id}}),before);
  assert.equal(String((await db.operationLine.findFirstOrThrow({where:{operationId:sale.id}})).supplierPrice),'42');assert.equal((await json('/customer-invoices/'+invoice.id)).snapshot.totalTtc,'90.00');
  await db.product.update({where:{id:products[1].id},data:{supplierPrice:'8'}});assert.deepEqual((await json(reviewPath)).lignes,[]);
  const scopeRole=await db.role.create({data:{code:key+'scope',name:'Scoped'}});for(const code of codes.filter(c=>!['shops.all','products.price.update'].includes(c))){const p=await db.permission.findUniqueOrThrow({where:{code}});await db.rolePermission.create({data:{roleId:scopeRole.id,permissionId:p.id}});}
  const scoped=await db.user.create({data:{login:key+'scope',name:'Scoped',roleId:scopeRole.id,passwordHash:'unusable',shops:{create:{shopId:other.id}}}}),scopeToken=await jwt.signAsync({sub:scoped.id,ver:0});
  assert.equal((await http(reviewPath,'GET',undefined,scopeToken)).status,403);assert.equal((await http(reviewPath,'POST',{decisions},scopeToken)).status,403);assert.equal((await http('/customer-invoices/'+invoice.id,'GET',undefined,scopeToken)).status,403);assert.equal((await http('/customer-invoices','POST',input,scopeToken)).status,403);
 }finally{if(app)await app.close();await db.$disconnect();}
});
