export type CachedState<T> = { data: T | undefined; isLoading: boolean; error: string | null }
type Entry<T> = { state: CachedState<T>; expires: number; pending?: Promise<T> }
const loading: CachedState<never> = { data: undefined, isLoading: true, error: null }

/** Une réponse antérieure à une invalidation ne peut pas remplir le cache. */
export class DataCache {
  private entries = new Map<string, Entry<unknown>>()
  private listeners = new Map<string, Set<() => void>>()
  private readonly now: () => number
  constructor(now: () => number = Date.now) { this.now = now }
  snapshot<T>(key: string): CachedState<T> { return (this.entries.get(key)?.state ?? loading) as CachedState<T> }
  subscribe(key: string, listener: () => void) {
    let listeners = this.listeners.get(key)
    if (!listeners) { listeners = new Set(); this.listeners.set(key, listeners) }
    listeners.add(listener)
    return () => { listeners.delete(listener); if (!listeners.size) this.listeners.delete(key) }
  }
  private notify(key: string) { this.listeners.get(key)?.forEach(listener => listener()) }
  read<T>(key: string, load: () => Promise<T>, ttl: number): Promise<T> {
    const saved = this.entries.get(key) as Entry<T> | undefined
    if (saved?.pending) return saved.pending
    if (saved && saved.expires > this.now()) return saved.state.error ? Promise.reject(new Error(saved.state.error)) : Promise.resolve(saved.state.data as T)
    const entry: Entry<T> = { state: saved?.state ?? loading, expires: 0 }
    this.entries.set(key, entry)
    entry.pending = Promise.resolve().then(load).then(data => {
      if (this.entries.get(key) === entry) {
        entry.state = { data, isLoading: false, error: null }; entry.expires = this.now() + ttl
        entry.pending = undefined; this.notify(key)
      }
      return data
    }, error => {
      if (this.entries.get(key) === entry) {
        entry.state = { data: saved?.state.data, isLoading: false, error: error instanceof Error ? error.message : "Impossible de charger les données." }
        entry.expires = this.now() + 5000; entry.pending = undefined; this.notify(key)
      }
      throw error
    })
    this.prune()
    return entry.pending
  }
  invalidate() { for (const [key, entry] of this.entries) this.entries.set(key, { state: entry.state, expires: 0 }) }
  clear() { this.entries.clear(); for (const key of this.listeners.keys()) this.notify(key) }
  private prune() {
    if (this.entries.size <= 256) return
    for (const [key, entry] of this.entries) {
      if (!entry.pending && !this.listeners.has(key)) this.entries.delete(key)
      if (this.entries.size <= 256) break
    }
  }
}
export const requestCache = new DataCache()
export const queryCache = new DataCache()
export const cacheLifetime = (key: string) => ["stores", "current-user", "/shops", "/auth/me"].includes(key) ? 300000 : 30000
