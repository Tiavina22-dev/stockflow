# StockFlow API — premier lot

Backend NestJS / PostgreSQL / Prisma isolé du frontend. Implémenté : JWT, permissions, catalogue, stock, opérations transactionnelles, ventes/révisions, transferts, inventaires, rapports, photos, paramètres et factures client immuables. Voir l'état actuel ci-dessous ; les indications du premier lot restent historiques.

1. Copier `.env.example` vers `.env`, remplacer les secrets, définir `POSTGRES_PASSWORD` pour Compose et démarrer PostgreSQL avec `docker compose up -d db`.
2. `npm install`, `npm run prisma:deploy`, `npm run build`.
3. Définir `ADMIN_LOGIN` et `ADMIN_PASSWORD` (12 caractères minimum), puis exécuter `node dist/seed.js` ; ne pas conserver le secret dans une commande partagée.
4. `npm start`, ou `docker compose up --build api` après migration et bootstrap. API sur `http://localhost:3001/api/v1`, Swagger sur `/api/docs`.

La migration SQL initiale est versionnée dans `prisma/migrations/`. Aucun compte ou mot de passe par défaut. Les rôles autres que `ADMIN` sont créés sans permissions par le bootstrap ; leur matrice doit être validée avant affectation. Les utilisateurs n'ont aucun magasin accessible tant qu'une ligne `UserShop` ne leur est pas affectée ; l'admin possède `shops.all`. Le journal d'audit est écrit pour les mutations de ce premier lot.

Contrats : erreurs `{ code, message, details? }` ; listes de produits `{ items, total, page, pageSize }`, `pageSize` limité à 100. Les `Decimal` Prisma sont sérialisés en chaînes. Les champs de prix ne sont pas modifiables par `PATCH /products/:id`, dans l'attente d'une opération d'historique de prix. La création d'un produit ne crée ni mouvement ni solde.

Limites de ce premier lot : pas de login rate limiting distribué, pas encore de tests PostgreSQL exécutés, ni de contrôle SQL immuable sur les mouvements. Ces points précèdent la mise en production. Le développement frontend reste dans le dépôt racine et conserve sa propre commande `npm run build`.

Voir [API.md](API.md) pour les contrats du premier lot et [docs/OPEN_DECISIONS.md](../docs/OPEN_DECISIONS.md) pour les règles en attente d'arbitrage.

## État au 1er octobre 2026

Montants Decimal exacts, affichage à deux décimales, Ar configurable, TVA TTC 20 ou 5 %, fuseau Madagascar. À 5 %, le PDF masque la rubrique fiscale sans supprimer le calcul. Vente corrigée : original conservé, mouvements inverses, coût/devise/taux historiques conservés. Factures : snapshots immuables, numéro transactionnel, remplacement lié avec motif. Consommation interne : STOCK_OUT avec `stockOutPurpose=INTERNAL_CONSUMPTION` et motif obligatoire, sans vente ni CA. Inventaire zéro autorisé ; aucun mouvement d'écart nul.

Sauvegardes : `node scripts/backup.mjs`, destination réelle Documents/StockFlow/Sauvegardes (surcharge BACKUP_DIR), base PostgreSQL et UPLOAD_DIR. Quotidiennes avec archive hebdomadaire séparée tous les sept jours, sans purge. Manifeste SHA-256, publication après vérification, anciennes archives conservées en cas d'échec. `--status` consulte l'état ; `--verify <dossier>` vérifie une archive. Installer pg_dump/pg_restore de la même version majeure sur PATH ou définir PG_DUMP_PATH/PG_RESTORE_PATH. Sur ce poste : outils officiels PostgreSQL 18 dans `.local/tools/postgresql/pgsql/bin`, non versionnés.

`scripts/install-backup-task.ps1` installe une tâche Windows invisible à 02:00, avec rattrapage, pour le compte connecté. PostgreSQL et le poste doivent fonctionner. L'API vérifie aussi au démarrage et chaque heure. Restaurer vers une nouvelle base vide avec pg_restore, puis restaurer le dossier uploads ; vérifier le manifeste avant toute restauration.

Tests : npm test ; node scripts/integration-test.mjs ; node scripts/test-backup.mjs ; node scripts/test-durability.mjs. Les tests PostgreSQL utilisent le serveur dédié 55432, stockflow_test et une nouvelle base de restauration. Mouvements, audits et factures protégés contre UPDATE/DELETE SQL. fsync, synchronous_commit et full_page_writes vérifiés actifs ; interruption de connexion avant COMMIT testée avec rollback. Cela ne simule pas une coupure électrique physique : stockage fiable et onduleur restent nécessaires.

Migration historique effectuée le 4 octobre 2026 sur ce PC ; voir [MIGRATION.md](../docs/MIGRATION.md). Les nouvelles installations restent vides, sans export des données privées. Les sauvegardes locales ne protègent pas contre la perte du poste.

## Lot clients et finance

API clients, dépenses, versements espèces, factures fournisseurs et lecture de l'audit disponibles : voir API.md. Clients désactivables et coordonnées figées dans les ventes/factures. Brouillons financiers sans impact, validations et annulations contrôlées par action/magasin, documents validés immuables. Montant après dépenses et caisse espèces séparés, sources/écarts conservés et rapprochement courant après correction. Factures fournisseurs rattachées aux réceptions, sans double entrée de stock ni changement de prix silencieux. Remplacements liés aux originaux annulés. Justificatifs privés PDF/PNG/JPG conservés et sauvegardés.

`node scripts/integration-test.mjs` vérifie également PostgreSQL et HTTP/JWT/DTO/permissions, concurrence et accès aux justificatifs/audit. Après migration/build, relancer `node dist/seed.js` pour les nouvelles permissions ; responsable de saisie limité aux brouillons financiers. CASH/MOBILE_MONEY/BANK structurent les paiements ; administration d'un référentiel configurable et règlements fournisseurs restent à développer.
