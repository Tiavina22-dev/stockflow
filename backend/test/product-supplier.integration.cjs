require('reflect-metadata');require('dotenv/config');
const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');const {NestFactory}=require('@nestjs/core');const {ValidationPipe}=require('@nestjs/common');const {JwtService}=require('@nestjs/jwt');
test('prix magasin et factures fournisseurs : concurrence, historique, droits et données réelles',{timeout:120000},async()=>{
 const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/stockflow_test';process.env.DATABASE_URL=url.toString();process.env.BACKUPS_ENABLED='false';
 const db=new PrismaClient();let app;
 try {
  const key=randomUUID();const codes=['shops.all','products.read','products.price.update','stock.read','stock.in','sales.create','sales.validate','supplier-invoices.read','supplier-invoices.create','supplier-invoices.validate'];
  const role=await db.role.create({data:{code:key,name:key}});
  for(const code of codes){const p=await db.permission.upsert({where:{code},create:{code},update:{}});await db.rolePermission.create({data:{roleId:role.id,permissionId:p.id}});}
  const user=await db.user.create({data:{login:key,name:'Price test',roleId:role.id,passwordHash:'unusable'}});
  const shop=await db.shop.create({data:{code:key,name:'Price A'}}),other=await db.shop.create({data:{code:key+'B',name:'Price B'}});
  const cat=await db.category.create({data:{name:key}}),unit=await db.unit.create({data:{name:key}}),product=await db.product.create({data:{name:'Real product',reference:key,categoryId:cat.id,unitId:unit.id,salePrice:'100',supplierPrice:'42',lowStockThreshold:'3'}});
  const {AppModule}=require('../dist/module');app=await NestFactory.create(AppModule,{logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.listen(0,'127.0.0.1');
  const base=await app.getUrl()+'/api/v1',jwt=app.get(JwtService),token=await jwt.signAsync({sub:user.id,ver:0});
  const http=(path,method='GET',body,bearer=token)=>fetch(base+path,{method,headers:{Authorization:'Bearer '+bearer,...(body&&! (body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
  const json=async(path,method='GET',body,bearer=token)=>{const r=await http(path,method,body,bearer),v=await r.json();assert.ok(r.ok,`${r.status}: ${JSON.stringify(v)}`);return v;};
  const path=`/products/${product.id}/shop-prices`;
  assert.deepEqual(await json(path),[]);
  const price=(shopId,value)=>({shopId,price:value}),save=(prices,expectedPrices)=>({prices,expectedPrices});
  const saved=await json(path,'PATCH',save([price(shop.id,'200.50'),price(other.id,'250')],[]));assert.equal(saved.length,2);
  assert.equal((await db.stockMovement.count({where:{productId:product.id}})),0);
  assert.equal(await db.priceChange.count({where:{productId:product.id}}),2);
  assert.equal((await http(path,'PATCH',save([price(shop.id,'300')],[]))).status,409);
  assert.equal((await http(path,'PATCH',save([price(shop.id,'-1')],[price(shop.id,'200.50'),price(other.id,'250')]))).status,400);
  assert.equal((await http(path,'PATCH',save([price(shop.id,'2'),price(shop.id,'3')],[]))).status,400);
  const badShop=randomUUID();assert.equal((await http(path,'PATCH',save([price(badShop,'10')],[price(shop.id,'200.50'),price(other.id,'250')]))).status,400);
  const scopeRole=await db.role.create({data:{code:key+'s',name:'Scoped'}});
  for(const code of codes.filter(c=>c!=='shops.all')){const p=await db.permission.findUniqueOrThrow({where:{code}});await db.rolePermission.create({data:{roleId:scopeRole.id,permissionId:p.id}});}
  const scoped=await db.user.create({data:{login:key+'s',name:'Scoped',roleId:scopeRole.id,passwordHash:'unusable',shops:{create:{shopId:shop.id}}}});const scopeToken=await jwt.signAsync({sub:scoped.id,ver:0});
  assert.equal((await json(path,'GET',undefined,scopeToken)).length,1);
  assert.equal((await http(path,'PATCH',save([price(other.id,'9')],[price(shop.id,'200.50')]),scopeToken)).status,403);
  await json(path,'PATCH',save([price(shop.id,'201')],[price(shop.id,'200.50')]),scopeToken);assert.equal(String((await db.productPrice.findUniqueOrThrow({where:{productId_shopId:{productId:product.id,shopId:other.id}}})).price),'250');
  const op=(type,quantity)=>({type,shopId:shop.id,businessDate:'2026-10-02',status:'VALIDATED',requestKey:randomUUID(),lines:[{productId:product.id,quantity:String(quantity)}]});
  const receipt=await json('/operations','POST',op('STOCK_IN',10));const sale=await json('/operations','POST',op('SALE',1));assert.equal(sale.lines[0].unitPrice,'201');
  const expected=[price(shop.id,'201'),price(other.id,'250')];
  const races=await Promise.all([http(path,'PATCH',save([price(shop.id,'202'),price(other.id,'250')],expected)),http(path,'PATCH',save([price(shop.id,'203'),price(other.id,'250')],expected))]);assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);
  assert.equal(String((await db.operationLine.findFirstOrThrow({where:{operationId:sale.id}})).unitPrice),'201');
  await json('/operations','POST',{...op('STOCK_IN',2),shopId:other.id});
  assert.equal((await json(`/products/${product.id}/detail`,'GET',undefined,scopeToken)).stockActuel,9);
  const detail=await json(`/products/${product.id}/detail`);assert.equal(detail.nom,'Real product');assert.equal(detail.stockActuel,11);assert.equal(detail.prixDAchatMoyen,null);assert.equal(detail.fournisseurPrincipal,null);assert.equal(detail.poids,null);assert.ok(!detail.photoUrl);
  await json(path,'PATCH',save([],await json(path).then(rows=>rows.map(r=>price(r.magasinId,String(r.prixDeVente))))));assert.deepEqual(await json(path),[]);assert.equal(await db.priceChange.count({where:{productId:product.id}}),4);assert.equal(await db.auditEvent.count({where:{entityType:'ProductPrice',entityId:product.id}}),6);
  const supplier='Supplier '+key;
  const invoice=await json('/supplier-invoices','POST',{shopId:shop.id,businessDate:'2026-10-02',requestKey:randomUUID(),supplierName:supplier,supplierReference:key,receiptId:receipt.id,lines:[{productId:product.id,quantity:'10',unitPrice:'42'}]});
  const elsewhere=await json('/supplier-invoices','POST',{shopId:other.id,businessDate:'2026-10-02',requestKey:randomUUID(),supplierName:'Hidden '+key,supplierReference:key,lines:[{productId:product.id,quantity:'1',unitPrice:'42'}]});
  const query=`/supplier-invoices/consultation?du=2026-10-02&au=2026-10-02&shopId=${shop.id}&pageSize=1`;
  const list=await json(query);assert.equal(list.total,1);assert.equal(list.items[0].id,invoice.id);assert.equal((await json(query+'&page=2')).items.length,0);assert.equal((await json(query+'&fournisseurId='+encodeURIComponent('absent'))).total,0);assert.equal((await json(query+'&recherche='+encodeURIComponent(key))).total,1);
  assert.equal((await http(query+'&pageSize=101')).status,400);assert.equal((await http(`/supplier-invoices/suppliers?shopId=bad`)).status,400);
  const suppliers=await json('/supplier-invoices/suppliers','GET',undefined,scopeToken);assert.ok(suppliers.some(s=>s.id===supplier));assert.ok(!suppliers.some(s=>s.nom==='Hidden '+key));
  assert.equal((await http(`/supplier-invoices/consultation?du=2026-10-02&au=2026-10-02&shopId=${other.id}`,'GET',undefined,scopeToken)).status,403);assert.equal((await http('/supplier-invoices/'+elsewhere.id,'GET',undefined,scopeToken)).status,403);
  const image=new FormData();image.append('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6mYQAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'supplier.png');
  const attachment=await json('/finance/supplier-invoices/'+invoice.id+'/attachments','POST',image);assert.equal(attachment.originalName,'supplier.png');assert.ok(!attachment.location);
  const invoiceDetail=await json('/supplier-invoices/'+invoice.id);assert.equal(invoiceDetail.attachments.length,1);assert.equal(invoiceDetail.lines[0].productName,'Real product');
  assert.equal((await http('/finance/supplier-invoices/'+invoice.id+'/attachments/'+attachment.id)).status,200);
  const balance=await db.stockBalance.findUniqueOrThrow({where:{productId_shopId:{productId:product.id,shopId:shop.id}}});
  await json('/supplier-invoices/'+invoice.id+'/validate','POST');assert.equal((await http('/supplier-invoices/'+invoice.id+'/validate','POST')).status,409);assert.equal(String((await db.stockBalance.findUniqueOrThrow({where:{productId_shopId:{productId:product.id,shopId:shop.id}}})).quantity),String(balance.quantity));
  const noPricePermission=await db.permission.findUniqueOrThrow({where:{code:'products.price.update'}});await db.rolePermission.delete({where:{roleId_permissionId:{roleId:scopeRole.id,permissionId:noPricePermission.id}}});assert.equal((await http(path,'PATCH',save([],[]),scopeToken)).status,403);
 }finally{if(app)await app.close();await db.$disconnect();}
});
