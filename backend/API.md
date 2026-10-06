# Contrat HTTP

## Lot application — sessions, administration, paramètres, historique et cahier

JWT obligatoire ; `/auth/local-session` est supprimé. Les jetons expirent après 900 secondes. Le navigateur utilise sessionStorage et contrôle `/auth/me` avant d’ouvrir les pages ; il redemande le mot de passe après expiration. La déconnexion révoque toutes les sessions du compte. Pas de refresh token dans ce lot.

| Méthode, route | Corps / paramètres → réponse | Permissions |
|---|---|---|
| POST `/auth/logout` | sans corps → `{loggedOut:true}` | session valide |
| POST `/users/:id/password-reset` | UUID compte actif → `{token,expiresAt}` ; administrateur transmet un lien `/reinitialisation?token=…` | users.update |
| POST `/auth/reset-password` | `{token,password}` (12–128 caractères) → `{reset:true}` | publique, secret du lien requis |
| POST `/users/:id/photo` | multipart `photo`, JPG/PNG ≤2 Mo → profil/photo | users.update |
| GET `/users/:id/photo` | UUID → fichier privé, no-store | users.read |
| GET `/settings/forms/stock`, `/ventes`, `/facturation` | formulaire complet ; ventes/facturation incluent prochainNumero calculé | settings.read |
| PATCH `/settings/forms/stock`, `/ventes`, `/facturation` | DTO complet du formulaire Swagger → `{saved:true}` | settings.update |
| GET `/preferences` | `{stock,ventes}` sans compteur de numérotation | session valide |
| DELETE `/categories/:id`, `/units/:id`, `/brands/:id` | refus si référentiel utilisé ; sinon archive → objet conservé | products.update |
| DELETE `/shops/:id` | refus principal/historique/stock ; sinon désactivation | shops.update + accès magasin |
| GET `/history` | filtres ci-dessous → `{items,total,page,pageSize}` | audit.read |
| GET `/history/counts` | mêmes filtres sauf categorie → compteurs par catégorie + tout | audit.read |
| GET `/history/users` | utilisateurs auteurs accessibles → `[{id,nom}]` | audit.read |
| GET `/history/export` | filtres + format csv/excel/pdf → fichier | audit.read + reports.export |
| GET `/cash-journals` | shopId requis, from/to?, status? → tableau de journaux/lignes/finance/justificatifs | sales.read + expenses.read + remittances.read |
| POST `/cash-journals` | multipart payload JSON et photos → journal créé avec warnings | sales.create + droits de création des objets présents ; droits de validation si VALIDATED |
| POST `/cash-journals/:id/validate` | UUID, sans corps → journal VALIDATED avec warnings | sales.validate + droits de validation financiers nécessaires |
| GET `/cash-journals/:id/attachments/:attachmentId` | UUID → image privée | sales.read + expenses.read + remittances.read + accès magasin |

Erreurs : 400 DTO/règle invalide/lien expiré ou déjà consommé ; 401 session absente, expirée ou révoquée ; 403 permission/magasin ; 404 objet ; 409 numéro/référence/idempotence/clôture concurrente ; 429 limite de tentatives login ou reset. Les liens ne sont jamais enregistrés en clair dans PostgreSQL ou dans l’audit : SHA-256, expiration 30 minutes, consommation atomique unique, invalidation des anciens jetons. Aucun email automatiquement envoyé.

Les profils `/users` ajoutent role, shops, permissionOverrides, photoUrl, lastActiveAt, sans password/hash/sessionVersion. POST/PATCH acceptent phone, login, primaryShopId nullable, permissionCodes et password optionnel en mise à jour. Rôle, périmètre ou exceptions exigent users.role.assign. Exceptions personnalisables : sales.create/read/cancel, stock.read/adjust/transfer, products.read/update/create, reports.read/export, shops.all. Les autres actions restent contrôlées par le rôle serveur. Refus de désactivation de son compte et de retrait du dernier administrateur actif. La photo est enregistrée par une seconde requête après le profil ; un échec du fichier ne supprime pas le compte déjà créé.

