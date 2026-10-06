import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import { DataCache } from "./data-cache.ts"

test("navigation et demandes simultanées : un seul chargement partagé", async () => {
  let calls = 0, clock = 0
  const cache = new DataCache(() => clock)
  const load = async () => { calls++; return ["magasin A"] }
  const results = await Promise.all(Array.from({ length: 5 }, () => cache.read("stores", load, 300000)))
  assert.equal(calls, 1); assert.deepEqual(results[0], ["magasin A"])
  await cache.read("stores", load, 300000); assert.equal(calls, 1)
  clock = 300001
  const refresh = cache.read("stores", load, 300000)
  assert.equal(cache.snapshot("stores").isLoading, false)
  assert.deepEqual(cache.snapshot("stores").data, ["magasin A"])
  await refresh; assert.equal(calls, 2)
})

test("magasins et filtres séparés ; mutation actualisée sans perdre les données affichées", async () => {
  const cache = new DataCache()
  await cache.read("sales:A", async () => ["vente A"], 30000)
  await cache.read("sales:B", async () => ["vente B"], 30000)
  cache.invalidate()
  assert.deepEqual(cache.snapshot("sales:A").data, ["vente A"])
  await cache.read("sales:A", async () => ["vente A corrigée"], 30000)
  assert.deepEqual(cache.snapshot("sales:A").data, ["vente A corrigée"])
  assert.deepEqual(cache.snapshot("sales:B").data, ["vente B"])
})

test("une ancienne réponse ne remplace pas une réponse après invalidation ou déconnexion", async () => {
  const cache = new DataCache(); let finish
  const old = cache.read("sales", () => new Promise(resolve => { finish = resolve }), 30000)
  await Promise.resolve(); cache.invalidate()
  await cache.read("sales", async () => ["nouvelle vente"], 30000)
  finish(["ancienne vente"]); await old
  assert.deepEqual(cache.snapshot("sales").data, ["nouvelle vente"])
  const pending = cache.read("user", () => new Promise(resolve => { finish = resolve }), 30000)
  await Promise.resolve(); cache.clear(); finish({ name: "autre utilisateur" }); await pending
  assert.equal(cache.snapshot("user").data, undefined)
})

test("une actualisation échouée conserve les données et peut être réessayée", async () => {
  let clock = 0; const cache = new DataCache(() => clock)
  await cache.read("stock", async () => [3], 30000); clock = 30001
  await assert.rejects(cache.read("stock", async () => { throw Error("API indisponible") }, 30000))
  assert.deepEqual(cache.snapshot("stock").data, [3]); assert.equal(cache.snapshot("stock").error, "API indisponible")
  clock += 5001; await cache.read("stock", async () => [4], 30000)
  assert.equal(cache.snapshot("stock").error, null)
})

test("HTTP : déduplication, copies indépendantes et séparation des sessions", async () => {
  const source = (await readFile(new URL("./http-api.ts", import.meta.url), "utf8"))
    .replace('"./data-cache"', JSON.stringify(new URL("./data-cache.ts", import.meta.url).href))
    .replace("import.meta.env.VITE_API_URL", "undefined")
  const originalFetch = globalThis.fetch, originalStorage = globalThis.sessionStorage
  let calls = 0
  globalThis.sessionStorage = { setItem() {}, removeItem() {} }
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ items: [calls] }), { status: 200 }) }
  const http = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"))
  try {
    http.setSession("session-A", 900)
    const [first, second] = await Promise.all([http.api("/shops"), http.api("/shops")])
    assert.equal(calls, 1); first.items.push(999); assert.deepEqual(second.items, [1])
    http.invalidateApi(); assert.deepEqual((await http.api("/shops")).items, [2])
    http.clearSession(); await assert.rejects(http.api("/shops"), /Connectez-vous/)
    http.setSession("session-B", 900); assert.deepEqual((await http.api("/shops")).items, [3])
  } finally { http.clearSession(); globalThis.fetch = originalFetch; globalThis.sessionStorage = originalStorage }
})
