const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { pagination } = require('../dist/dto.js');
const { ShopAccess, AuthGuard } = require('../dist/auth.js');

test('pagination refuse les paramètres dangereux et garde un découpage stable', () => {
  assert.deepEqual(pagination({ page: '3', pageSize: '25' }), { page: 3, pageSize: 25, skip: 50 });
  for (const query of [{ page: '0' }, { pageSize: '101' }, { page: '1.5' }, { page: 'NaN' }]) {
    assert.throws(() => pagination(query));
  }
});

test('un utilisateur sans droit global ne peut lire le stock d’un autre magasin', () => {
  const access = new ShopAccess();
  const actor = { shopIds: ['shop-a'], permissions: ['stock.read'] };
  assert.doesNotThrow(() => access.assert(actor, 'shop-a'));
  assert.throws(() => access.assert(actor, 'shop-b'));
  assert.throws(() => access.assert(actor, ''));
  assert.doesNotThrow(() => access.assert({ ...actor, permissions: ['shops.all'] }, 'shop-b'));
});

test('le guard relit les droits serveur et refuse un compte révoqué', async () => {
  const reflector = { getAllAndOverride: key => key === 'public' ? false : 'stock.read' };
  const jwt = { verifyAsync: async () => ({ sub: 'user-id' }) };
  const db = { user: { findUnique: async () => ({ id: 'user-id', name: 'A', login: 'a', active: true,
    role: { code: 'VENDEUR', permissions: [{ permission: { code: 'stock.read' } }] }, shops: [{ shopId: 'shop-a' }] }) } };
  const request = { headers: { authorization: 'Bearer token' } };
  const context = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => request }) };
  const guard = new AuthGuard(reflector, jwt, db);
  assert.equal(await guard.canActivate(context), true);
  assert.deepEqual(request.actor.shopIds, ['shop-a']);
  db.user.findUnique = async () => ({ active: false });
  await assert.rejects(guard.canActivate(context));
});
