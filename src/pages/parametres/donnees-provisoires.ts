/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #14).
 * Aucune logique : rien n'est enregistré, la recherche et le filtre des magasins ne sont PAS appliqués.
 *   useParametresDuStock()                → AsyncState<ParametresDuStock>
 *   useParametresDeVente()                → AsyncState<ParametresDeVente>
 *   useParametresDeFacturation()          → AsyncState<ParametresDeFacturation>
 *   useEnregistrerParametres()            → (rubrique, valeurs) => Promise<void>
 *   useCatalogueDeReference()             → AsyncState<CatalogueDeReference>
 *   useEnregistrerElementDeCatalogue()    → (type, { id?, nom, description }) => Promise<void>
 *   useSupprimerElementDeCatalogue()      → (type, id) => Promise<void>   (refus si des produits l'utilisent)
 *   useMagasinsDetailles(filtres)         → AsyncState<MagasinDetaille[]>
 *   useEnregistrerMagasin()               → (m: MagasinSaisi) => Promise<void>
 *   useSupprimerMagasin()                 → (id) => Promise<void>   (refus pour le magasin principal ou avec du stock)
 */
import type {
  AsyncState,
  CatalogueDeReference,
  FiltresDesMagasins,
  MagasinDetaille,
  ParametresDeFacturation,
  ParametresDeVente,
  ParametresDuStock,
} from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })
const attendre = () => new Promise((r) => setTimeout(r, 250))

export function useParametresDuStockProvisoire(): AsyncState<ParametresDuStock> {
  return pret({
    autoriserStockNegatif: false,
    alerteStockInsuffisant: true,
    seuilParDefautDeStockFaible: 10,
    validationObligatoirePourInventaire: true,
    autoriserTransfertsEntreMagasins: true,
    motifObligatoirePourCorrection: true,
    alerteStockFaible: true,
    alerteRuptureDeStock: true,
  })
}

export function useParametresDeVenteProvisoire(): AsyncState<ParametresDeVente> {
  return pret({
    prefixeNumeroDeVente: "VTE",
    formatDeNumeroDeVente: "AAAA-NNNNN",
    prochainNumero: 125,
    autoriserBrouillons: true,
    imprimerRecuApresValidation: true,
    autoriserAnnulation: true,
    clientObligatoire: true,
    motifObligatoirePourAnnulation: true,
    autoriserModificationApresValidation: false,
    modesDePaiement: ["especes"],
    afficherHeuresDansLeCahier: true,
    afficherVentesAnnulees: true,
    nombreDeVentesParPage: 20,
  })
}

export function useParametresDeFacturationProvisoire(): AsyncState<ParametresDeFacturation> {
  return pret({
    coordonneesFiscales: "Quincaillerie XYZ SARL",
    nif: "4001234567",
    stat: "46521 11 2019 0 01234",
    rcs: "2019 B 00123",
    adresse: "Lot II J 45, Analakely, Antananarivo 101",
    telephone: "+261 34 12 345 67",
    email: "contact@quincaillerie-xyz.mg",
    devise: "MGA",
    prefixeDeFacture: "FAC",
    formatDuNumeroDeFacture: "AAAA-NNNNN",
    prochainNumero: 58,
    affichageSurLaFacture: "a4",
    afficherLogo: true,
    afficherAdresse: true,
    afficherIdentifiantsFiscaux: true,
    afficherTelephoneEtEmail: true,
    afficherInformationsClient: true,
    afficherConditionsDePaiement: true,
  })
}

export async function enregistrerParametresProvisoire(): Promise<void> {
  await attendre()
}

export function useCatalogueDeReferenceProvisoire(): AsyncState<CatalogueDeReference> {
  return pret({
    categories: [
      { id: "c1", nom: "Matériaux", nombreDeProduits: 134, description: "Ciment, sable, briques, agrégats" },
      { id: "c2", nom: "Peinture", nombreDeProduits: 76, description: "Peintures, vernis et accessoires" },
      { id: "c3", nom: "Quincaillerie", nombreDeProduits: 213, description: "Visserie, serrurerie, fixations" },
      { id: "c4", nom: "Électricité", nombreDeProduits: 158, description: "Câbles, prises, éclairage" },
      { id: "c5", nom: "Plomberie", nombreDeProduits: 102, description: "Tubes, raccords, robinetterie" },
      { id: "c6", nom: "Outillage", nombreDeProduits: 96, description: "Outils à main et électroportatifs" },
    ],
    unites: [
      { id: "un1", nom: "Pièce", description: "Article vendu à l’unité" },
      { id: "un2", nom: "Sac", description: "Ciment, plâtre, chaux" },
      { id: "un3", nom: "Mètre", description: "Câbles, tuyaux, chaînes" },
      { id: "un4", nom: "Kilogramme", description: "Clous, fils, produits en vrac" },
      { id: "un5", nom: "Litre", description: "Peintures, solvants" },
      { id: "un6", nom: "Boîte", description: "Visserie, chevilles" },
    ],
    marques: [
      { id: "m1", nom: "Cimenc", nombreDeProduits: 42, description: "Ciments et liants" },
      { id: "m2", nom: "Sika", nombreDeProduits: 28, description: "Adjuvants et étanchéité" },
      { id: "m3", nom: "Total", nombreDeProduits: 31, description: "Lubrifiants et huiles" },
      { id: "m4", nom: "Legrand", nombreDeProduits: 46, description: "Appareillage électrique" },
      { id: "m5", nom: "Ingco", nombreDeProduits: 57, description: "Outillage" },
    ],
  })
}

export async function enregistrerElementDeCatalogueProvisoire(): Promise<void> {
  await attendre()
}

const magasins: MagasinDetaille[] = [
  { id: "s1", nom: "Paris · République", code: "MAG-001", responsable: "Chloé Martin", telephone: "+33 1 42 00 00 01", email: "republique@stockflow.fr", adresse: "12 place de la République, 75011 Paris", principal: true, statut: "Actif" },
  { id: "s2", nom: "Paris · Bastille", code: "MAG-002", responsable: "Léa Rakoto", telephone: "+33 1 42 00 00 02", email: "", adresse: "4 rue de la Roquette, 75011 Paris", principal: false, statut: "Actif" },
  { id: "s3", nom: "Lyon · Part-Dieu", code: "MAG-003", responsable: "Inès Petit", telephone: "+33 4 72 00 00 03", email: "partdieu@stockflow.fr", adresse: "17 rue du Docteur Bouchut, 69003 Lyon", principal: false, statut: "Actif" },
  { id: "s4", nom: "Marseille · Vieux-Port", code: "MAG-004", responsable: "Karim Diallo", telephone: "+33 4 91 00 00 04", email: "", adresse: "2 quai du Port, 13002 Marseille", principal: false, statut: "Inactif" },
]

export function useMagasinsDetaillesProvisoires(_filtres: FiltresDesMagasins): AsyncState<MagasinDetaille[]> {
  return pret(magasins)
}

export async function enregistrerMagasinProvisoire(): Promise<void> {
  await attendre()
}
