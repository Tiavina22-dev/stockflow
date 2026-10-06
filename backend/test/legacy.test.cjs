const test=require('node:test');
const assert=require('node:assert/strict');
const {InvoicesService}=require('../dist/invoices');
const {LegacyController}=require('../dist/legacy');

test('Une vente historique à TVA inconnue ne produit aucune facture',async()=>{
  const tx={operation:{findUnique:async()=>({id:'sale',type:'SALE',status:'VALIDATED',taxRate:null,shopId:'shop',lines:[]})},customerInvoice:{findUnique:async()=>null}};
  const service=new InvoicesService({}, {assert(){}}, {permission(){},transaction:async f=>f(tx)});
  await assert.rejects(service.issue({saleOperationId:'sale'},{id:'admin'}),/TVA historique inconnue/);
});

test('Archives sans magasin fiable : un accès magasin limité est refusé',()=>{
  let queried=false;
  const controller=new LegacyController({$queryRaw(){queried=true;}});
  assert.throws(()=>controller.imports({actor:{permissions:['audit.read'],shopIds:['shop']}}),/tous les magasins/);
  assert.equal(queried,false);
});

test('Pagination archive invalide refusée avant toute lecture SQL',()=>{
  let queried=false;
  const controller=new LegacyController({$queryRaw(){queried=true;}});
  assert.throws(()=>controller.records('mvt','a'.repeat(64),'-1','',{actor:{permissions:['shops.all','audit.read']}}),/valides requis/);
  assert.equal(queried,false);
});
