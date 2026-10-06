import { useApiData } from "./useApiData"
import { getSettings, getReferenceCatalog, getShops, saveSettings, saveReference, deleteReference, saveShop, deleteShop } from "@/services/administration-api"
import type { FiltresDesMagasins } from "@/types"
export function useParametresDuStock() { return useApiData("settings:stock", () => getSettings("stock")) }
export function useParametresDeVente() { return useApiData("settings:sales", () => getSettings("ventes")) }
export function useParametresDeFacturation() { return useApiData("settings:invoices", () => getSettings("facturation")) }
export function useCatalogueDeReference() { return useApiData("settings:references", getReferenceCatalog) }
export function useMagasinsDetailles(f: FiltresDesMagasins) { return useApiData(`settings:shops:${JSON.stringify(f)}`, () => getShops(f)) }
export const useEnregistrerParametres = () => saveSettings
export const useEnregistrerElementDeCatalogue = () => saveReference
export const useSupprimerElementDeCatalogue = () => deleteReference
export const useEnregistrerMagasin = () => saveShop
export const useSupprimerMagasin = () => deleteShop
