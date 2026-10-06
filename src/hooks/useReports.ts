import { useApiData } from "./useApiData"
import { api, download } from "@/services/http-api"
import type { ActiviteRecente, FiltresDeRapport, FormatDExport, OngletDeRapport, PeriodeDuTableauDeBord, PointDeVentes, ProduitPlusVendu, RapportDesPrix, RapportDesProduits, RapportDesVentes, RapportDuStock, ResumeDuTableauDeBord } from "@/types"
const query = (id: string | undefined, period: string, productId = "") => { if (!id) throw new Error("Choisissez un magasin."); return new URLSearchParams({ shopId: id, period, productId }).toString() }
function report<T>(kind: string, f: FiltresDeRapport, productId = "") { return api<T>(`/reports/${kind}?${query(f.storeId, f.periode, productId)}`) }
export function useRapportDesVentesProvisoire(f: FiltresDeRapport) { return useApiData(`report-sales:${JSON.stringify(f)}`, () => report<RapportDesVentes>("ventes", f)) }
export function useRapportDuStockProvisoire(f: FiltresDeRapport) { return useApiData(`report-stock:${JSON.stringify(f)}`, () => report<RapportDuStock>("stock", f)) }
export function useRapportDesProduitsProvisoire(f: FiltresDeRapport, productId: string) { return useApiData(`report-products:${JSON.stringify(f)}:${productId}`, () => report<RapportDesProduits>("produits", f, productId)) }
export function useRapportDesPrixProvisoire(f: FiltresDeRapport) { return useApiData(`report-prices:${JSON.stringify(f)}`, () => report<RapportDesPrix>("prix-ecarts", f)) }
type Dashboard = { resume: ResumeDuTableauDeBord; evolution: PointDeVentes[]; top: ProduitPlusVendu[]; activites: ActiviteRecente[] }
const dashboard = (id: string | undefined, period: PeriodeDuTableauDeBord) => api<Dashboard>(`/reports/dashboard?${query(id, period)}`)
export function useResumeDuTableauDeBordProvisoire(id?: string) { return useApiData(`dashboard-summary:${id}`, async () => (await dashboard(id, "7-jours")).resume) }
export function useEvolutionDesVentesProvisoire(id: string | undefined, period: PeriodeDuTableauDeBord) { return useApiData(`dashboard-sales:${id}:${period}`, async () => (await dashboard(id, period)).evolution) }
export function useProduitsLesPlusVendusProvisoire(id: string | undefined, period: PeriodeDuTableauDeBord) { return useApiData(`dashboard-top:${id}:${period}`, async () => (await dashboard(id, period)).top) }
export function useDernieresActivitesProvisoires(id?: string) { return useApiData(`dashboard-activity:${id}`, async () => (await dashboard(id, "7-jours")).activites) }
export const exporterRapportProvisoire = (kind: OngletDeRapport, format: FormatDExport, f: FiltresDeRapport, productId = "") => download(`/reports/export/${kind}?${query(f.storeId, f.periode, productId)}&format=${format}`, `stockflow-${kind}.${format === "excel" ? "xlsx" : format}`)