Formulaires de réglages : noms identiques aux types ParametresDuStock, ParametresDeVente, ParametresDeFacturation dans src/types/index.ts ; valeurs validées côté serveur. Formats de numéro AAAA-NNNNN, AAAAMM-NNNN, NNNNNN ; préfixe alphanumérique/tiret/soulignement. Prochain compteur strictement supérieur au dernier numéro attribué, contrainte unique et incrément PostgreSQL transactionnel. Les changements de facture sont copiés dans les nouveaux snapshots ; aucune facture émise ne change. Modes UI especes/mobile-money/bancaire correspondent à CASH/MOBILE_MONEY/BANK. Le logo entreprise n’a pas encore de parcours de téléversement ; afficherLogo conserve le choix pour ce parcours.

Filtres histoire : recherche, categorie (vente/entree/sortie/transfert/inventaire/prix/annulation/depense/versement/facture-fournisseur), type?, magasinId?, utilisateurId?, periode (aujourd-hui/7-jours/30-jours/ce-mois/tout), statut (Validé/Brouillon/En attente/Annulé), page/pageSize (max100). Pagination/total et exports portent sur le résultat filtré en base. Quantités signées ; prix/dépenses/versements sans quantité. Prix ancien/nouveau et une ligne par transfert. Les montants de cette projection UI sont des nombres ; les endpoints métier conservent leurs Decimal en chaînes.

La nouvelle interface Figma saisit ventes et dépenses, puis la fenêtre de validation transmet versement et photos au même endpoint. Le brouillon n’inclut pas encore ces justificatifs avant la validation.

Corps JSON payload du cahier :
```json
{"shopId":"UUID","date":"2026-10-03","requestKey":"UUID","status":"DRAFT","lines":[{"productId":"UUID","quantity":"2.5","unitPrice":"1200.00","note":"note papier"}],"expenses":[{"amount":"300.00","reason":"Transport","note":"Justificatif papier"}],"amountRemitted":"2700.00","remittanceNote":"Bordereau"}
```
Au moins une vente ou dépense, maximum 500 lignes/100 dépenses. `amountRemitted` absent = aucun versement ; zéro est un montant réel admis. Photos facultatives (10 maximum), JPG/PNG/WEBP ≤10 Mo chacune, contenu contrôlé et fichier UUID privé dans UPLOAD_DIR/journals. Le requestKey couvre aussi le contenu/noms des photos ; même requête retourne le même journal, contenu différent = 409. Une vente par ligne conserve différents prix pour un même produit. Vente/dépense en espèces pour ce formulaire papier. Les créations, validations, mouvements, snapshots financiers, liens de fichiers et audit utilisent la même transaction Serializable ; un refus ne conserve aucun objet partiel et nettoie les fichiers nouvellement écrits. Les enfants d’un brouillon se valident uniquement avec leur journal. Les originaux validés et justificatifs sont immuables. Le versement capture toutes les ventes/dépenses espèces de la journée, pas seulement ce lot papier ; total/calcul affiché avant validation reste indicatif.


## Lot clients / finance / audit

JWT, préfixe `/api/v1`, droits par magasin. Montants Decimal en chaînes ; aucun DELETE métier. POST retourne 201, GET/PATCH 200.

| Route | Entrée / réponse | Permission |
|---|---|---|
| GET `/customers` | shopId UUID requis, search?, page=1, pageSize=25 (max100) → `{items,total,page,pageSize}` | customers.read |
| GET `/customers/:id` | UUID → client | customers.read |
| POST `/customers` | shopId, name, phone?, email?, address?, nif?, stat? → client créé | customers.create |
| PATCH `/customers/:id` | champs client optionnels, active? ; magasin immuable → client audité | customers.update |
| GET `/expenses`, `/remittances`, `/supplier-invoices` | shopId, from/to? AAAA-MM-JJ ensemble, status?, page?, pageSize? → liste paginée | `<module>.read` |
| GET `/<module>/:id` | UUID → opération, lignes, justificatifs | `<module>.read` |
| POST `/expenses` | shopId, businessDate, requestKey UUID, amount>0 (2 décimales), reason, paymentMethod? (CASH par défaut), note? → brouillon numéroté | expenses.create |
| POST `/remittances` | shopId, businessDate, requestKey, amount remis≥0, periodFrom/periodTo inclusives, note? → brouillon | remittances.create |
| POST `/supplier-invoices` | shopId, businessDate, requestKey, supplierName, supplierReference, lignes `{productId,quantity>0,unitPrice>=0}`, receiptId?, originalFinanceId?, note? → brouillon, total calculé | supplier-invoices.create |
| POST `/supplier-invoices/:id/receipt` | `{receiptId}` → rattachement du brouillon à une réception existante | supplier-invoices.create |
| POST `/<module>/:id/validate` | sans corps → statut VALIDATED, auteur/date et snapshot | `<module>.validate` |
| POST `/<module>/:id/cancel` | `{reason}` non vide → CANCELLED, original conservé | `<module>.cancel` |
| GET `/remittances/:id/reconciliation` | original, current, expectedChange, sourcesChanged, requiresReview | remittances.read |
| GET `/reports/finance` | shopId, from/to inclusives, max367 jours → ventes/dépenses/après dépenses/espèces, devise et sources | reports.read |
| POST `/finance/:kind/:id/attachments` | kind=expenses/remittances/supplier-invoices ; multipart file PDF/PNG/JPG≤10Mo → métadonnées sans chemin disque | create du module |
| GET `/finance/:kind/:id/attachments/:attachmentId` | UUIDs → téléchargement privé | read du module |
| GET `/audit` | shopId?, actorId?, action?, entityType?, entityId?, from/to?, page?, pageSize? → journal paginé avant/après/auteur/magasin/motif | audit.read |
| GET `/audit/:id` | UUID → événement du périmètre autorisé | audit.read |

