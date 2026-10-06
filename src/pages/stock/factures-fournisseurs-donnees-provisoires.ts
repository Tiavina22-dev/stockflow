/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #23).
 *   useFacturesFournisseurs(f: FiltresDesFacturesFournisseurs) → AsyncState<Paginated<FactureFournisseur>>
 *   useDetailDeFactureFournisseur(id)                           → AsyncState<DetailDeFactureFournisseur>
 *   useFournisseurs()                                           → AsyncState<{ id: string; nom: string }[]>
 *   useValiderFactureFournisseur()                              → (id) => Promise<void>
 */
import type { AsyncState, DetailDeFactureFournisseur, FactureFournisseur, FiltresDesFacturesFournisseurs, Paginated } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

/** Aperçu d'une facture scannée (démonstration). */
function apercu(numero: string) {
  const lignes = Array.from({ length: 14 }, (_, i) => `<line x1="18" y1="${70 + i * 9}" x2="${i % 3 ? 126 : 100}" y2="${70 + i * 9}" stroke="#b9c2cf" stroke-width="3"/>`).join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="200"><rect width="144" height="200" fill="#fdfdfb"/><rect x="18" y="16" width="50" height="10" fill="#7f8b9c"/><text x="18" y="52" font-family="Arial" font-size="12" fill="#334455">${numero}</text>${lignes}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const factures: DetailDeFactureFournisseur[] = [
  {
    id: "fa458", numero: "FA-458", fournisseurNom: "ABC Matériaux", date: "2026-09-02", total: 1145000, statut: "Validé", reference: "FA-458",
    lignes: [
      { id: "l1", produitNom: "Ciment 50 kg", reference: "CIM-50", quantite: 20, prixFournisseur: 31000 },
      { id: "l2", produitNom: "Fer 8 mm", reference: "FER-08", quantite: 50, prixFournisseur: 10500 },
    ],
    pieceJointe: { nom: "facture_458.pdf", type: "PDF", tailleKo: 245, url: apercu("FA-458"), apercuUrl: apercu("FA-458") },
  },
  {
    id: "fa457", numero: "FA-457", fournisseurNom: "Mada Fer", date: "2026-09-01", total: 850000, statut: "Brouillon", reference: "BL-2201",
    lignes: [{ id: "l3", produitNom: "Fer 8 mm", reference: "FER-08", quantite: 80, prixFournisseur: 10625 }],
    pieceJointe: null,
  },
  {
    id: "fa456", numero: "FA-456", fournisseurNom: "Socimat", date: "2026-08-28", total: 620000, statut: "Validé", reference: "FA-456",
    lignes: [{ id: "l4", produitNom: "Ciment 50 kg", reference: "CIM-50", quantite: 20, prixFournisseur: 31000 }],
    pieceJointe: { nom: "facture_456.pdf", type: "PDF", tailleKo: 198, url: apercu("FA-456"), apercuUrl: apercu("FA-456") },
  },
]

export function useFacturesFournisseursProvisoires(f: FiltresDesFacturesFournisseurs): AsyncState<Paginated<FactureFournisseur>> {
  const r = f.recherche.trim().toLowerCase()
  const lignes = factures.filter(
    (x) => x.date >= f.du && x.date <= f.au && (!f.fournisseurId || x.fournisseurNom === f.fournisseurId) && (!r || `${x.numero} ${x.fournisseurNom}`.toLowerCase().includes(r))
  )
  const debut = (f.page - 1) * f.pageSize
  return pret({ items: lignes.slice(debut, debut + f.pageSize), total: lignes.length, page: f.page, pageSize: f.pageSize })
}

export function useDetailDeFactureFournisseurProvisoire(id: string | null): AsyncState<DetailDeFactureFournisseur> {
  return { data: factures.find((x) => x.id === id), isLoading: false, error: null }
}

export function useFournisseursProvisoires(): AsyncState<{ id: string; nom: string }[]> {
  return pret(["ABC Matériaux", "Mada Fer", "Socimat"].map((nom) => ({ id: nom, nom })))
}

export async function validerFactureFournisseurProvisoire(): Promise<void> {
  await new Promise((r) => setTimeout(r, 300))
}
