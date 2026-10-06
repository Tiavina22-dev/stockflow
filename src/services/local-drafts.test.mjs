import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"

const source = stripTypeScriptTypes(await readFile(new URL("./local-drafts.ts", import.meta.url), "utf8"), { mode: "transform" })
const { DraftController, DraftConflict } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"))
class Repository {
  records = new Map()
  async read(key) { return structuredClone(this.records.get(key)) }
  async write(record, expected) {
    if ((this.records.get(record.key)?.revision ?? 0) !== expected) throw new DraftConflict()
    this.records.set(record.key, structuredClone(record))
  }
}
const scope = { userId: "misa", shopId: "A", form: "cash-journal" }
test("reprise des lignes, dépenses, valeurs intermédiaires et documents sans écriture serveur", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.setField("quantity", "1,", "")
  draft.setField("selected", new Set(["p"]), new Set())
  draft.setField("lines", [{ productId: "p", quantity: "3" }], [])
  draft.setField("expenses", [{ amount: "2000", reason: "Transport" }], [])
  draft.setField("photos", [new Blob(["photo"], { type: "image/png" })], [])
  await draft.flush()
  const resumed = new DraftController(scope, repo); await resumed.flush()
  assert.equal(resumed.snapshot().restored, true)
  assert.equal(resumed.snapshot().fields.quantity, "1,")
  assert.deepEqual(resumed.snapshot().fields.selected, new Set(["p"]))
  assert.equal(resumed.snapshot().fields.lines[0].quantity, "3")
  assert.equal(await resumed.snapshot().fields.photos[0].text(), "photo")
})
test("séparation entre comptes, magasins, opérations et objets modifiés", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.setField("note", "privée", ""); await draft.flush()
  for (const other of [{ ...scope, userId: "tiavina" }, { ...scope, shopId: "B" }, { ...scope, form: "sale" }, { ...scope, entityId: "existing-sale" }]) {
    const isolated = new DraftController(other, repo); await isolated.flush(); assert.deepEqual(isolated.snapshot().fields, {})
  }
})
test("aucun mot de passe ni jeton dans les champs sauvegardés", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.setField("password", "secret", "")
  draft.setField("user", { nom: "Misa", motDePasse: "secret", confirmation: "secret", nested: { accessToken: "secret", active: true } }, {})
  await draft.flush()
  assert.deepEqual(draft.snapshot().fields, { user: { nom: "Misa", nested: { active: true } } })
})
test("une réponse IndexedDB tardive ne remplace pas les champs déjà saisis", async () => {
  const repo = new Repository(), first = new DraftController(scope, repo)
  first.setField("note", "ancienne", ""); first.setField("lines", [1], []); await first.flush()
  let release; const read = repo.read.bind(repo)
  repo.read = key => new Promise(resolve => { release = () => read(key).then(resolve) })
  const resumed = new DraftController(scope, repo); resumed.setField("note", "nouvelle", ""); release(); await resumed.flush()
  assert.equal(resumed.snapshot().fields.note, "nouvelle"); assert.deepEqual(resumed.snapshot().fields.lines, [1])
})
test("deux onglets ne s'écrasent pas ; un onglet ancien ne ressuscite pas une saisie effacée", async () => {
  const repo = new Repository(), a = new DraftController(scope, repo), b = new DraftController(scope, repo)
  await Promise.all([a.flush(), b.flush()])
  a.setField("note", "A", ""); await a.flush()
  b.setField("note", "B", ""); await assert.rejects(b.flush(), DraftConflict)
  assert.equal((await repo.read(a.key)).fields.note, "A")
  const stale = new DraftController(scope, repo); await stale.flush(); await a.clear()
  stale.setField("note", "ancienne", ""); await assert.rejects(stale.flush(), DraftConflict)
  const reopened = new DraftController(scope, repo); await reopened.flush()
  assert.deepEqual(reopened.snapshot().fields, {}); assert.equal(reopened.snapshot().restored, false)
})
test("reprise d'un envoi ambigu avec la même clé, nouvelle clé si le contenu change ou après succès", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.setField("note", "test", ""); await draft.flush()
  const payload = { lines: [{ productId: "p", quantity: 1 }], status: "VALIDATED" }, first = await draft.submissionKey(payload)
  const resumed = new DraftController(scope, repo); await resumed.flush()
  assert.equal(await resumed.submissionKey(payload), first)
  assert.notEqual(await resumed.submissionKey({ ...payload, status: "DRAFT" }), first)
  await resumed.clear()
  const afterSuccess = new DraftController(scope, repo); await afterSuccess.flush()
  assert.notEqual(await afterSuccess.submissionKey(payload), first)
})
test("quota ou stockage indisponible : saisie conservée en mémoire, erreur visible, jamais annoncée sauvegardée", async () => {
  const repo = new Repository(); repo.write = async () => { throw new Error("Quota dépassé") }
  const draft = new DraftController(scope, repo); draft.setField("note", "à conserver", "")
  await assert.rejects(draft.flush(), /Quota/)
  assert.equal(draft.snapshot().fields.note, "à conserver"); assert.equal(draft.snapshot().saving, false); assert.equal(draft.snapshot().dirty, true); assert.match(draft.snapshot().error, /Quota/)
})
test("les changements saisis pendant un envoi ne sont pas effacés par sa réponse tardive", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.setField("note", "envoyée", ""); await draft.flush()
  const submittedFields = draft.snapshot().fields
  draft.setField("note", "nouvelle saisie", ""); await draft.flush()
  await assert.rejects(draft.clear(submittedFields), /nouvelles modifications/)
  assert.equal((await repo.read(draft.key)).fields.note, "nouvelle saisie")
  draft.setField("note", "toujours sauvegardée", ""); await draft.flush()
  assert.equal((await repo.read(draft.key)).fields.note, "toujours sauvegardée")
})
test("la date et les valeurs par défaut accompagnent la première modification, sans créer de brouillon vide", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.registerField("date", "2026-10-04"); draft.registerField("lines", [])
  await draft.flush(); assert.equal(repo.records.size, 0)
  draft.setField("note", "à reprendre demain", ""); await draft.flush()
  const resumed = new DraftController(scope, repo); resumed.registerField("date", "2026-10-05"); await resumed.flush()
  assert.equal(resumed.snapshot().fields.date, "2026-10-04")
})

test("une frappe pendant l’effacement reste sauvegardée et éditable", async () => {
  const repo = new Repository(), draft = new DraftController(scope, repo)
  draft.setField("note", "envoyée", ""); await draft.flush()
  const write = repo.write.bind(repo); let started, release
  const waiting = new Promise(resolve => { started = resolve })
  repo.write = async (record, expected) => {
    if (Object.keys(record.fields).length === 0) { started(); await new Promise(resolve => { release = resolve }) }
    await write(record, expected)
  }
  const clearing = draft.clear(); await waiting
  draft.setField("note", "nouvelle", ""); release()
  await assert.rejects(clearing, /nouvelles modifications/)
  await draft.flush()
  assert.equal((await repo.read(draft.key)).fields.note, "nouvelle")
  assert.equal(draft.snapshot().error, null)
})
