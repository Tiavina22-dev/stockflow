import { useApiData } from "./useApiData"
import { getCategories, getStockRows, getStockSummary, searchProducts, saveStock } from "@/services/backend-api"
import type { FiltresDuStock } from "@/types"
export function useResumeDuStockProvisoire(id?: string) { return useApiData(`stock-summary:${id}`, () => getStockSummary(id)) }
export function useLignesDeStockProvisoires(f: FiltresDuStock, _name?: string) { return useApiData(`stock:${JSON.stringify(f)}`, () => getStockRows(f)) }
export function useCategoriesDuStockProvisoires() { return useApiData("categories", getCategories) }
export function useRechercheProduitsProvisoire(search: string, id?: string) { return useApiData(`search:${id}:${search}`, () => searchProducts(id, search)).data ?? [] }
export const enregistrerOperationProvisoire = saveStock
