import { useCallback, useEffect, useSyncExternalStore } from "react"
import { apiVersion, subscribeApi } from "@/services/http-api"
import { cacheLifetime, queryCache } from "@/services/data-cache"
// Le chargeur est stabilisé par la clé complète de ses paramètres.
export function useApiData<T>(key: string, load: () => Promise<T>) {
  const revision = useSyncExternalStore(subscribeApi, apiVersion, apiVersion)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loader = useCallback(load, [key, revision])
  const subscribe = useCallback((listener: () => void) => queryCache.subscribe(key, listener), [key])
  const snapshot = useCallback(() => queryCache.snapshot<T>(key), [key])
  const state = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => {
    const ttl = cacheLifetime(key)
    const refresh = () => { if (document.visibilityState !== "hidden") void queryCache.read(key, loader, ttl).catch(() => {}) }
    void queryCache.read(key, loader, ttl).catch(() => {})
    const interval = setInterval(refresh, ttl)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh) }
  }, [key, loader])
  return state
}
