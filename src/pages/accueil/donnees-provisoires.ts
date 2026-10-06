/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #11).
 *   useResumeDuTableauDeBord(storeId)              → AsyncState<ResumeDuTableauDeBord>
 *   useEvolutionDesVentes(storeId, periode)         → AsyncState<PointDeVentes[]>
 *   useProduitsLesPlusVendus(storeId, periode)      → AsyncState<ProduitPlusVendu[]>  (5 premiers)
 *   useDernieresActivites(storeId)                  → AsyncState<ActiviteRecente[]>   (5 dernières)
 */
import type { ActiviteRecente, AsyncState, PeriodeDuTableauDeBord, PointDeVentes, ProduitPlusVendu, ResumeDuTableauDeBord } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

export function useResumeDuTableauDeBordProvisoire(_storeId: string | undefined): AsyncState<ResumeDuTableauDeBord> {
  return pret({
    ventesDes7DerniersJours: 312,
    ventesEvolution: "+12 % vs semaine précédente",
    chiffreDAffairesMensuel: 48250,
    chiffreDAffairesEvolution: "+8,4 % vs mois dernier",
    produitsEnStockFaible: 23,
    rupturesDeStock: 7,
  })
}

// Courbe montante comme dans la maquette
const montants7 = [620, 910, 1180, 1340, 1210, 1650, 1980]
const montants30 = Array.from({ length: 30 }, (_, i) => Math.round(900 + i * 28 + Math.sin(i / 2.2) * 180))
const montants12 = [18200, 21400, 19800, 24100, 26300, 25100, 28900, 31200, 29800, 34100, 38600, 42300]

function jours(n: number, montants: number[]): PointDeVentes[] {
  const aujourdHui = new Date()
  return montants.slice(-n).map((montant, i) => {
    const d = new Date(aujourdHui)
    d.setDate(d.getDate() - (n - 1 - i))
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, montant }
  })
}

function mois(montants: number[]): PointDeVentes[] {
  const aujourdHui = new Date()
  return montants.map((montant, i) => {
    const d = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth() - (montants.length - 1 - i), 1)
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, montant }
  })
}

export function useEvolutionDesVentesProvisoire(_storeId: string | undefined, periode: PeriodeDuTableauDeBord): AsyncState<PointDeVentes[]> {
  return pret(periode === "7-jours" ? jours(7, montants7) : periode === "30-jours" ? jours(30, montants30) : mois(montants12))
}

export function useProduitsLesPlusVendusProvisoire(_storeId: string | undefined, periode: PeriodeDuTableauDeBord): AsyncState<ProduitPlusVendu[]> {
  const facteur = periode === "7-jours" ? 1 : periode === "30-jours" ? 4 : 48
  return pret(
    [
      ["p1", "Café noir 250g", "Épicerie", 82],
      ["p7", "Huile d’olive 75cl", "Épicerie", 75],
      ["p4", "Chocolat noir 70%", "Épicerie sucrée", 58],
      ["p2", "Thé vert 100g", "Boissons", 48],
      ["p6", "Riz basmati 1kg", "Épicerie", 37],
    ].map(([produitId, produitNom, produitCategorie, q], i) => ({
      produitId: String(produitId),
      produitPosition: i + 1,
      produitNom: String(produitNom),
      produitCategorie: String(produitCategorie),
      quantiteVendue: Number(q) * facteur,
    }))
  )
}

export function useDernieresActivitesProvisoires(_storeId: string | undefined): AsyncState<ActiviteRecente[]> {
  const a = (h: string) => `${new Date().toISOString().slice(0, 10)}T${h}:00`
  return pret([
    { id: "a1", date: a("14:42"), type: "Vente", numero: "#8561", description: "Café noir 250g ×2", utilisateurNom: "Chloé Martin", montant: 42.9, statut: "Validée" },
    { id: "a2", date: a("14:05"), type: "Entrée stock", numero: "ENT-0042", description: "Réception fournisseur", utilisateurNom: "Hugo Bernard", montant: null, quantite: 120, statut: "Validée" },
    { id: "a3", date: a("13:55"), type: "Vente", numero: "#8560", description: "Huile d’olive 75cl", utilisateurNom: "Inès Petit", montant: 86.4, statut: "Validée" },
    { id: "a4", date: a("12:31"), type: "Correction stock", numero: "COR-0017", description: "Inventaire rayon épicerie", utilisateurNom: "Chloé Martin", montant: null, quantite: -3, statut: "Validée" },
    { id: "a5", date: a("11:10"), type: "Dépense", numero: "DEP-0009", description: "Sacs de caisse", utilisateurNom: "Hugo Bernard", montant: 35, statut: "En attente" },
  ])
}
