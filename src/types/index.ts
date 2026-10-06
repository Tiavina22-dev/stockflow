/**
 * CONTRAT PARTAGÉ UI ↔ LOGIQUE
 *
 * Ces types sont la frontière entre l'interface (Claude) et la logique (Codex).
 * - L'UI affiche ces types via des props, sans savoir d'où viennent les données.
 * - La logique (hooks/services) produit exactement ces types.
 *
 * Toute modification ici doit être notée dans docs/COORDINATION.md.
 */

/** Statut affiché par les badges (kit : Status/Badge). */
export type Status = "Validé" | "En attente" | "Annulé" | "Stock faible" | "Faible" | "Rupture"

/** Couleur sémantique d'une tendance ou d'un statut. */
export type Tone = "success" | "warning" | "danger"

export type User = {
  id: string
  firstName: string
  /** Nom complet, ex. « Chloé Martin » */
  name: string
  /** Fonction, ex. « Responsable magasin » */
  role: string
  /** Initiales pour l'avatar, ex. « CM » */
  initials: string
}

export type Store = {
  id: string
  /** Libellé affiché, ex. « Paris · République » */
  name: string
}

/** Ligne du tableau produits (kit : Data/Table). */
export type ProductRow = {
  id: string
  name: string
  quantity: number
  /** Valeur du stock en ariary (Ar) (nombre brut, l'UI formate). */
  value: number
  status: Status
}

/** Données d'une carte KPI (kit : Data/KPI card). */
export type Kpi = {
  id: string
  title: string
  subtitle: string
  /** Valeur déjà formatée pour l'affichage, ex. « 128 450 Ar » */
  value: string
  /** Variation en %, ex. 8.4 pour +8,4 % */
  trend: number
  trendLabel: string
  /** Points de la sparkline ; absent = carte sans graphique */
  series?: number[]
  /** Facultatif : sinon success si trend ≥ 0, warning sinon */
  tone?: Tone
}

/* ------------------------------------------------------------------ */
/* Écran « stock » (Figma node 90:4459) — noms repris des calques Figma */
/* ------------------------------------------------------------------ */

/** Calque `etat` de la liste : pastille d'état du stock. */
export type EtatDuStock = "Disponible" | "Stock faible" | "Rupture"

/** Calque `tri` des filtres. */
export type TriDuStock = "nom-asc" | "nom-desc" | "stock-asc" | "stock-desc"

/** Calque `produit` : une ligne de la « Liste des produits ». */
export type LigneDeStock = {
  id: string
  /** `produit_nom` */
  produitNom: string
  /** `sous_titre`, ex. « Stock suivi » */
  sousTitre: string
  /** Colonne RÉFÉRENCE (SKU) */
  reference: string
  /** Colonne CATÉGORIE */
  categorie: string
  /** Colonne MAGASIN (libellé du magasin) */
  magasin: string
  /** Colonne STOCK DISPONIBLE (unités) */
  stockDisponible: number
  /** Colonne SEUIL D'ALERTE (unités) */
  seuilAlerte: number
  /** Colonne ÉTAT */
  etat: EtatDuStock
}

/** Calque `indicateurs_cles` : les 4 cartes au-dessus de la liste. */
export type ResumeDuStock = {
  /** `produits_en_stock` (nombre de références) */
  produitsEnStock: number
  /** `produit_detail`, ex. « +12 ce mois-ci » */
  produitDetail: string
  /** `stock_montant` en ariary (Ar) (nombre brut, l'UI formate) */
  stockMontant: number
  /** `stock_detail` de la carte valeur, ex. « +4,2 % vs mois dernier » */
  stockMontantDetail: string
  /** `stock_faible` (nombre de produits sous le seuil) */
  stockFaible: number
  stockFaibleDetail: string
  /** `ruptures` (nombre de produits à 0) */
  ruptures: number
  rupturesDetail: string
}

/** Calque `filtres` + `recherche` + pagination de la liste. */
export type FiltresDuStock = {
  storeId: string | undefined
  /** `recherche` : produit, référence ou code-barres */
  recherche: string
  /** `categorie` ; null = toutes */
  categorie: string | null
  /** `etat_du_stock` ; null = tous */
  etatDuStock: EtatDuStock | null
  /** `tri` */
  tri: TriDuStock
  page: number
  /** `pagination_par_page` */
  pageSize: number
}

/* ------------------------------------------------------------------ */
/* Opérations de stock (Figma : nouvelle_operation_de_stock_fenetre,   */
/* entree / sortie / retour_client / transfert / correction_inventaire) */
/* ------------------------------------------------------------------ */

export type TypeOperationDeStock = "entree" | "sortie" | "retour" | "transfert" | "correction"

