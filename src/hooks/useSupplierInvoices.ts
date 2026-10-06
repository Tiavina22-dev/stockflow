import type { FiltresDesFacturesFournisseurs } from "@/types"
import { getFacturesFournisseurs, getDetailDeFactureFournisseur, getFournisseurs, validateFactureFournisseur } from "@/services/supplier-invoices-api"
import { useApiData } from "./useApiData"
import { useActiveStore } from "./useActiveStore"

export function useFacturesFournisseurs(f: FiltresDesFacturesFournisseurs) {
  const [store] = useActiveStore()
  return useApiData(`supplier-invoices:${store?.id}:${JSON.stringify(f)}`, () => store ? getFacturesFournisseurs(f, store.id) : Promise.resolve(undefined))
}
export function useDetailDeFactureFournisseur(id: string | null) {
  return useApiData(`supplier-invoice:${id}`, () => getDetailDeFactureFournisseur(id))
}
export function useFournisseurs() {
  const [store] = useActiveStore()
  return useApiData(`suppliers:${store?.id}`, () => store ? getFournisseurs(store.id) : Promise.resolve(undefined))
}
export const useValiderFactureFournisseur = () => validateFactureFournisseur
