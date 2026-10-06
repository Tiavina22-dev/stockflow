import type { DraftScope, DraftSnapshot, LocalDraft } from "@/types/local-drafts"

type RecordData = { key: string; revision: number; fields: Record<string, unknown>; submission?: { fingerprint: string; key: string }; updatedAt: string }
export interface DraftRepository {
  read(key: string): Promise<RecordData | undefined>
  write(record: RecordData, expectedRevision: number): Promise<void>
}
const conflictMessage = "Cette saisie a changé dans un autre onglet. Rechargez-la avant de continuer."
const storageMessage = "La sauvegarde locale a échoué. Gardez cette page ouverte ou enregistrez la saisie sur le serveur."
export class DraftConflict extends Error { constructor() { super(conflictMessage) } }

export class IndexedDraftRepository implements DraftRepository {
  private database?: Promise<IDBDatabase>
  private readonly name: string
  constructor(name = "stockflow-local-drafts-v1") { this.name = name }
  private open() {
    if (!this.database) this.database = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error(storageMessage)); return }
      const request = indexedDB.open(this.name, 1)
      request.onupgradeneeded = () => request.result.createObjectStore("drafts", { keyPath: "key" })
      request.onerror = () => reject(new Error(storageMessage))
      request.onblocked = () => reject(new Error(storageMessage))
      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => { database.close(); this.database = undefined }
        resolve(database)
      }
    }).catch(error => { this.database = undefined; throw error })
    return this.database
  }
  async read(key: string) {
    const database = await this.open()
    return new Promise<RecordData | undefined>((resolve, reject) => {
      const tx = database.transaction("drafts", "readonly"), request = tx.objectStore("drafts").get(key)
      let record: RecordData | undefined
      request.onsuccess = () => { record = request.result }
      tx.oncomplete = () => resolve(record)
      tx.onabort = tx.onerror = () => reject(new Error(storageMessage))
    })
  }
  async write(record: RecordData, expectedRevision: number) {
    const database = await this.open()
    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction("drafts", "readwrite", { durability: "strict" }), store = tx.objectStore("drafts"), request = store.get(record.key)
      let conflict = false
      request.onsuccess = () => {
        if ((request.result?.revision ?? 0) !== expectedRevision) { conflict = true; tx.abort(); return }
        store.put(record)
      }
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () => reject(conflict ? new DraftConflict() : new Error(storageMessage))
    })
  }
}

const sensitive = /^(password|passwordHash|motDePasse|confirmation|confirmationMotDePasse|accessToken|refreshToken|token|jwt)$/i
function safeValue(value: unknown): unknown {
  if (value instanceof Blob || value instanceof Date || value === null || typeof value !== "object") return value
  if (value instanceof Set) return new Set([...value].map(safeValue))
  if (Array.isArray(value)) return value.map(safeValue)
  return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive.test(key)).map(([key, item]) => [key, safeValue(item)]))
}
async function fingerprint(value: unknown): Promise<string> {
  async function normalize(item: unknown): Promise<unknown> {
    if (item instanceof Blob) return { name: item instanceof File ? item.name : "", type: item.type, bytes: [...new Uint8Array(await crypto.subtle.digest("SHA-256", await item.arrayBuffer()))] }
    if (item instanceof Date) return item.toISOString()
    if (Array.isArray(item)) return Promise.all(item.map(normalize))
    if (item && typeof item === "object") return Object.fromEntries(await Promise.all(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(async ([key, value]) => [key, await normalize(value)])))
    return item
  }
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(await normalize(value))))
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("")
}