Dans `/<module>`, module=expenses/remittances/supplier-invoices. Dates métier AAAA-MM-JJ, fuseau Madagascar. DTO et permissions dans Swagger. Erreurs : 400 paramètres/réception/date invalide, 401 JWT, 403 droits/magasin, 404 absent, 409 doublon/conflit/validation répétée. Même requestKey et contenu rejoués : même opération sans doublon. Numérotation et audit transactionnels SERIALIZABLE.

Les clients sont rattachés à un magasin et désactivables par active=false. Une vente fournit customerId? et paymentMethod? (CASH/MOBILE_MONEY/BANK), CASH par défaut pour les nouvelles ventes. Les anciens paiements inconnus restent NULL, y compris lors d'une révision sans choix explicite. Coordonnées client copiées dans la vente puis la facture ; une fiche modifiée ne réécrit pas les documents. customerId:null retire le client d'une nouvelle révision, l'original restant conservé.

Dépenses : seul VALIDATED participe au calcul. Montant après dépenses = ventes effectives validées après remise − dépenses validées, même magasin/période. Les retours n'ont aucun effet financier automatique. La synthèse refuse une consolidation de devises différentes et retourne salesTotal, expenseTotal, amountAfterExpenses, cashSales, cashExpenses, expectedCash, currencyLabel, saleIds, expenseIds, unknownPaymentSales.

Versement = clôture en espèces, pas dépôt bancaire. Attendu=ventes espèces−dépenses espèces ; écart=remis−attendu. Mobile money/bancaire exclus. Paiements historiques inconnus, période future et chevauchement avec une clôture validée refusés, même en concurrence. Sources/écart conservés ; les corrections ultérieures actualisent les rapports et reconciliation sans écraser la clôture originale.

Facture fournisseur : aucun stock ni changement de prix. Saisie avant réception possible, validation après rattachement à un STOCK_IN validé du même magasin avec produits/quantités identiques. Cette version traite une réception complète par facture. Une facture effective par réception/référence fournisseur du magasin. Après annulation motivée, originalFinanceId permet son remplacement lié sans supprimer l'original. Règlements fournisseur hors de ce lot.

Admin et comptabilité valident/annulent ; responsable de saisie prépare les brouillons financiers seulement. Les justificatifs restent dans UPLOAD_DIR, inclus dans les sauvegardes, sans effacement/remplacement. Audit global sans magasin accessible uniquement avec shops.all. Aucun mot de passe/hash utilisateur n'est exposé.

## Ajouts du 1er octobre 2026

| Route | Corps / réponse | Permission |
|---|---|---|
| GET/PATCH `/settings/company` | nom, adresse, téléphone, NIF/STAT/RCS, currencyLabel, taxRate (5 ou 20). GET ajoute amountDecimals=2, timeZone, hideTaxOnPrint | settings.read / settings.update |
| GET/PATCH `/settings/stock` | allowNegativeStock | settings.read / settings.update |
| POST `/customer-invoices` | saleOperationId, customerName/address/nif?, paymentTerms?, reason? ; facture avec snapshot. Motif obligatoire pour remplacement | invoices.create |
| GET `/customer-invoices/:id` | facture originale, snapshot, lien replacement éventuel | invoices.read + accès magasin |
| GET `/customer-invoices/:id/pdf` | application/pdf depuis le snapshot | invoices.read + accès magasin |
| GET `/settings/backups` | destination, calendrier, derniers résultats | settings.read |
| POST `/settings/backups/run` | crée une sauvegarde et retourne son dossier/date ; 503 si indisponible | settings.update |

