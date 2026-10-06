import assert from "node:assert/strict"
import { test } from "node:test"
import { getCurrentUser, getStores, getProducts, getStockKpis } from "./demo-api.ts"

test("utilisateur et magasins : copies indépendantes", async () => {
  const user = await getCurrentUser()
  assert.equal(user.firstName, "Chloé")
  user.firstName = "Autre"
  assert.equal((await getCurrentUser()).firstName, "Chloé")
  assert.equal((await getStores()).length, 4)
})
test("recherche nom sans accents, SKU et code-barres dans le magasin demandé", async () => {
  const params = { storeId: "paris-republique", page: 1, pageSize: 5 }
  for (const search of [" CAFE ", "sf-0001", "3760000000001"]) {
    const result = await getProducts({ ...params, search })
    assert.equal(result.total, 1)
    assert.equal(result.items[0].name, "Café noir 250g")
  }
  const lyon = await getProducts({ ...params, storeId: "lyon-part-dieu", search: "cafe" })
  assert.equal(lyon.items[0].quantity, 114)
  assert.equal((await getProducts({ ...params, search: "introuvable" })).total, 0)
})
test("pagination : total avant découpage, pages distinctes et page hors limites vide", async () => {
  const params = { storeId: "paris-republique", page: 1, pageSize: 5 }
  const first = await getProducts(params)
  const second = await getProducts({ ...params, page: 2 })
  assert.equal(first.total, 12)
  assert.equal(first.items.length, 5)
  assert.equal(second.items.length, 5)
  assert.ok(first.items.every(item => second.items.every(other => other.id !== item.id)))
  assert.equal((await getProducts({ ...params, page: 4 })).items.length, 0)
  await assert.rejects(getProducts({ ...params, page: 0 }))
  await assert.rejects(getProducts({ ...params, pageSize: 1.5 }))
  await assert.rejects(getProducts({ ...params, storeId: "inconnu" }))
})
test("KPI : somme du stock, dernier point et tendance cohérents pour chaque magasin", async () => {
  for (const store of await getStores()) {
    const products = await getProducts({ storeId: store.id, page: 1, pageSize: 100 })
    const [kpi] = await getStockKpis(store.id)
    const sum = Math.round(products.items.reduce((total, item) => total + item.value, 0) * 100) / 100
    assert.match(kpi.value, / Ar$/)
    assert.ok(!kpi.value.includes("€"))
    assert.equal(kpi.series.at(-1), sum)
    assert.equal(kpi.trend, Math.round((sum - kpi.series[0]) / kpi.series[0] * 1000) / 10)
  }
  await assert.rejects(getStockKpis(undefined))
})
