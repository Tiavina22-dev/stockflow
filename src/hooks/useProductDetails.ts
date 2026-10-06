import { useRef, useState } from "react"
import type { PrixParMagasin } from "@/types"
import { getDetailDuProduit, getPrixParMagasin, savePrixParMagasin } from "@/services/product-details-api"
import { queryCache } from "@/services/data-cache"
import { useApiData } from "./useApiData"
import { useCurrentUser } from "./useCurrentUser"

export function useDetailDuProduit(id: string) {
  return useApiData(`product-detail:${id}`, () => getDetailDuProduit(id))
}
export function useEnregistrerPrixParMagasin() {
  return async (id: string, prices: PrixParMagasin[], expected?: PrixParMagasin[]) => {
    const loaded = expected ?? queryCache.snapshot<PrixParMagasin[]>(`product-prices:${id}`).data ?? await getPrixParMagasin(id)
    await savePrixParMagasin(id, prices, loaded)
  }
}
export function usePrixParMagasin(id: string) {
  const user = useCurrentUser()
  const state = useApiData(`product-prices:${id}`, () => getPrixParMagasin(id))
  const save = useEnregistrerPrixParMagasin()
  const [version, setVersion] = useState(0)
  const owner = user.data?.id
  const initial = useRef<{ id: string; owner?: string; data?: PrixParMagasin[] }>({ id, owner })
  if (initial.current.id !== id || initial.current.owner !== owner) initial.current = { id, owner }
  if (!initial.current.data && state.data) initial.current.data = state.data
  return { ...state, data: initial.current.data ?? state.data, version: `${owner}:${id}:${version}`, enregistrer: async (prices: PrixParMagasin[], expected?: PrixParMagasin[]) => {
    await save(id, prices, expected ?? initial.current.data)
    initial.current.data = prices.filter(p => p.prixDeVente !== null)
    setVersion(v => v + 1)
  } }
}