POST `/operations` : type, shopId, destinationShopId? (transfert), businessDate YYYY-MM-DD, status DRAFT/VALIDATED, requestKey UUID, lignes productId/quantity/unitPrice?, discount?, reason?. `stockOutPurpose` optionnel GENERAL/INTERNAL_CONSUMPTION, uniquement STOCK_OUT. Consommation interne : motif obligatoire. Quantités exactes en chaînes, zéro admis uniquement pour inventaire. Validation : permission métier par type et sales.validate pour vente, magasin autorisé, transaction complète ; stock négatif autorisé avec warnings ou refus 400 selon paramètres. La réponse ajoute currencyLabel, stockOutPurpose et warnings sans retirer les champs existants.

POST `/operations/:id/validate`, `/cancel` (reason), `/revisions` (même corps) : refus 409 si validation répétée ou opération déjà remplacée/annulée. Correction de vente exige sales.correct, original conservé et mouvements inverses. Les clients/factures ne modifient jamais silencieusement une vente. Erreurs 400 validation, 401 JWT, 403 droits/magasin, 404 objet absent, 409 conflit. Swagger documente les DTO exécutables ; aucune modification de contrat React dans ce lot.

Base `/api/v1`. JWT Bearer pour toutes les routes sauf login et consommation du lien de réinitialisation. Le guard relit le compte, ses permissions et ses magasins à chaque requête. Swagger généré sur `/api/docs`, avec l'extension `x-required-permission` sur les routes protégées. Les réponses utilisent JSON ; les `Decimal` sont des chaînes.

| Méthode, route | Paramètres / corps | Réponse 2xx | Permission |
|---|---|---|---|
| POST `/auth/login` | `{login:string,password:string}` | `{accessToken,tokenType:"Bearer",expiresIn:900,user:{id,name,login}}` | publique |
| GET `/auth/me` | Bearer | `{id,name,login,role,permissions,shopIds}` | authentifié |
| GET `/users` | — | Tableau de profils sans hash | `users.read` |
| GET `/users/:id` | UUID | Profil sans hash | `users.read` |
| POST `/users` | `{name,login,password,roleId,email?,primaryShopId?}` | Profil sans hash | `users.create` + `users.role.assign` |
| PATCH `/users/:id` | `{name?,email?,active?,roleId?}` | Profil sans hash | `users.update` ; `users.role.assign` si rôle |
| POST `/users/:id/shops/:shopId` | UUID utilisateur et magasin | `{userId,shopId}` | `users.update` + accès magasin |
| DELETE `/users/:id/shops/:shopId` | UUID utilisateur et magasin | `{revoked:true}` | `users.update` + accès magasin |
| GET `/roles` | — | Tableau des rôles et permissions | `users.read` |
| GET `/permissions` | — | Tableau des codes de permission | `users.read` |
| GET `/shops` | — | Magasins accessibles | `shops.read` |
| GET `/shops/:id` | UUID | Magasin | `shops.read` + accès magasin |
| POST `/shops` | `{code,name,address?,phone?,isMain?}` | Magasin | `shops.create` |
| PATCH `/shops/:id` | `{name?,address?,phone?,active?}` | Magasin | `shops.update` + accès magasin |
| GET `/categories`, `/units`, `/brands` | — | Tableaux de référentiels | `products.read` |
| POST `/categories`, `/units`, `/brands` | `{name}` | Référentiel créé | `products.create` |
| PATCH `/categories/:id`, `/units/:id`, `/brands/:id` | `{name?,active?}` | Référentiel mis à jour | `products.update` |
| GET `/products` | `search?,page?=1,pageSize?=25` | `{items,total,page,pageSize}` | `products.read` |
| GET `/products/:id` | UUID | Produit avec catégorie, unité, marque | `products.read` |
| POST `/products` | `{name,reference,categoryId,unitId,brandId?,barcode?,supplierPrice?,salePrice?,lowStockThreshold?,description?}` | Produit, aucun stock créé | `products.create` |
| PATCH `/products/:id` | `{name?,barcode?,active?,description?,lowStockThreshold?}` | Produit mis à jour ; prix exclus | `products.update` |
| GET `/stock` | `shopId` requis, `productId?` | Soldes enregistrés du magasin | `stock.read` + accès magasin |

