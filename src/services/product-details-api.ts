import type { DetailDuProduit, PrixParMagasin } from "@/types"
import { api, invalidateApi } from "./http-api"

export const getDetailDuProduit = (id: string) => api<DetailDuProduit>(`/products/${encodeURIComponent(id)}/detail`)
export const getPrixParMagasin = (id: string) => api<PrixParMagasin[]>(`/products/${encodeURIComponent(id)}/shop-prices`)
export async function savePrixParMagasin(id: string, prices: PrixParMagasin[], expected: PrixParMagasin[]) {
  const payload = (rows: PrixParMagasin[]) => rows.map(r => ({ shopId: r.magasinId, price: r.prixDeVente === null ? null : String(r.prixDeVente) }))
  const result = await api<PrixParMagasin[]>(`/products/${encodeURIComponent(id)}/shop-prices`, "PATCH", { prices: payload(prices), expectedPrices: payload(expected) })
  invalidateApi()
  return result
}
