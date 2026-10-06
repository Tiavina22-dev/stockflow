import { getPrixAVerifier, deciderPrixAVerifier } from "@/services/supplier-price-review-api"
import { useApiData } from "./useApiData"

export function usePrixAVerifier(factureId?: string) {
  return useApiData(`supplier-price-review:${factureId}`, () => factureId ? getPrixAVerifier(factureId) : Promise.resolve(undefined))
}
export const useDeciderPrixAVerifier = () => deciderPrixAVerifier
