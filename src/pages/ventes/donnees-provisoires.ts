/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #9).
 *
 * Reproduit les données de la maquette Figma « liste_des_ventes ».
 * Aucune logique ici : recherche, filtres et pagination ne sont PAS appliqués.
 * Signatures attendues côté Codex (mêmes retours) :
 *   useResumeDesVentes(storeId, periode)   → AsyncState<ResumeDesVentes>
 *   useVentes(filtres: FiltresDesVentes)   → AsyncState<Paginated<LigneDeVente>>
 *   useVendeurs(storeId)                   → AsyncState<Vendeur[]>
 */
import type {
  AsyncState,
  DetailDeVente,
  FiltresDesVentes,
  FiltresDuCahier,
  LigneDeVente,
  NouvelleVente,
  Paginated,
  ProduitRecherche,
  ResumeDesVentes,
  ResumeDuCahier,
  Store,
  Vendeur,
  VenteDuCahier,
} from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

const resume: ResumeDesVentes = {
  ventesAujourdHui: 48,
  ventesAujourdHuiEvolution: "+12 % vs hier",
  venteMontant: 3842.5,
  venteMontantEvolution: "+8,4 % vs hier",
  aVerifier: 3,
  aVerifierDetail: "Ventes en attente",
  ventesAnnulees: 1,
  ventesAnnuleesDetail: "Aujourd’hui",
}

const vendeurs: Vendeur[] = [
  { id: "u1", nom: "Chloé Martin" },
  { id: "u2", nom: "Hugo Bernard" },
  { id: "u3", nom: "Inès Petit" },
]

const lignes: Omit<LigneDeVente, "magasinNom">[] = [
  { id: "v8561", venteNumero: "#8561", venteDate: "2026-09-30T14:42:00", nombreProduits: 3, venteMontant: 42.9, utilisateurNom: "Chloé Martin", statut: "Validée" },
  { id: "v8560", venteNumero: "#8560", venteDate: "2026-09-30T14:18:00", nombreProduits: 5, venteMontant: 86.4, utilisateurNom: "Hugo Bernard", statut: "Validée" },
  { id: "v8559", venteNumero: "#8559", venteDate: "2026-09-30T13:55:00", nombreProduits: 2, venteMontant: 18.2, utilisateurNom: "Inès Petit", statut: "En attente" },
  { id: "v8558", venteNumero: "#8558", venteDate: "2026-09-30T13:02:00", nombreProduits: 2, venteMontant: 25.0, utilisateurNom: "Chloé Martin", statut: "Validée" },
  { id: "v8557", venteNumero: "#8557", venteDate: "2026-09-30T12:40:00", nombreProduits: 10, venteMontant: 154.75, utilisateurNom: "Hugo Bernard", statut: "Annulée" },
  { id: "v8556", venteNumero: "#8556", venteDate: "2026-09-30T11:21:00", nombreProduits: 4, venteMontant: 61.3, utilisateurNom: "Inès Petit", statut: "Validée" },
  { id: "v8555", venteNumero: "#8555", venteDate: "2026-09-30T10:47:00", nombreProduits: 6, venteMontant: 97.6, utilisateurNom: "Chloé Martin", statut: "Validée" },
  { id: "v8554", venteNumero: "#8554", venteDate: "2026-09-30T09:58:00", nombreProduits: 1, venteMontant: 12.5, utilisateurNom: "Hugo Bernard", statut: "En attente" },
]

export function useResumeDesVentesProvisoire(_storeId: string | undefined, _periode: FiltresDesVentes["periode"]) {
  return pret(resume)
}

export function useVentesProvisoires(filtres: FiltresDesVentes, magasin: string | undefined): AsyncState<Paginated<LigneDeVente>> {
  return pret({
    items: lignes.slice(0, filtres.pageSize).map((l) => ({ ...l, magasinNom: magasin ?? "—" })),
    total: 24,
    page: filtres.page,
    pageSize: filtres.pageSize,
  })
}

const catalogue: ProduitRecherche[] = [
  { id: "p1", produitNom: "Café noir 250g", reference: "SF-0001", detail: "Réf. SF-0001 · Épicerie", prixUnitaire: 6.9, stockDisponible: 128 },
  { id: "p2", produitNom: "Thé vert 100g", reference: "SF-0002", detail: "Réf. SF-0002 · Boissons", prixUnitaire: 4.5, stockDisponible: 12 },
  { id: "p4", produitNom: "Chocolat noir 70%", reference: "SF-0004", detail: "Réf. SF-0004 · Épicerie sucrée", prixUnitaire: 3.2, stockDisponible: 64 },
  { id: "p5", produitNom: "Miel de fleurs", reference: "SF-0005", detail: "Réf. SF-0005 · Épicerie sucrée", prixUnitaire: 8.9, stockDisponible: 8 },
  { id: "p6", produitNom: "Riz basmati 1kg", reference: "SF-0006", detail: "Réf. SF-0006 · Épicerie", prixUnitaire: 3.5, stockDisponible: 90 },
  { id: "p7", produitNom: "Huile d’olive 75cl", reference: "SF-0007", detail: "Réf. SF-0007 · Épicerie", prixUnitaire: 12.9, stockDisponible: 38 },
]

