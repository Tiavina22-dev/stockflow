/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #22).
 *   useCahiersConsultables(f: FiltresDesCahiers) → AsyncState<Paginated<CahierConsultable>>
 *   useDetailDuCahier(id)                        → AsyncState<DetailDuCahier>
 *   useUtilisateursDesCahiers()                  → AsyncState<{ id: string; nom: string }[]>
 * Filtrage de démonstration simple sur ces quelques lignes (tri, recherche, période).
 */
import type { AsyncState, CahierConsultable, DetailDuCahier, FiltresDesCahiers, Paginated } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

/** Page de cahier papier dessinée (aperçu de justificatif de démonstration). */
function papier(texte: string) {
  const lignes = Array.from({ length: 9 }, (_, i) => `<line x1="70" y1="${60 + i * 20}" x2="300" y2="${52 + i * 20}" stroke="#9aa6b8" stroke-width="2"/>`).join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="496" height="264"><rect width="496" height="264" fill="#efe6d2"/><rect x="40" y="24" width="300" height="220" fill="#fbf8ef" transform="rotate(-4 190 134)"/>${lignes}<text x="80" y="48" font-family="Arial" font-size="16" fill="#334455">${texte}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const cahiers: DetailDuCahier[] = [
  {
    id: "c123", numero: "#123", identifiant: "CAH-2026-00123", date: "2026-09-30", magasinNom: "Ambatomainty",
    totalVentes: 235000, depenses: 20000, versement: 215000, ecart: 0, statut: "Validé", saisiPar: "Chloé Martin",
    depensesDuJour: [
      { id: "d1", libelle: "Transport", montant: 15000, note: "Livraison fournisseur" },
      { id: "d2", libelle: "Divers", montant: 5000, note: "Petit matériel" },
    ],
    justificatifs: [
      { id: "j1", nom: "Transport_3009.jpg", url: papier("Transport 30/09") },
      { id: "j2", nom: "Matériel_3009.jpg", url: papier("Matériel 30/09") },
    ],
  },
  {
    id: "c122", numero: "#122", identifiant: "CAH-2026-00122", date: "2026-09-29", magasinNom: "Salamamy",
    totalVentes: 180000, depenses: 15000, versement: 160000, ecart: -5000, statut: "Validé", saisiPar: "Hugo Bernard",
    depensesDuJour: [{ id: "d3", libelle: "Transport", montant: 15000, note: "" }],
    justificatifs: [{ id: "j3", nom: "Cahier_2909.jpg", url: papier("Cahier 29/09") }],
  },
  {
    id: "c121", numero: "#121", identifiant: "CAH-2026-00121", date: "2026-09-28", magasinNom: "Ambatomainty",
    totalVentes: 300000, depenses: 30000, versement: 275000, ecart: 5000, statut: "Validé", saisiPar: "Chloé Martin",
    depensesDuJour: [{ id: "d4", libelle: "Divers", montant: 30000, note: "Réparation étagère" }],
    justificatifs: [],
  },
]

export function useCahiersConsultablesProvisoires(f: FiltresDesCahiers): AsyncState<Paginated<CahierConsultable>> {
  const r = f.recherche.trim().toLowerCase()
  const cle = f.tri.colonne === "magasin" ? "magasinNom" : f.tri.colonne
  const lignes = cahiers
    .filter((c) => c.date >= f.du && c.date <= f.au && (!r || `${c.numero} ${c.identifiant} ${c.magasinNom}`.toLowerCase().includes(r)))
    .sort((a, b) => {
      const va = a[cle] ?? -Infinity
      const vb = b[cle] ?? -Infinity
      return (va < vb ? -1 : va > vb ? 1 : 0) * (f.tri.sens === "asc" ? 1 : -1)
    })
  const debut = (f.page - 1) * f.pageSize
  return pret({ items: lignes.slice(debut, debut + f.pageSize), total: lignes.length, page: f.page, pageSize: f.pageSize })
}

export function useDetailDuCahierProvisoire(id: string | null): AsyncState<DetailDuCahier> {
  return { data: cahiers.find((c) => c.id === id), isLoading: false, error: null }
}

export function useUtilisateursDesCahiersProvisoires(): AsyncState<{ id: string; nom: string }[]> {
  return pret([
    { id: "u1", nom: "Chloé Martin" },
    { id: "u2", nom: "Hugo Bernard" },
  ])
}