Erreurs standardisées : `{code,message,details?}`. `400` : DTO, pagination ou prix invalides ; `401` : login ou JWT invalides ; `403` : permission ou magasin refusé ; `404` : objet absent ; `409` : contrainte unique, conflit de référence ; `500` : erreur interne masquée. Les autres tableaux de ce document et Swagger décrivent les endpoints des lots complémentaires.


## Consultation des cahiers — 3 octobre 2026

Trois routes additives, sans modifier GET /cash-journals. JWT et les trois permissions sales.read, expenses.read, remittances.read requis. Sans filtre magasin, seuls les magasins autorisés sont inclus ; shops.all ouvre la consultation globale.

| Méthode / route | Paramètres et réponse |
|---|---|
| GET `/cash-journals/consultation` | du/au requis (jours inclus, Madagascar, maximum 367 jours) ; magasinId?, utilisateurId?, recherche?, colonne=date/numero/magasin/totalVentes/depenses/versement/ecart, sens=asc/desc, page=1, pageSize=25 (maximum100). Réponse `{items,total,page,pageSize}` ; filtres/tri/pagination exécutés en SQL. |
| GET `/cash-journals/consultation/users` | `[{id,nom}]`, uniquement auteurs de cahiers accessibles, comptes historiques inclus. |
| GET `/cash-journals/consultation/:id` | Détail : ligne de liste + identifiant, saisiPar, depensesDuJour `[{id,libelle,montant,note}]`, justificatifs `[{id,nom,url}]`. URL relative privée, requête avec JWT requise. |

Les montants de cette projection UI sont des nombres bruts. Les totaux du cahier excluent ventes remplacées/annulées et dépenses annulées ; les brouillons affichent leurs montants préparés, sans les intégrer au résultat financier validé. Versement absent/annulé = null, et non zéro. Écart = difference historique de la clôture ; montantAttendu = son attendu historique, null en brouillon. Une clôture peut inclure d'autres ventes/dépenses espèces de la journée : son écart ne doit pas être recalculé à partir du seul cahier. Une correction ultérieure peut donc modifier le total courant sans modifier ce snapshot.

Le modèle CashJournal ne possède pas encore de numéro métier séquentiel. numero/identifiant = CAH-année-UUID complet, stable et unique ; aucun faux compteur inventé. Aucun DELETE de dépense : l'annulation motivée reste dans le module financier existant.

Erreurs : 400 DTO/date/pagination/tri invalides, 401 JWT, 403 permission ou filtre de magasin interdit, 404 cahier absent ou hors périmètre. Swagger expose paramètres et réponses. Aucune migration de base nécessaire.


## Produits et factures fournisseurs — données réelles (#23–24)

Routes additives ; aucune migration, aucun changement aux réponses existantes. JWT obligatoire.

| Route | Contrat | Permissions |
|---|---|---|
| GET `/products/:id/detail` | DetailDuProduit : catalogue réel, photo réelle éventuelle, stock cumulé uniquement dans les magasins accessibles. poids/typeDeProduit/fournisseurPrincipal/prixDAchatMoyen=null : ces notions ne sont pas enregistrées ou leur formule n'est pas définie. uniteAuPluriel reprend le libellé enregistré sans inventer de traduction. | products.read + stock.read |
| GET `/products/:id/shop-prices` | `[{magasinId,magasinNom,prixDeVente:number}]` ; seules les dérogations enregistrées dans les magasins accessibles, liste vide possible. Le prix général reste le repli utilisé par les ventes. | products.read |
| PATCH `/products/:id/shop-prices` | `{prices:[{shopId,price:string|null}],expectedPrices:[{shopId,price:string|null}]}`. Liste complète des dérogations accessibles ; magasin omis/null = retour au prix général. expectedPrices = liste chargée avant édition ; 409 si elle a changé. Retour même forme que GET. | products.price.update + accès à chaque magasin |
| GET `/supplier-invoices/consultation` | du/au requis (jours inclus Madagascar, maximum367 jours), shopId?, fournisseurId? (nom exact du fournisseur), recherche? (numéro/fournisseur), page/pageSize(max100). `{items,total,page,pageSize}`, lignes brutes id/number/supplierName/businessDate/amount/status. Filtres et pagination SQL. | supplier-invoices.read + périmètre magasin |
| GET `/supplier-invoices/suppliers` | shopId? ; `[{id,nom}]`, noms réellement présents dans les documents accessibles. id est ici le nom du snapshot : aucun référentiel Supplier n'existe actuellement. | supplier-invoices.read + périmètre magasin |