/** Produit proposé par la recherche `recherche_de_produit`. */
export type ProduitRecherche = {
  id: string
  produitNom: string
  reference: string
  /** Stock actuel dans le magasin choisi (facultatif, affiché si fourni) */
  stockDisponible?: number
  /** Prix de vente TTC en ariary (Ar) (nécessaire pour la nouvelle vente) */
  prixUnitaire?: number
  /** `produit_detail`, ex. « Réf. SF-0001 · 250 g » */
  detail?: string
  /** `photo` du produit */
  photoUrl?: string
}

/** Calque `produit` d'une fenêtre d'opération. */
export type LigneOperationDeStock = {
  produitId: string
  produitNom: string
  /** `quantite` (> 0 ; pour une correction : quantité comptée) */
  quantite: number
  /** `motif` */
  motif: string
}

/** Ce que l'UI envoie quand on clique « Enregistrer » (brouillon) ou « Valider ». */
export type OperationDeStock = {
  type: TypeOperationDeStock
  /** Magasin (ou magasin d'origine pour un transfert) */
  magasinId: string
  /** Transfert uniquement */
  magasinDestinationId?: string
  lignes: LigneOperationDeStock[]
  note: string
  statut: "brouillon" | "validee"
}

/* ------------------------------------------------------------------ */
/* Ventes (Figma : liste_des_ventes, node 90:4062)                     */
/* ------------------------------------------------------------------ */

/** Calque `statut` de la liste des ventes. */
export type StatutDeVente = "Validée" | "En attente" | "Annulée"

/** Calque `periode` des filtres. */
export type PeriodeDeVente = "aujourd-hui" | "7-jours" | "30-jours" | "ce-mois" | "tout"

/** Calque `vente` : une ligne de la « Liste des ventes ». */
export type LigneDeVente = {
  id: string
  /** `vente_numero`, ex. « #8561 » */
  venteNumero: string
  /** `vente_date` (ISO 8601, l'UI formate) */
  venteDate: string
  /** `magasin_nom` */
  magasinNom: string
  /** Colonne PRODUITS (nombre d'articles) */
  nombreProduits: number
  /** `vente_montant` en ariary (Ar) (nombre brut) */
  venteMontant: number
  /** `utilisateur_nom` (vendeur) */
  utilisateurNom: string
  statut: StatutDeVente
}

/** Calque `indicateurs_cles` de l'écran Ventes. */
export type ResumeDesVentes = {
  /** `ventes_aujourd_hui` (nombre de ventes) */
  ventesAujourdHui: number
  /** `vente_evolution` de la 1re carte, ex. « +12 % vs hier » */
  ventesAujourdHuiEvolution: string
  /** `vente_montant` du jour en ariary (Ar) (nombre brut) */
  venteMontant: number
  venteMontantEvolution: string
  /** `a_verifier` (ventes en attente) */
  aVerifier: number
  aVerifierDetail: string
  /** `ventes_annulees` */
  ventesAnnulees: number
  ventesAnnuleesDetail: string
}

/** Calques `recherche` + `filtres` + pagination de l'écran Ventes. */
export type FiltresDesVentes = {
  storeId: string | undefined
  /** Numéro, produit ou utilisateur */
  recherche: string
  periode: PeriodeDeVente
  /** null = tous */
  statut: StatutDeVente | null
  /** null = tous les vendeurs */
  utilisateurId: string | null
  page: number
  pageSize: number
}

/** Calque `produit` de `nouvelle_vente_fenetre`. */
export type LigneDeNouvelleVente = {
  produitId: string
  produitNom: string
  produitDetail?: string
  photoUrl?: string
  /** `produit_nombre` */
  quantite: number
  /** `produit_montant` (prix unitaire TTC en ariary (Ar)) */
  prixUnitaire: number
}

/** Ce que l'UI envoie pour « Enregistrer » (brouillon → « En attente ») ou « Valider ». */
export type NouvelleVente = {
  /** Présent uniquement quand on modifie une vente existante */
  venteId?: string
  magasinId: string
  /** `vente_date` (AAAA-MM-JJ) */
  venteDate: string
  lignes: LigneDeNouvelleVente[]
  /** `remise` en ariary (Ar) */
  remise: number
  /** « Note de vente » */
  note: string
  statut: "brouillon" | "validee"
}

/** Calque `produit` de `detail_de_la_vente` (article vendu). */
export type ArticleVendu = {
  produitId: string
  produitNom: string
  /** `produit_reference` */
  produitReference: string
  photoUrl?: string
  /** `produit_quantite` */
  produitQuantite: number
  /** `produit_prix_unitaire` en ariary (Ar) */
  produitPrixUnitaire: number
}

