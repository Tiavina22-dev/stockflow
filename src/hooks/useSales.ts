import { useApiData } from "./useApiData"
import { getSales, getSalesSummary, getSellers, getSale, getBook, getBookSummary, searchProducts, saveSale } from "@/services/backend-api"
import type { FiltresDesVentes, FiltresDuCahier, Store } from "@/types"
export function useResumeDesVentesProvisoire(id: string | undefined, period: FiltresDesVentes["periode"]) { return useApiData(`sales-summary:${id}:${period}`, () => getSalesSummary(id, period)) }
export function useVentesProvisoires(f: FiltresDesVentes, _name?: string) { return useApiData(`sales:${JSON.stringify(f)}`, () => getSales(f)) }
export function useVendeursProvisoires(id?: string) { return useApiData(`sellers:${id}`, () => getSellers(id)) }
export function useDetailDeVenteProvisoire(id: string | null, _store?: Store) { return useApiData(`sale:${id}`, () => id ? getSale(id) : Promise.reject(new Error("Choisissez une vente."))) }
export function useRechercheProduitsVenteProvisoire(search: string, id?: string) { return useApiData(`sale-search:${id}:${search}`, () => searchProducts(id, search)).data ?? [] }
export function useCahierDeVenteProvisoire(f: FiltresDuCahier) { return useApiData(`book:${JSON.stringify(f)}`, () => getBook(f)) }
export function useResumeDuCahierProvisoire(id: string | undefined, date: string) { return useApiData(`book-summary:${id}:${date}`, () => getBookSummary(id, date)) }
export const enregistrerVenteProvisoire = saveSale