Les prix sont validés en Decimal (2 décimales, non négatifs), magasins distincts et actifs pour tout changement, produit actif. Transaction SERIALIZABLE/reprise, contrôle de concurrence, PriceChange pour chaque nouveau prix et AuditEvent pour chaque ajout/modification/retrait. Retrait de dérogation : seule la valeur courante ProductPrice est supprimée ; historique PriceChange et audit ancien/nouveau conservés. Une suppression avec repli inconnu est consignée dans l'audit, sans faux prix zéro. Aucun stock ni prix historique de vente modifié.

La consultation fournisseurs sans shopId reste limitée aux magasins autorisés. Les hooks UI utilisent le magasin actif, puis les routes métier existantes pour détail, validation et pièce jointe privée. Validation exige une réception complète compatible et ne crée pas une seconde entrée de stock. Le contrat UI actuel affiche une seule pièce jointe : première pièce, les autres restent conservées côté API.

Erreurs 400 DTO/prix/date/magasin inactif, 401 session, 403 action/magasin, 404 produit/facture, 409 prix modifiés en parallèle ou facture déjà validée/incompatible. Swagger expose les routes. Aucun calcul de coût moyen ou fournisseur principal n'est déduit silencieusement.


### Factures clients et vérification des prix (4 octobre 2026)

`POST /api/v1/customer-invoices` — permission `invoices.create`, accès au magasin de la vente. DTO existant étendu, sans supprimer les champs précédents : `customerId?` (UUID client actif du même magasin), `invoiceDate?` (AAAA-MM-JJ valide, non future, Madagascar), `customerStat?`, `customerPhone?`. Les autres champs sont `saleOperationId`, `customerName?`, `customerAddress?`, `customerNif?`, `paymentTerms?`, `reason?` (obligatoire pour remplacer une facture d’une vente corrigée). Réponse 201 : facture existante ou créée `{id,number,saleOperationId,shopId,issuedById,issuedAt,snapshot,...}`. Snapshot version 3 : `invoiceDate` et coordonnées client copiées (id/nom/NIF/STAT/téléphone/adresse), conditions, lignes/remise/TVA historiques de la vente. Le PDF utilise la date métier ; `issuedAt` conserve l’instant réel. Numéro unique attribué en transaction selon la date métier. 400 vente non valide/client incompatible/date invalide/motif absent ; 403 permission/périmètre ; 404 vente absente. Le sélecteur utilise `GET /customers?shopId&page&pageSize` (`customers.read`). Pas d’API de réservation du prochain numéro.

`GET /api/v1/supplier-invoices/:id/price-review` — permissions `supplier-invoices.read`, `products.read`, `stock.read` + accès magasin. Réponse 200 `{magasinNom,origine,lignes:[{id,produitNom,reference,fournisseurNom,photoUrl?,ancienPrix,nouveauPrix,stockActuel}]}`. Montants/quantités numériques pour le contrat UI ; `ancienPrix` nullable (inconnu, distinct de zéro). `id` opaque à renvoyer intégralement. Les lignes déjà décidées ou sans écart sont absentes. Brouillon/annulation : liste vide. Aucun effet de bord sur GET.

`POST /api/v1/supplier-invoices/:id/price-review` — permissions `products.price.update`, `supplier-invoices.read` + accès magasin. Body `{decisions:[{id,decision:"valider"|"refuser"}]}`, de 1 à 100 identifiants distincts. Réponse 201 `{saved:true}`. Une acceptation modifie le prix fournisseur global du produit et crée un PriceChange (`kind=supplier`, `origin=SUPPLIER_INVOICE`) ; refus sans changement de catalogue. Les deux créent un AuditEvent immuable `supplier-price.decide`, `entityType=SupplierInvoiceLine`, avec origine produit/facture/prix et auteur/magasin. Unicité SQL par ligne. Transaction SERIALIZABLE pour le lot entier, aucune modification du stock ni des factures/lignes/anciennes ventes. 400 DTO, facture non validée, magasin inactif, produit inactif pour acceptation ; 403 permission/périmètre ; 404 facture absente ; 409 prix/version modifié ou décision déjà enregistrée. Recharge obligatoire après conflit ; on ne réessaie pas automatiquement les anciens choix sur de nouveaux prix.
