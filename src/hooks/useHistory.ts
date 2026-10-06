import { useApiData } from "./useApiData"
import { api, download } from "@/services/http-api"
import type { FiltresDHistorique, FormatDExport, Paginated, OperationDHistorique, CompteursDHistorique } from "@/types"
function query(f: FiltresDHistorique) { return new URLSearchParams(Object.entries(f).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)])).toString() }
export function useHistorique(f: FiltresDHistorique) { return useApiData(`history:${query(f)}`, () => api<Paginated<OperationDHistorique>>(`/history?${query(f)}`)) }
export function useCompteursDHistorique(f: FiltresDHistorique) { return useApiData(`history-counts:${query(f)}`, () => api<CompteursDHistorique>(`/history/counts?${query(f)}`)) }
export function useUtilisateursDeLHistorique() { return useApiData("history-actors", () => api<{ id: string; nom: string }[]>("/history/actors")) }
export async function exporterHistorique(format: FormatDExport, f: FiltresDHistorique) { await download(`/history/export?${query(f)}&format=${format}`, `historique.${format === "excel" ? "xlsx" : format}`) }
export const useExporterHistorique = () => exporterHistorique