export class DraftController implements LocalDraft {
  private state: DraftSnapshot = { ready: false, restored: false, saving: false, dirty: false, error: null, fields: {} }
  private revision = 0
  private submission?: RecordData["submission"]
  private listeners = new Set<() => void>()
  private queued: Promise<void> = Promise.resolve()
  private editedBeforeLoad = new Set<string>()
  private defaults: Record<string, unknown> = {}
  private initializing: Promise<void>
  private pending = 0
  private failure?: Error
  readonly key: string
  private readonly repository: DraftRepository
  constructor(scope: DraftScope, repository: DraftRepository) {
    this.repository = repository
    if (!scope.userId || !scope.form) throw new Error("Utilisateur et formulaire requis pour la sauvegarde locale.")
    this.key = JSON.stringify([scope.userId, scope.form, scope.shopId ?? null, scope.entityId ?? "new"])
    this.initializing = this.load()
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => this.state
  registerField(field: string, initial: unknown) {
    if (!sensitive.test(field) && !Object.hasOwn(this.state.fields, field)) this.defaults[field] = safeValue(initial)
  }
  private publish(patch: Partial<DraftSnapshot>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  private async load() {
    try {
      const record = await this.repository.read(this.key)
      this.revision = record?.revision ?? 0
      this.submission = record?.submission
      const restored = record && Object.keys(record.fields).length > 0
      const fields = { ...(record?.fields ?? {}) }
      for (const field of this.editedBeforeLoad) fields[field] = this.state.fields[field]
      this.publish({ ready: true, restored: Boolean(restored), dirty: Boolean(restored) || this.editedBeforeLoad.size > 0, fields })
    } catch {
      this.failure = new Error(storageMessage)
      this.publish({ ready: true, error: storageMessage })
    }
  }
  setField<T>(field: string, value: T | ((previous: T) => T), initial: T) {
    if (sensitive.test(field)) return
    const previous = Object.hasOwn(this.state.fields, field) ? this.state.fields[field] as T : initial
    const next = typeof value === "function" ? (value as (previous: T) => T)(previous) : value
    if (!this.state.ready) this.editedBeforeLoad.add(field)
    this.publish({ fields: { ...this.defaults, ...this.state.fields, [field]: safeValue(next) }, dirty: true })
    this.enqueue(() => this.persist())
  }
  private enqueue(work: () => Promise<void>) {
    this.pending++
    this.publish({ saving: true })
    this.queued = this.queued.then(async () => {
      await this.initializing
      if (this.failure) return
      try { await work() }
      catch (error) { this.failure = error instanceof Error ? error : new Error(storageMessage); this.publish({ error: this.failure.message }) }
    }).finally(() => { this.pending--; this.publish({ saving: this.pending > 0 }) })
  }
  private async persist(fields = this.state.fields, submission: RecordData["submission"] | null = this.submission) {
    const record: RecordData = { key: this.key, revision: this.revision + 1, fields: structuredClone(fields), submission: submission ?? undefined, updatedAt: new Date().toISOString() }
    await this.repository.write(record, this.revision)
    this.revision = record.revision
  }
  async flush() { await this.initializing; await this.queued; if (this.failure) throw this.failure }
  async submissionKey(payload: unknown) {
    await this.flush()
    const hash = await fingerprint(payload)
    if (this.submission?.fingerprint === hash) return this.submission.key
    const submission = { fingerprint: hash, key: crypto.randomUUID() }
    this.enqueue(async () => { await this.persist(this.state.fields, submission); this.submission = submission })
    await this.flush()
    return submission.key
  }
  async clear(expectedFields = this.state.fields) {
    await this.flush()
    let changed = false
    this.enqueue(async () => {
      if (this.state.fields !== expectedFields) { changed = true; return }
      // Garder une révision vide empêche un onglet ancien de ressusciter une saisie déjà enregistrée.
      await this.persist({}, null)
      this.submission = undefined
      if (this.state.fields !== expectedFields) { changed = true; return }
      this.publish({ fields: {}, dirty: false, restored: false })
    })
    await this.flush()
    if (changed) throw new Error("La saisie a changé pendant l’enregistrement. Les nouvelles modifications sont conservées.")
  }
}

const repository = new IndexedDraftRepository()
const controllers = new Map<string, DraftController>()
export function getLocalDraft(scope: DraftScope) {
  const key = JSON.stringify([scope.userId, scope.form, scope.shopId ?? null, scope.entityId ?? "new"])
  let draft = controllers.get(key)
  if (!draft) { draft = new DraftController(scope, repository); controllers.set(key, draft) }
  return draft
}
export function releaseLocalDrafts() { controllers.clear() }
