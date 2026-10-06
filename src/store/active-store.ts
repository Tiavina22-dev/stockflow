export const ACTIVE_STORE_KEY = "stockflow.activeStoreId"
const listeners = new Set<() => void>()
let activeId: string | undefined
let initialized = false
function validId(id: string | null | undefined) { return id || undefined }
function emit() { listeners.forEach(listener => listener()) }
export function getActiveStoreId() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true
    try { activeId = validId(window.localStorage.getItem(ACTIVE_STORE_KEY)) } catch { /* Stockage indisponible : état en mémoire. */ }
  }
  return activeId
}
export function setActiveStoreId(id: string) {
  if (!id) return
  initialized = true
  activeId = id
  try { window.localStorage.setItem(ACTIVE_STORE_KEY, id) } catch { /* La sélection reste utilisable en mémoire. */ }
  emit()
}
export function subscribeActiveStore(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_STORE_KEY || event.key === null) {
      activeId = validId(event.newValue)
      initialized = true
      emit()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage) }
}
export function getServerActiveStoreId() { return undefined }