/** Figma : `detail_de_la_vente_8561`. */
export type DetailDeVente = {
  id: string
  venteNumero: string
  /** `vente_heure` (ISO 8601) */
  venteDate: string
  /** `vendeur` */
  vendeurNom: string
  magasinId: string
  magasinNom: string
  statut: StatutDeVente
  articles: ArticleVendu[]
  /** Remise en ariary (Ar) (0 si aucune) */
  remise: number
  /** `vente_montant` : total payé en ariary (Ar) (fait foi) */
  venteMontant: number
  note: string
}

/** Calque `vente` du `cahier_de_vente` (vue compacte d'une journée). */
export type VenteDuCahier = {
  id: string
  /** `vente_heure` (ISO 8601, l'UI affiche l'heure) */
  venteDate: string
  venteNumero: string
  /** Articles de la vente (1 → miniature + nom ; plusieurs → ligne dépliable) */
  articles: ArticleVendu[]
  /** `vente_quantite` : total des quantités */
  venteQuantite: number
  /** `vente_montant` en ariary (Ar) */
  venteMontant: number
  /** Vendeur */
  vendeurNom: string
  statut: StatutDeVente
}

/** Calque `indicateurs` du cahier de vente. */
export type ResumeDuCahier = {
  /** « Total du jour » en ariary (Ar) */
  venteMontant: number
  /** « Ventes » (nombre) */
  ventes: number
  /** « Articles » (quantités vendues) */
  articles: number
}

/** Calque `filtres_et_action` du cahier de vente. */
export type FiltresDuCahier = {
  storeId: string | undefined
  /** `vente_date` AAAA-MM-JJ */
  date: string
  page: number
  pageSize: number
}

/** Option du filtre « Utilisateur ». */
export type Vendeur = { id: string; nom: string }

/* ------------------------------------------------------------------ */
/* Produits (Figma : nouveau_produit_fenetre, node 90:4855)            */
/* ------------------------------------------------------------------ */

/** Calque `statut` du produit. */
export type StatutDeProduit = "Actif" | "Inactif"

/** Formulaire `nouveau_produit` (création ou modification). */
export type ProduitSaisi = {
  /** Présent uniquement pour une modification */
  produitId?: string
  /** `nom_du_produit` */
  nomDuProduit: string
  /** `reference` */
  reference: string
  /** `code_barres` (facultatif) */
  codeBarres: string
  /** `categorie` */
  categorie: string
  /** `unite` (ex. « Pièce », « Kg ») */
  unite: string
  /** `prix_fournisseur` en ariary (Ar) (facultatif) */
  prixFournisseur: number | null
  /** `prix_de_vente` en ariary (Ar) */
  prixDeVente: number
  /** `seuil_de_stock_faible` (unités) */
  seuilDeStockFaible: number
  statut: StatutDeProduit
  /** Nouvelle photo choisie (PNG/JPG/WEBP ≤ 5 Mo) ; null = inchangée / aucune */
  photo: File | null
  /** Photo actuelle (modification) */
  photoUrl?: string
  /** `description_ou_note` (≤ 500 caractères) */
  description: string
}

/** Ligne de la liste « Produits » (catalogue). */
export type LigneDeProduit = {
  id: string
  nomDuProduit: string
  reference: string
  codeBarres: string
  categorie: string
  unite: string
  prixDeVente: number
  statut: StatutDeProduit
  photoUrl?: string
}

/** Filtres de la liste « Produits ». */
export type FiltresDesProduits = {
  recherche: string
  /** null = toutes */
  categorie: string | null
  /** null = tous */
  statut: StatutDeProduit | null
  page: number
  pageSize: number
}

/* ------------------------------------------------------------------ */
/* Tableau de bord (Figma : tableau_de_bord_de_gestion_de_stock 90:3732) */
/* ------------------------------------------------------------------ */

/** Calque `periode` des cartes « Évolution des ventes » et « Produits les plus vendus ». */
export type PeriodeDuTableauDeBord = "7-jours" | "30-jours" | "12-mois"

/** Calque `indicateurs_cles` du tableau de bord. */
export type ResumeDuTableauDeBord = {
  /** `ventes_des_7_derniers_jours` (nombre de ventes) */
  ventesDes7DerniersJours: number
  /** `stock_evolution` de la 1re carte, ex. « +12 % vs semaine précédente » */
  ventesEvolution: string
  /** « Chiffre d'affaires mensuel » (`stock_montant`) en ariary (Ar) */
  chiffreDAffairesMensuel: number
  chiffreDAffairesEvolution: string
  /** `produits_en_stock_faible` */
  produitsEnStockFaible: number
  /** `ruptures_de_stock` */
  rupturesDeStock: number
}

/** Un point de la `courbe_des_ventes`. */
export type PointDeVentes = {
  /** `vente_date` (AAAA-MM-JJ, ou AAAA-MM pour 12 mois) */
  date: string
  /** Montant des ventes en ariary (Ar) */
  montant: number
}