/** Provisoire — Codex : `useRechercheProduits(storeId, recherche)` (avec `prixUnitaire`). */
export function useRechercheProduitsVenteProvisoire(recherche: string): ProduitRecherche[] {
  const terme = recherche.trim().toLocaleLowerCase("fr-FR")
  if (!terme) return []
  return catalogue.filter((p) => `${p.produitNom} ${p.reference}`.toLocaleLowerCase("fr-FR").includes(terme))
}

/** Provisoire — Codex : `useEnregistrerVente(): (vente: NouvelleVente) => Promise<{ venteNumero: string }>` */
export function enregistrerVenteProvisoire(_vente: NouvelleVente): Promise<{ venteNumero: string }> {
  return Promise.resolve({ venteNumero: "#8562" })
}

/** Provisoire — Codex : `useDetailDeVente(venteId): AsyncState<DetailDeVente>` */
export function useDetailDeVenteProvisoire(venteId: string | null, magasin?: Store): AsyncState<DetailDeVente> {
  const ligne = lignes.find((l) => l.id === venteId)
  if (!ligne) return { data: undefined, isLoading: false, error: venteId ? "Vente introuvable." : null }
  const articles = catalogue.slice(0, Math.min(ligne.nombreProduits, 3)).map((p, i) => ({
    produitId: p.id,
    produitNom: p.produitNom,
    produitReference: p.reference,
    produitQuantite: i === 0 ? ligne.nombreProduits - Math.min(ligne.nombreProduits, 3) + 1 : 1,
    produitPrixUnitaire: p.prixUnitaire ?? 0,
  }))
  return pret({
    id: ligne.id,
    venteNumero: ligne.venteNumero,
    venteDate: ligne.venteDate,
    vendeurNom: ligne.utilisateurNom,
    magasinId: magasin?.id ?? "",
    magasinNom: magasin?.name ?? "—",
    statut: ligne.statut,
    articles,
    remise: 0,
    venteMontant: articles.reduce((s, a) => s + a.produitQuantite * a.produitPrixUnitaire, 0),
    note: "",
  })
}

const versArticle = (p: ProduitRecherche, quantite: number) => ({
  produitId: p.id,
  produitNom: p.produitNom,
  produitReference: p.reference,
  produitQuantite: quantite,
  produitPrixUnitaire: p.prixUnitaire ?? 0,
})

const ventesDuCahier: VenteDuCahier[] = [
  [lignes[0], [versArticle(catalogue[0], 2)]],
  [lignes[1], [versArticle(catalogue[1], 1), versArticle(catalogue[2], 2), versArticle(catalogue[5], 1)]],
  [lignes[3], [versArticle(catalogue[4], 1)]],
].map(([l, articles]) => {
  const ligne = l as (typeof lignes)[number]
  const liste = articles as VenteDuCahier["articles"]
  return {
    id: ligne.id,
    venteDate: ligne.venteDate,
    venteNumero: ligne.venteNumero,
    articles: liste,
    venteQuantite: liste.reduce((s, a) => s + a.produitQuantite, 0),
    venteMontant: liste.reduce((s, a) => s + a.produitQuantite * a.produitPrixUnitaire, 0),
    vendeurNom: ligne.utilisateurNom,
    statut: ligne.statut,
  }
})

/** Provisoire — Codex : `useCahierDeVente(filtres: FiltresDuCahier): AsyncState<Paginated<VenteDuCahier>>` */
export function useCahierDeVenteProvisoire(filtres: FiltresDuCahier): AsyncState<Paginated<VenteDuCahier>> {
  return pret({ items: ventesDuCahier.slice(0, filtres.pageSize), total: ventesDuCahier.length, page: filtres.page, pageSize: filtres.pageSize })
}

/** Provisoire — Codex : `useResumeDuCahier(storeId, date): AsyncState<ResumeDuCahier>` */
export function useResumeDuCahierProvisoire(_storeId: string | undefined, _date: string): AsyncState<ResumeDuCahier> {
  return pret({
    venteMontant: ventesDuCahier.reduce((s, v) => s + v.venteMontant, 0),
    ventes: ventesDuCahier.length,
    articles: ventesDuCahier.reduce((s, v) => s + v.venteQuantite, 0),
  })
}

export function useVendeursProvisoires(_storeId: string | undefined): AsyncState<Vendeur[]> {
  return pret(vendeurs)
}
