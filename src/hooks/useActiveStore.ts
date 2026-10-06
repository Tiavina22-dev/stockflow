import { useSyncExternalStore } from "react"
import type { Store } from "@/types"
import { useStores } from "./useStores"
import { getActiveStoreId, getServerActiveStoreId, setActiveStoreId, subscribeActiveStore } from "@/store/active-store"

export function useActiveStore(): [Store | undefined, (id: string) => void] {
  const { data: stores } = useStores()
  const id = useSyncExternalStore(subscribeActiveStore, getActiveStoreId, getServerActiveStoreId)
  const store = stores?.find(store => store.id === id) ?? stores?.[0]
  return [store, (nextId: string) => { if (stores?.some(s => s.id === nextId)) setActiveStoreId(nextId) }]
}
