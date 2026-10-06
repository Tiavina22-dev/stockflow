/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #6).
 *
 * Reproduit les données de la maquette Figma « stock » pour pouvoir afficher l'écran.
 * Aucune logique ici : les filtres/tri/pagination ne sont PAS appliqués.
 * Signatures attendues côté Codex (mêmes retours) :
 *   useResumeDuStock(storeId)          → AsyncState<ResumeDuStock>
 *   useLignesDeStock(filtres)          → AsyncState<Paginated<LigneDeStock>>
 *   useCategoriesDuStock()             → AsyncState<string[]>
 */
import type {
  AsyncState,
  FiltresDuStock,
  LigneDeStock,
  OperationDeStock,
  Paginated,
  ProduitRecherche,
  ResumeDuStock,
} from "@/types"

const resume: ResumeDuStock = {
  produitsEnStock: 1248,
  produitDetail: "+12 références ce mois-ci",
  stockMontant: 128450,
  stockMontantDetail: "+8,4 % vs mois dernier",
  stockFaible: 23,
  stockFaibleDetail: "À réapprovisionner",
  ruptures: 7,
  rupturesDetail: "Produits indisponibles",
}

const lignes: Omit<LigneDeStock, "magasin">[] = [
  { id: "p1", produitNom: "Café noir 250g", sousTitre: "Stock suivi", reference: "SF-0001", categorie: "Épicerie", stockDisponible: 128, seuilAlerte: 30, etat: "Disponible" },
  { id: "p4", produitNom: "Chocolat noir 70%", sousTitre: "Stock suivi", reference: "SF-0004", categorie: "Épicerie sucrée", stockDisponible: 64, seuilAlerte: 20, etat: "Disponible" },
  { id: "p2", produitNom: "Thé vert 100g", sousTitre: "Stock suivi", reference: "SF-0002", categorie: "Boissons", stockDisponible: 12, seuilAlerte: 25, etat: "Stock faible" },
  { id: "p6", produitNom: "Riz basmati 1kg", sousTitre: "Stock suivi", reference: "SF-0006", categorie: "Épicerie", stockDisponible: 90, seuilAlerte: 40, etat: "Disponible" },
  { id: "p5", produitNom: "Miel de fleurs", sousTitre: "Stock suivi", reference: "SF-0005", categorie: "Épicerie sucrée", stockDisponible: 8, seuilAlerte: 15, etat: "Stock faible" },
  { id: "p7", produitNom: "Huile d’olive 75cl", sousTitre: "Stock suivi", reference: "SF-0007", categorie: "Épicerie", stockDisponible: 38, seuilAlerte: 20, etat: "Disponible" },
  { id: "p3", produitNom: "Sucre bio 500g", sousTitre: "Stock suivi", reference: "SF-0003", categorie: "Épicerie sucrée", stockDisponible: 0, seuilAlerte: 25, etat: "Rupture" },
  { id: "p9", produitNom: "Farine T65", sousTitre: "Stock suivi", reference: "SF-0009", categorie: "Épicerie", stockDisponible: 75, seuilAlerte: 30, etat: "Disponible" },
]

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

export function useResumeDuStockProvisoire(_storeId: string | undefined): AsyncState<ResumeDuStock> {
  return pret(resume)
}

export function useLignesDeStockProvisoires(
  filtres: FiltresDuStock,
  magasin: string | undefined
): AsyncState<Paginated<LigneDeStock>> {
  return pret({
    items: lignes.slice(0, filtres.pageSize).map((ligne) => ({ ...ligne, magasin: magasin ?? "—" })),
    total: 1248,
    page: filtres.page,
    pageSize: filtres.pageSize,
  })
}

/** Provisoire — Codex : `useRechercheProduits(storeId, recherche): AsyncState<ProduitRecherche[]>` */
export function useRechercheProduitsProvisoire(recherche: string): ProduitRecherche[] {
  const terme = recherche.trim().toLocaleLowerCase("fr-FR")
  if (!terme) return []
  return lignes
    .filter((l) => `${l.produitNom} ${l.reference}`.toLocaleLowerCase("fr-FR").includes(terme))
    .map((l) => ({ id: l.id, produitNom: l.produitNom, reference: l.reference, stockDisponible: l.stockDisponible }))
}

/** Provisoire — Codex : `useEnregistrerOperationDeStock(): (op: OperationDeStock) => Promise<void>` */
export function enregistrerOperationProvisoire(_operation: OperationDeStock): Promise<void> {
  return Promise.resolve()
}

export function useCategoriesDuStockProvisoires(): AsyncState<string[]> {
  return pret(["Épicerie", "Épicerie sucrée", "Boissons", "Frais", "Hygiène"])
}
