/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #12).
 *   useRapportDesVentes(filtres: FiltresDeRapport)   → AsyncState<RapportDesVentes>
 *   useRapportDuStock(filtres)                        → AsyncState<RapportDuStock>
 *   useRapportDesProduits(filtres, produitSuiviId)    → AsyncState<RapportDesProduits>
 *   useRapportDesPrix(filtres)                        → AsyncState<RapportDesPrix>
 *   useExporterRapport()                              → (onglet, format, filtres) => Promise<void>
 */
import type {
  AsyncState,
  FiltresDeRapport,
  RapportDesPrix,
  RapportDesProduits,
  RapportDesVentes,
  RapportDuStock,
} from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

const jour = (decalage: number) => {
  const d = new Date()
  d.setDate(d.getDate() - decalage)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const montantsVentes = [980, 1320, 1110, 1480, 1560, 1290, 1720, 1810, 1640, 1590, 1500, 1790, 1850, 1620, 2010, 2080, 1990, 2210, 2190, 2340, 2280, 2560, 2710, 3050]

export function useRapportDesVentesProvisoire(_filtres: FiltresDeRapport): AsyncState<RapportDesVentes> {
  const evolution = montantsVentes.map((montant, i, t) => {
    const fenetre = t.slice(Math.max(0, i - 6), i + 1)
    return { date: jour(t.length - 1 - i), montant, moyenne7Jours: Math.round(fenetre.reduce((s, v) => s + v, 0) / fenetre.length) }
  })
  return pret({
    chiffreDAffaires: { libelle: "Chiffre d’affaires", valeur: "45 880 Ar", evolution: "+12,4 % vs période précédente", tendance: "hausse" },
    nombreDeVentes: { libelle: "Nombre de ventes", valeur: "1 284", evolution: "+8,1 % vs période précédente", tendance: "hausse" },
    panierMoyen: { libelle: "Panier moyen", valeur: "35,73 Ar", evolution: "+3,9 % vs période précédente", tendance: "hausse" },
    ventesValidees: { libelle: "Ventes validées", valeur: "96,2 %", evolution: "−0,8 pt vs période précédente", tendance: "baisse" },
    evolution,
    meilleureJournee: { date: jour(0), montant: 3050, evolution: "+12,5 % vs meilleure journée précédente" },
    parVendeur: [
      { vendeurId: "u1", vendeurNom: "Chloé Martin", ventes: 412, montant: 15240 },
      { vendeurId: "u2", vendeurNom: "Hugo Bernard", ventes: 351, montant: 12380 },
      { vendeurId: "u3", vendeurNom: "Inès Petit", ventes: 286, montant: 9870 },
      { vendeurId: "u4", vendeurNom: "Karim Diallo", ventes: 158, montant: 5460 },
      { vendeurId: "u5", vendeurNom: "Léa Rakoto", ventes: 77, montant: 2930 },
    ],
    parHeure: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((heure, i) => ({
      heure,
      ventes: [18, 34, 58, 86, 104, 132, 118, 92, 84, 96, 112, 74, 52, 28][i],
    })),
    analyse: Array.from({ length: 12 }, (_, i) => ({
      id: `a${i}`,
      date: jour(i),
      magasinNom: ["Paris · République", "Lyon · Part-Dieu", "Paris · Bastille"][i % 3],
      ventes: 38 + ((i * 7) % 23),
      chiffreDAffaires: 1320 + ((i * 431) % 1700),
      panierMoyen: 31 + ((i * 3) % 9),
      statut: i === 3 ? ("En attente" as const) : ("Validée" as const),
    })),
  })
}

export function useRapportDuStockProvisoire(_filtres: FiltresDeRapport): AsyncState<RapportDuStock> {
  let cumul = 3200
  const mouvements = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((periode, i) => {
    const entrees = [420, 380, 510, 460, 620, 540, 700, 760][i]
    const sorties = [360, 410, 450, 500, 530, 590, 610, 680][i]
    cumul += entrees - sorties
    return { periode, entrees, sorties, stockCumule: cumul }
  })
  return pret({
    stockTotal: { libelle: "Stock total", valeur: "3 540 u.", evolution: "+4,3 % vs période précédente", tendance: "hausse" },
    stockEntrant: { libelle: "Stock entrant", valeur: "4 390 u.", evolution: "+9,8 % vs période précédente", tendance: "hausse" },
    valeurDuStock: { libelle: "Valeur du stock", valeur: "128 450 Ar", evolution: "+2,1 % vs période précédente", tendance: "hausse" },
    rotationMoyenne: { libelle: "Rotation moyenne", valeur: "4,2 fois", evolution: "+0,3 vs période précédente", tendance: "hausse" },
    mouvements,
    parMagasin: [
      { id: "m1", libelle: "Paris · République", valeur: 1320, valeurAffichee: "1 320 u." },
      { id: "m2", libelle: "Lyon · Part-Dieu", valeur: 980, valeurAffichee: "980 u." },
      { id: "m3", libelle: "Paris · Bastille", valeur: 760, valeurAffichee: "760 u." },
      { id: "m4", libelle: "Marseille · Vieux-Port", valeur: 480, valeurAffichee: "480 u." },
    ],
    rotationParCategorie: [
      { categorie: "Épicerie", rotation: 6.2 },
      { categorie: "Épicerie sucrée", rotation: 5.4 },
      { categorie: "Boissons", rotation: 4.6 },
      { categorie: "Frais", rotation: 4.9 },
      { categorie: "Hygiène", rotation: 3.1 },
      { categorie: "Autres", rotation: 2.4 },
    ],
    faibleRotation: [
      { produitId: "p8", produitNom: "Pâtes complètes", categorie: "Épicerie", stock: 140, ventes: 6 },
      { produitId: "p5", produitNom: "Miel de fleurs", categorie: "Épicerie sucrée", stock: 96, ventes: 9 },
      { produitId: "p9", produitNom: "Farine T65", categorie: "Épicerie", stock: 210, ventes: 14 },
      { produitId: "p11", produitNom: "Sel de Guérande", categorie: "Épicerie", stock: 88, ventes: 7 },
    ],
    transferts: [
      { id: "t1", trajet: "Paris → Lyon", produitNom: "Café noir 250g", quantite: 40 },
      { id: "t2", trajet: "Lyon → Marseille", produitNom: "Huile d’olive 75cl", quantite: 24 },
      { id: "t3", trajet: "Bastille → République", produitNom: "Thé vert 100g", quantite: 18 },
      { id: "t4", trajet: "Paris → Bastille", produitNom: "Riz basmati 1kg", quantite: 30 },
    ],
    analyse: [
      { id: "s1", produitNom: "Thé vert 100g", magasinNom: "Paris · République", stockInitial: 60, entrees: 20, sorties: 68, stockFinal: 12, valeur: 54, statut: "Faible stock" },
      { id: "s2", produitNom: "Miel de fleurs", magasinNom: "Paris · République", stockInitial: 30, entrees: 0, sorties: 22, stockFinal: 8, valeur: 71.2, statut: "Faible stock" },
      { id: "s3", produitNom: "Huile d’olive 75cl", magasinNom: "Lyon · Part-Dieu", stockInitial: 48, entrees: 24, sorties: 50, stockFinal: 22, valeur: 283.8, statut: "Stock bas" },
      { id: "s4", produitNom: "Café noir 250g", magasinNom: "Paris · République", stockInitial: 110, entrees: 120, sorties: 102, stockFinal: 128, valeur: 883.2, statut: "Normal" },
      { id: "s5", produitNom: "Sucre bio 500g", magasinNom: "Paris · Bastille", stockInitial: 25, entrees: 0, sorties: 25, stockFinal: 0, valeur: 0, statut: "Rupture" },
    ],
  })
}

const produitsSuivis = [
  { produitId: "p1", produitNom: "Café noir 250g" },
  { produitId: "p7", produitNom: "Huile d’olive 75cl" },
  { produitId: "p4", produitNom: "Chocolat noir 70%" },
]

export function useRapportDesProduitsProvisoire(_filtres: FiltresDeRapport, produitSuiviId: string): AsyncState<RapportDesProduits> {
  const base = produitSuiviId === "p7" ? 9 : produitSuiviId === "p4" ? 14 : 18
  return pret({
    produitsVendus: { libelle: "Produits vendus", valeur: "1 287", evolution: "+12,8 % vs période précédente", tendance: "hausse" },
    nouveauxProduits: { libelle: "Nouveaux produits", valeur: "12", evolution: "+2 vs période précédente", tendance: "hausse" },
    produitsActifs: { libelle: "Produits actifs", valeur: "1 452", evolution: "+4,8 % vs période précédente", tendance: "hausse" },
    margeMoyenne: { libelle: "Marge moyenne", valeur: "27,8 %", evolution: "+4,2 % vs période précédente", tendance: "hausse" },
    parCategorie: [
      { categorie: "Épicerie", chiffreDAffaires: 18400, marge: 24 },
      { categorie: "Épicerie sucrée", chiffreDAffaires: 12600, marge: 31 },
      { categorie: "Boissons", chiffreDAffaires: 9800, marge: 35 },
      { categorie: "Frais", chiffreDAffaires: 8700, marge: 18 },
      { categorie: "Hygiène", chiffreDAffaires: 6200, marge: 29 },
      { categorie: "Autres", chiffreDAffaires: 4100, marge: 22 },
    ],
    enProgression: [
      { produitId: "p1", produitNom: "Café noir 250g", produitCategorie: "Épicerie", evolution: 18.4 },
      { produitId: "p7", produitNom: "Huile d’olive 75cl", produitCategorie: "Épicerie", evolution: 15.6 },
      { produitId: "p4", produitNom: "Chocolat noir 70%", produitCategorie: "Épicerie sucrée", evolution: 12.1 },
      { produitId: "p2", produitNom: "Thé vert 100g", produitCategorie: "Boissons", evolution: 9.3 },
      { produitId: "p6", produitNom: "Riz basmati 1kg", produitCategorie: "Épicerie", evolution: 6.7 },
    ],
    enBaisse: [
      { produitId: "p8", produitNom: "Pâtes complètes", produitCategorie: "Épicerie", evolution: -21.5 },
      { produitId: "p5", produitNom: "Miel de fleurs", produitCategorie: "Épicerie sucrée", evolution: -14.2 },
      { produitId: "p11", produitNom: "Sel de Guérande", produitCategorie: "Épicerie", evolution: -9.8 },
      { produitId: "p9", produitNom: "Farine T65", produitCategorie: "Épicerie", evolution: -7.4 },
      { produitId: "p3", produitNom: "Sucre bio 500g", produitCategorie: "Épicerie sucrée", evolution: -5.1 },
    ],
    produitsSuivis,
    evolutionProduit: Array.from({ length: 16 }, (_, i) => {
      const ventes = base + Math.round(i * 1.4 + Math.sin(i) * 3)
      return { date: jour(15 - i), ventes, chiffreDAffaires: Math.round(ventes * (produitSuiviId === "p7" ? 12.9 : produitSuiviId === "p4" ? 3.2 : 6.9)) }
    }),
    classement: [
      { rang: 1, produitId: "p1", produitNom: "Café noir 250g", categorie: "Épicerie", stock: 128, chiffreDAffaires: 5660, ventes: 820, evolution: 18.4 },
      { rang: 2, produitId: "p7", produitNom: "Huile d’olive 75cl", categorie: "Épicerie", stock: 38, chiffreDAffaires: 4830, ventes: 375, evolution: 15.6 },
      { rang: 3, produitId: "p4", produitNom: "Chocolat noir 70%", categorie: "Épicerie sucrée", stock: 64, chiffreDAffaires: 1860, ventes: 580, evolution: 12.1 },
      { rang: 4, produitId: "p2", produitNom: "Thé vert 100g", categorie: "Boissons", stock: 12, chiffreDAffaires: 2160, ventes: 480, evolution: 9.3 },
      { rang: 5, produitId: "p6", produitNom: "Riz basmati 1kg", categorie: "Épicerie", stock: 90, chiffreDAffaires: 1295, ventes: 370, evolution: 6.7 },
    ],
  })
}

export function useRapportDesPrixProvisoire(_filtres: FiltresDeRapport): AsyncState<RapportDesPrix> {
  const lignes: [string, string, string, number, number, string][] = [
    ["Café noir 250g", "Paris · République", jour(0), 6.9, 6.5, "Chloé Martin"],
    ["Huile d’olive 75cl", "Lyon · Part-Dieu", jour(1), 12.9, 13.9, "Hugo Bernard"],
    ["Thé vert 100g", "Paris · Bastille", jour(1), 4.5, 3.9, "Inès Petit"],
    ["Miel de fleurs", "Paris · République", jour(2), 8.9, 9.5, "Chloé Martin"],
    ["Chocolat noir 70%", "Marseille · Vieux-Port", jour(3), 3.2, 2.9, "Karim Diallo"],
    ["Riz basmati 1kg", "Lyon · Part-Dieu", jour(4), 3.5, 3.9, "Hugo Bernard"],
    ["Farine T65", "Paris · Bastille", jour(5), 1.3, 1.1, "Inès Petit"],
  ]
  return pret({
    ecartsDetectes: { libelle: "Écarts détectés", valeur: "37", evolution: "+6 vs période précédente", tendance: "baisse" },
    produitsConcernes: { libelle: "Produits concernés", valeur: "18", evolution: "−3 vs période précédente", tendance: "hausse" },
    montantImpacte: { libelle: "Montant impacté", valeur: "−412 Ar", evolution: "−9,5 % vs période précédente", tendance: "hausse" },
    modificationsDePrix: { libelle: "Modifications de prix", valeur: "54", evolution: "+11 vs période précédente", tendance: "stable" },
    ecarts: lignes.map(([produitNom, magasinNom, date, prixAttendu, prixPratique, utilisateurNom], i) => ({
      id: `e${i}`,
      date,
      produitNom,
      magasinNom,
      prixAttendu,
      prixPratique,
      ecart: Math.round((prixPratique - prixAttendu) * 100) / 100,
      utilisateurNom,
    })),
    plusGrosEcarts: [
      { id: "g1", libelle: "Huile d’olive 75cl", valeur: 96, valeurAffichee: "96 Ar" },
      { id: "g2", libelle: "Café noir 250g", valeur: 78, valeurAffichee: "78 Ar" },
      { id: "g3", libelle: "Thé vert 100g", valeur: 64, valeurAffichee: "64 Ar" },
      { id: "g4", libelle: "Miel de fleurs", valeur: 45, valeurAffichee: "45 Ar" },
      { id: "g5", libelle: "Chocolat noir 70%", valeur: 32, valeurAffichee: "32 Ar" },
    ],
    evolutionDesEcarts: Array.from({ length: 20 }, (_, i) => ({ date: jour(19 - i), ecart: Math.round(Math.sin(i * 1.7) * 28 + (i % 3 === 0 ? 12 : -4)) })),
    magasinsAvecPlusDEcarts: [
      { id: "m1", libelle: "Paris · République", valeur: 14, valeurAffichee: "14 écarts" },
      { id: "m2", libelle: "Lyon · Part-Dieu", valeur: 11, valeurAffichee: "11 écarts" },
      { id: "m3", libelle: "Paris · Bastille", valeur: 7, valeurAffichee: "7 écarts" },
      { id: "m4", libelle: "Marseille · Vieux-Port", valeur: 5, valeurAffichee: "5 écarts" },
    ],
  })
}

export function exporterRapportProvisoire(): Promise<void> {
  return Promise.resolve()
}