/** Calque `produit` du `classement` des produits les plus vendus. */
export type ProduitPlusVendu = {
  produitId: string
  /** `produit_position` (1 = le plus vendu) */
  produitPosition: number
  produitNom: string
  /** `produit_categorie` */
  produitCategorie: string
  photoUrl?: string
  /** Quantité vendue sur la période (sert à la barre de progression) */
  quantiteVendue: number
}

export type TypeDActivite = "Vente" | "Entrée stock" | "Sortie stock" | "Retour" | "Transfert" | "Correction stock" | "Dépense"

/** Calque `activite` des « Dernières activités ». */
export type ActiviteRecente = {
  id: string
  /** `stock_heure` (ISO 8601) */
  date: string
  type: TypeDActivite
  /** Numéro de la pièce, ex. « #8561 », « ENT-0042 » */
  numero: string
  /** Produit ou libellé de l'opération */
  description: string
  /** `utilisateur_valeur` */
  utilisateurNom: string
  /** Montant en ariary (Ar) (null si non pertinent) */
  montant: number | null
  /** Quantité en unités, affichée si pas de montant */
  quantite?: number
  statut: StatutDeVente
}

/* ------------------------------------------------------------------ */
/* Rapports (Figma : rapports_ventes 90:5908, rapports_stock 90:2156,  */
/* rapports_produits 90:1771, rapports_prix_ecarts 90:1367)           */
/* ------------------------------------------------------------------ */

export type OngletDeRapport = "vue-generale" | "ventes" | "stock" | "produits" | "prix-ecarts"
export type PeriodeDeRapport = "7-jours" | "30-jours" | "ce-mois" | "trimestre" | "annee"
export type FormatDExport = "pdf" | "excel" | "csv"

export type FiltresDeRapport = { storeId: string | undefined; periode: PeriodeDeRapport }

/** Carte indicateur d'un rapport (valeur déjà formatée par la logique). */
export type IndicateurDeRapport = { libelle: string; valeur: string; evolution: string; tendance: "hausse" | "baisse" | "stable" }

/** Élément d'une liste à barres (répartition par magasin, écarts…). */
export type ElementDeRepartition = { id: string; libelle: string; valeur: number; valeurAffichee: string }

/** Produit en progression / en baisse. */
export type ProduitEnEvolution = { produitId: string; produitNom: string; produitCategorie: string; evolution: number }

export type RapportDesVentes = {
  chiffreDAffaires: IndicateurDeRapport
  nombreDeVentes: IndicateurDeRapport
  panierMoyen: IndicateurDeRapport
  ventesValidees: IndicateurDeRapport
  /** « Évolution des ventes » : montant du jour + moyenne mobile 7 jours */
  evolution: { date: string; montant: number; moyenne7Jours: number }[]
  meilleureJournee: { date: string; montant: number; evolution: string }
  /** « Répartition par vendeur » */
  parVendeur: { vendeurId: string; vendeurNom: string; ventes: number; montant: number }[]
  /** « Heures les plus actives » : heure 8 → 21 */
  parHeure: { heure: number; ventes: number }[]
  /** « Analyse des ventes » : une ligne par jour et magasin */
  analyse: { id: string; date: string; magasinNom: string; ventes: number; chiffreDAffaires: number; panierMoyen: number; statut: StatutDeVente }[]
}

export type StatutDAnalyseDeStock = "Normal" | "Stock bas" | "Faible stock" | "Rupture"

export type RapportDuStock = {
  stockTotal: IndicateurDeRapport
  stockEntrant: IndicateurDeRapport
  valeurDuStock: IndicateurDeRapport
  rotationMoyenne: IndicateurDeRapport
  /** « Entrées vs sorties de stock » par semaine, en unités */
  mouvements: { periode: string; entrees: number; sorties: number; stockCumule: number }[]
  parMagasin: ElementDeRepartition[]
  /** « Rotation par catégorie » (nombre de rotations) */
  rotationParCategorie: { categorie: string; rotation: number }[]
  faibleRotation: { produitId: string; produitNom: string; categorie: string; stock: number; ventes: number }[]
  transferts: { id: string; trajet: string; produitNom: string; quantite: number }[]
  analyse: {
    id: string
    produitNom: string
    magasinNom: string
    stockInitial: number
    entrees: number
    sorties: number
    stockFinal: number
    valeur: number
    statut: StatutDAnalyseDeStock
  }[]
}

