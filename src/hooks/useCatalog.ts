import { useApiData } from "./useApiData"
import { getCatalog, getProduct, saveProduct } from "@/services/backend-api"
import type { FiltresDesProduits } from "@/types"
export function useProduitsDuCatalogueProvisoires(f: FiltresDesProduits) { return useApiData(`catalog:${JSON.stringify(f)}`, () => getCatalog(f)) }
export const produitSaisiProvisoire = getProduct
export const enregistrerProduitProvisoire = saveProduct
