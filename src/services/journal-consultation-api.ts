import type { CahierConsultable, DetailDuCahier, FiltresDesCahiers, Paginated } from "@/types"
import { api, photoData } from "./http-api"

export function getCahiersConsultables(f: FiltresDesCahiers) {
  const params = new URLSearchParams({ du: f.du, au: f.au, recherche: f.recherche, colonne: f.tri.colonne, sens: f.tri.sens, page: String(f.page), pageSize: String(f.pageSize) })
  if (f.magasinId) params.set("magasinId", f.magasinId)
  if (f.utilisateurId) params.set("utilisateurId", f.utilisateurId)
  return api<Paginated<CahierConsultable>>(`/cash-journals/consultation?${params}`)
}
export async function getDetailDuCahier(id: string | null): Promise<DetailDuCahier | undefined> {
  if (!id) return undefined
  const row = await api<DetailDuCahier>(`/cash-journals/consultation/${encodeURIComponent(id)}`)
  return { ...row, justificatifs: await Promise.all(row.justificatifs.map(async file => ({ ...file, url: await photoData(file.url) }))) }
}
export const getUtilisateursDesCahiers = () => api<{ id: string; nom: string }[]>("/cash-journals/consultation/users")