export type RapportDesProduits = {
  produitsVendus: IndicateurDeRapport
  nouveauxProduits: IndicateurDeRapport
  produitsActifs: IndicateurDeRapport
  margeMoyenne: IndicateurDeRapport
  /** « Performance par catégorie » : CA (Ar) et marge (%) */
  parCategorie: { categorie: string; chiffreDAffaires: number; marge: number }[]
  enProgression: ProduitEnEvolution[]
  enBaisse: ProduitEnEvolution[]
  /** Produits proposés dans « Évolution d'un produit sélectionné » */
  produitsSuivis: { produitId: string; produitNom: string }[]
  /** Évolution du produit sélectionné : unités vendues et CA (Ar) */
  evolutionProduit: { date: string; ventes: number; chiffreDAffaires: number }[]
  classement: {
    rang: number
    produitId: string
    produitNom: string
    categorie: string
    stock: number
    chiffreDAffaires: number
    ventes: number
    evolution: number
  }[]
}

export type RapportDesPrix = {
  ecartsDetectes: IndicateurDeRapport
  produitsConcernes: IndicateurDeRapport
  montantImpacte: IndicateurDeRapport
  modificationsDePrix: IndicateurDeRapport
  /** « Écarts de prix » (dernier écart par ligne) */
  ecarts: {
    id: string
    date: string
    produitNom: string
    magasinNom: string
    prixAttendu: number
    prixPratique: number
    /** prixPratique − prixAttendu */
    ecart: number
    utilisateurNom: string
  }[]
  plusGrosEcarts: ElementDeRepartition[]
  /** « Évolution des écarts dans le temps » : montant signé (Ar) */
  evolutionDesEcarts: { date: string; ecart: number }[]
  magasinsAvecPlusDEcarts: ElementDeRepartition[]
}

/* ------------------------------------------------------------------ */
/* Utilisateurs (Figma : utilisateurs 90:5341, nouvel_utilisateur 90:2727) */
/* ------------------------------------------------------------------ */

export type RoleUtilisateur = "Administrateur" | "Responsable" | "Gestionnaire de stock" | "Vendeur" | "Assistant vente" | "Comptabilité" | "Responsable de saisie"
export type StatutUtilisateur = "Actif" | "Inactif"

/** Modules du bloc « Permissions » et actions possibles par module. */
export type ModuleDePermission = "ventes" | "stock" | "produits" | "rapports"
export type ActionDePermission = "creer" | "consulter" | "modifier" | "annuler" | "corriger" | "transferer" | "exporter" | "gerer"
export type Permissions = Record<ModuleDePermission, ActionDePermission[]>

/** Ligne de la « Liste des utilisateurs ». */
export type LigneDUtilisateur = {
  id: string
  /** `utilisateur_nom` */
  nom: string
  /** `utilisateur_email` */
  email: string
  photoUrl?: string
  role: RoleUtilisateur
  /** `magasin_nom` (« Tous les magasins » pour un administrateur) */
  magasinNom: string
  statut: StatutUtilisateur
  /** `utilisateur_heure` : dernière activité (ISO 8601) ; null = jamais connecté */
  derniereActivite: string | null
  /** `utilisateur_permissions` : résumé lisible, ex. « Ventes, Stock » */
  resumePermissions: string
}

/** `indicateurs_cles` de l'écran Utilisateurs. */
export type ResumeDesUtilisateurs = {
  utilisateursActifs: number
  utilisateursActifsDetail: string
  administrateurs: number
  administrateursDetail: string
  magasinsCouverts: number
  magasinsCouvertsDetail: string
  comptesInactifs: number
  comptesInactifsDetail: string
}

export type FiltresDesUtilisateurs = {
  /** Nom, e-mail, rôle ou magasin */
  recherche: string
  /** null = tous */
  magasinId: string | null
  role: RoleUtilisateur | null
  statut: StatutUtilisateur | null
  page: number
  pageSize: number
}

/** Formulaire `nouvel_utilisateur` (création ou modification). */
export type UtilisateurSaisi = {
  /** Présent uniquement pour une modification */
  utilisateurId?: string
  nomComplet: string
  email: string
  /** Facultatif */
  telephone: string
  /** Identifiant de connexion */
  identifiant: string
  role: RoleUtilisateur
  /** null = tous les magasins */
  magasinId: string | null
  /** Obligatoire à la création ; vide en modification = inchangé */
  motDePasse: string
  statut: StatutUtilisateur
  permissions: Permissions
  /** Nouvelle photo (JPG/PNG ≤ 2 Mo) ; null = inchangée / aucune */
  photo: File | null
  photoUrl?: string
}

/** Résultat paginé standard renvoyé par la logique. */
export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** État standard d'un hook de données. */
export type AsyncState<T> = {
  data: T | undefined
  isLoading: boolean
  error: string | null
}

// ─── Paramètres (Figma : parametres_stock 90:4, parametres_ventes 90:225, parametres_facturation 90:460,
//     parametres_catalogue 90:745, parametres_magasins 90:1093) ───

/** Rubriques de la navigation des paramètres (`navigation_des_parametres`). */
export type RubriqueDeParametres = "entreprise" | "facturation" | "magasins" | "catalogue" | "stock" | "ventes" | "roles" | "langue"

/** `parametres_du_stock` */
export type ParametresDuStock = {
  autoriserStockNegatif: boolean
  alerteStockInsuffisant: boolean
  /** `seuil_par_defaut_de_stock_faible`, en unités */
  seuilParDefautDeStockFaible: number
  validationObligatoirePourInventaire: boolean
  autoriserTransfertsEntreMagasins: boolean
  motifObligatoirePourCorrection: boolean
  alerteStockFaible: boolean
  alerteRuptureDeStock: boolean
}

export type ModeDePaiement = "especes" | "mobile-money" | "bancaire"

/** Jetons du format de numérotation : AAAA = année, MM = mois, N… = compteur. */
export type FormatDeNumero = "AAAA-NNNNN" | "AAAAMM-NNNN" | "NNNNNN"

/** `parametres_de_vente` */
export type ParametresDeVente = {
  /** `prefixe_numero_de_vente`, ex. « VTE » */
  prefixeNumeroDeVente: string
  formatDeNumeroDeVente: FormatDeNumero
  prochainNumero: number
  autoriserBrouillons: boolean
  imprimerRecuApresValidation: boolean
  autoriserAnnulation: boolean
  clientObligatoire: boolean
  motifObligatoirePourAnnulation: boolean
  autoriserModificationApresValidation: boolean
  /** Modes de paiement acceptés (au moins un) */
  modesDePaiement: ModeDePaiement[]
  afficherHeuresDansLeCahier: boolean
  afficherVentesAnnulees: boolean
  nombreDeVentesParPage: number
}

export type AffichageDeFacture = "a4" | "ticket-80mm"

/** `parametres_facturation` */
export type ParametresDeFacturation = {
  /** `coordonnees_fiscales` : raison sociale affichée */
  coordonneesFiscales: string
  nif: string
  stat: string
  rcs: string
  adresse: string
  telephone: string
  email: string
  /** Code ISO 4217, ex. « MGA » */
  devise: string
  prefixeDeFacture: string
  formatDuNumeroDeFacture: FormatDeNumero
  prochainNumero: number
  affichageSurLaFacture: AffichageDeFacture
  afficherLogo: boolean
  afficherAdresse: boolean
  afficherIdentifiantsFiscaux: boolean
  afficherTelephoneEtEmail: boolean
  afficherInformationsClient: boolean
  afficherConditionsDePaiement: boolean
}

export type TypeDElementDeCatalogue = "categorie" | "unite" | "marque"

/** Ligne des tableaux `tableau_categories`, `tableau_unites`, `tableau_marques`. */
export type ElementDeCatalogue = {
  id: string
  nom: string
  /** Description (catégories, marques) ou usage (unités) */
  description: string
  /** Absent pour les unités */
  nombreDeProduits?: number
}

export type CatalogueDeReference = {
  categories: ElementDeCatalogue[]
  unites: ElementDeCatalogue[]
  marques: ElementDeCatalogue[]
}

export type StatutDeMagasin = "Actif" | "Inactif"

/** Ligne de `liste_des_magasins` et formulaire `details_du_magasin`. */
export type MagasinDetaille = {
  id: string
  nom: string
  code: string
  responsable: string
  telephone: string
  /** Facultatif */
  email: string
  adresse: string
  /** Point de vente principal (un seul) */
  principal: boolean
  statut: StatutDeMagasin
}

/** Formulaire `details_du_magasin` : sans `id` pour une création. */
export type MagasinSaisi = Omit<MagasinDetaille, "id"> & { id?: string }

export type FiltresDesMagasins = {
  recherche: string
  /** null = tous les statuts */
  statut: StatutDeMagasin | null
}

// ─── Historique des opérations (Figma : historique_des_operations 90:4973) ───

/** Onglets du calque `categories`. */
export type CategorieDOperation = "vente" | "entree" | "sortie" | "transfert" | "inventaire" | "prix" | "annulation" | "depense" | "versement" | "facture-fournisseur"

/** Filtre « Type » : type précis de l'opération. */
export type TypeDOperation =
  | "Vente"
  | "Entrée de stock"
  | "Sortie de stock"
  | "Retour client"
  | "Transfert"
  | "Correction de stock"
  | "Inventaire"
  | "Modification de prix"
  | "Annulation"
  | "Dépense"
  | "Versement"
  | "Facture fournisseur"

export type StatutDOperation = "Validé" | "En attente" | "Brouillon" | "Annulé"

/** Ligne de `liste_des_operations` (calque `operation`). */
export type OperationDHistorique = {
  id: string
  /** `stock_date` + `stock_heure` (ISO 8601) */
  date: string
  categorie: CategorieDOperation
  type: TypeDOperation
  /** Numéro de pièce, ex. « #4587 », « #M-012 » */
  numero: string
  /** `stock_source` : origine, ex. « Caisse · Paris République », « Saisie manuelle » */
  source: string
  /** `cellule_reference` ligne 1 : client, produit… */
  reference: string
  /** `cellule_reference` ligne 2 : détail (produits, nombre d'articles…) */
  referenceDetail: string
  /** Quantité signée : + entrée, − sortie ; null si non pertinent (prix) */
  quantite: number | null
  /** `cellule_valeurs` ligne 1 : montant en Ar (nombre brut) ; null si pas de montant */
  montant: number | null
  /** Ancien prix pour une modification de prix (affiché « ancien → nouveau ») */
  ancienMontant?: number
  /** `cellule_valeurs` ligne 2 (ou ligne 1 sans montant), ex. « Paris → Lyon », « Stock : 120 → 110 » */
  detailValeur: string
  statut: StatutDOperation
  utilisateurNom: string
  magasinNom: string
  /** Motif saisi (correction, annulation…) */
  motif?: string
}

/** Compteurs des onglets (`compteur`) avec les filtres courants. */
export type CompteursDHistorique = Record<CategorieDOperation | "tout", number>

export type FiltresDHistorique = {
  /** Produit, référence, numéro d'opération */
  recherche: string
  /** null = toutes les catégories (onglet « Tout ») */
  categorie: CategorieDOperation | null
  type: TypeDOperation | null
  /** null = tous les magasins */
  magasinId: string | null
  utilisateurId: string | null
  periode: PeriodeDeVente
  statut: StatutDOperation | null
  page: number
  pageSize: number
}

// ─── Saisie du cahier (journée complète, comme l'ancien logiciel PHP ; pas de maquette Figma) ───

/** Ligne de vente recopiée du cahier papier : le prix est saisi (modifiable), note par ligne. */
export type LigneDuCahierSaisie = {
  /** Clé locale de la ligne (plusieurs lignes possibles pour un même produit) */
  cle: string
  produitId: string
  produitNom: string
  reference: string
  quantite: number
  /** Prix de vente unitaire en ariary (Ar), saisi */
  prixUnitaire: number
  note: string
}

/** Dépense de la journée. */
export type DepenseDuCahier = {
  cle: string
  /** Montant en ariary (Ar) */
  montant: number
  /** `Dépense_libelle` (envoyé comme motif) */
  motif: string
  /** `Dépense_note` (facultatif) */
  note?: string
}

/** Formulaire complet de la saisie d'une journée. */
export type SaisieDuCahier = {
  magasinId: string
  /** Date du journal AAAA-MM-JJ */
  date: string
  lignes: LigneDuCahierSaisie[]
  depenses: DepenseDuCahier[]
  versement: {
    /** Argent réellement remis en ariary (Ar) ; null = pas encore versé */
    montantRemis: number | null
    note: string
  }
  /** Photos du cahier papier (justificatifs, aucune lecture automatique) */
  photos: File[]
  /** `brouillon` = enregistrer sans valider ; `validee` = ventes, dépenses et versement validés */
  statut: "brouillon" | "validee"
}

// ─── Dépenses & versements consultables (Figma : depenses_et_versements_consultables 238:26030) ───

export type StatutDeCahier = "Brouillon" | "Validé" | "Annulé"

/** Ligne de « Liste des cahiers ». Montants en ariary (Ar), nombres bruts. */
export type CahierConsultable = {
  id: string
  /** Numéro court affiché, ex. « #123 » */
  numero: string
  /** Date du journal AAAA-MM-JJ */
  date: string
  magasinNom: string
  totalVentes: number
  depenses: number
  /** Argent réellement versé ; null = pas encore versé */
  versement: number | null
  /** Versement − (ventes − dépenses) ; null si pas de versement */
  ecart: number | null
  statut: StatutDeCahier
}

/** « Détail du cahier » du cahier sélectionné. */
export type DetailDuCahier = CahierConsultable & {
  /** `N° de cahier`, ex. « CAH-2026-00123 » */
  identifiant: string
  saisiPar: string
  depensesDuJour: { id: string; libelle: string; montant: number; note: string }[]
  justificatifs: { id: string; nom: string; url: string }[]
}

export type TriDesCahiers = { colonne: "date" | "numero" | "magasin" | "totalVentes" | "depenses" | "versement" | "ecart"; sens: "asc" | "desc" }

export type FiltresDesCahiers = {
  /** null = tous les magasins */
  magasinId: string | null
  /** Période AAAA-MM-JJ incluse */
  du: string
  au: string
  /** null = tous les utilisateurs */
  utilisateurId: string | null
  /** N° de cahier ou magasin */
  recherche: string
  tri: TriDesCahiers
  page: number
  pageSize: number
}

// ─── Factures fournisseurs (Figma : factures_fournisseurs 238:25161) ───

export type StatutDeFactureFournisseur = "Brouillon" | "Validé" | "Annulé"

/** Ligne de « Liste des factures fournisseurs ». Total en ariary (Ar), nombre brut. */
export type FactureFournisseur = {
  id: string
  /** `N° facture`, ex. « FA-458 » */
  numero: string
  fournisseurNom: string
  /** AAAA-MM-JJ */
  date: string
  total: number
  statut: StatutDeFactureFournisseur
}

/** « Détails de la facture » de la facture sélectionnée. */
export type DetailDeFactureFournisseur = FactureFournisseur & {
  /** Référence du fournisseur (bon de livraison…) */
  reference: string
  lignes: { id: string; produitNom: string; reference: string; quantite: number; prixFournisseur: number }[]
  /** `Facture jointe` ; null si aucun fichier */
  pieceJointe: { nom: string; type: string; tailleKo: number; url: string; apercuUrl?: string } | null
}

export type FiltresDesFacturesFournisseurs = {
  /** null = tous les fournisseurs */
  fournisseurId: string | null
  /** Période AAAA-MM-JJ incluse */
  du: string
  au: string
  /** N° de facture ou fournisseur */
  recherche: string
  page: number
  pageSize: number
}

// ─── Détail du produit (Figma : detail_du_produit_prix_par_magasin 238:25756) ───

/** Onglets de la colonne `navigation_du_produit`. */
export type OngletDuProduit = "informations" | "prix" | "stock" | "historique"

/** Fiche `fiche_produit` + bloc « Informations ». Montants en ariary (Ar), nombres bruts. */
export type DetailDuProduit = {
  id: string
  nom: string
  reference: string
  /** Pastille bleue sous la référence, ex. « Matériau » ; absente si null */
  typeDeProduit: string | null
  /** ex. « Matériaux de construction » */
  categorie: string
  /** ex. « Sac » */
  uniteDeVente: string
  /** Pluriel de l'unité pour les quantités, ex. « sacs » */
  uniteAuPluriel: string
  /** Texte libre, ex. « 50 kg » ; null = non renseigné */
  poids: string | null
  prixDAchatMoyen: number | null
  stockActuel: number
  stockMinimum: number
  fournisseurPrincipal: string | null
  statut: StatutDeProduit
  photoUrl?: string
}

/** Ligne du tableau « Prix de vente par magasin ». */
export type PrixParMagasin = {
  magasinId: string
  magasinNom: string
  /** Prix de vente en ariary ; null = pas encore défini */
  prixDeVente: number | null
}

// ─── Facture client (Figma : facture_client_fenetre 253:2549) ───

/** Client choisi dans « Informations client » ; ses coordonnées sont recopiées dans la facture. */
export type ClientDeFacture = {
  id: string
  nom: string
  nif: string
  stat: string
  adresse: string
  telephone: string
}

/** Saisie de la fenêtre « Facture client » (créée à partir d'une vente validée). */
export type SaisieDeFactureClient = {
  venteId: string
  /** AAAA-MM-JJ */
  dateDeFacture: string
  clientId: string
  /** Coordonnées copiées (modifiables) au moment de la facture */
  clientNom: string
  nif: string
  stat: string
  adresse: string
  telephone: string
  /** `Conditions / note`, ex. « Paiement sous 30 jours. » */
  conditions: string
}

/** Facture enregistrée : numéro attribué par le serveur, ex. « FAC-2026-00045 ». */
export type FactureClientCreee = { id: string; numero: string }

// ─── Prix à vérifier (Figma : prix_a_verifier_fenetre 253:2703) ───

export type DecisionDePrix = "valider" | "refuser"

/** Nouveau prix fournisseur détecté (ex. sur une facture) et en attente de décision. Montants en Ar. */
export type PrixAVerifier = {
  id: string
  produitNom: string
  reference: string
  /** Sous-titre de la ligne, ex. marque ou fournisseur */
  fournisseurNom: string
  photoUrl?: string
  ancienPrix: number | null
  nouveauPrix: number
  /** Quantité en stock, pour l'« Impact estimé sur le stock actuel » */
  stockActuel: number
}

/** Contenu de la fenêtre : contexte + lignes. */
export type VerificationDePrix = {
  magasinNom: string
  /** ex. « Facture fournisseur FA-458 » */
  origine: string
  lignes: PrixAVerifier[]
}
