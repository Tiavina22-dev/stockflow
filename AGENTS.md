# StockFlow — règles de travail des agents

Logiciel de gestion de stock / ventes pour magasins. Interface en français.
Stack : **React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + shadcn/ui (base-ui) + lucide-react**.

Deux agents travaillent en parallèle sur ce dépôt. **Lis ce fichier en entier avant de coder.**

## 1. Rôles

| Agent | Rôle | Source de vérité |
|---|---|---|
| **Claude** (Claude Code) | Front-end : transforme les maquettes Figma en composants et pages, vérifie la fidélité visuelle. | Figma (via MCP) |
| **Codex** | Logique : données, API, état, règles métier, validation, tests de logique. | Ce fichier + `docs/COORDINATION.md` |

L'humain (propriétaire du projet) arbitre. Les agents ne se parlent pas directement :
ils communiquent **uniquement** via `docs/COORDINATION.md`.

## 2. Propriété des dossiers — ne modifie pas ce qui ne t'appartient pas

| Chemin | Propriétaire | Contenu |
|---|---|---|
| `src/components/**` | Claude | Composants UI (présentation pure) |
| `src/pages/**` | Claude | Pages : assemblent composants + hooks |
| `src/index.css` | Claude | Thème / tokens de design |
| `src/components/ui/**` | Claude | Primitives shadcn personnalisées au kit |
| `src/types/**` | **Partagé** | Contrat UI ↔ logique (voir §3) |
| `src/hooks/**` | Codex | Hooks de données (`useProducts`, …) |
| `src/services/**` | Codex | Appels API, accès aux données |
| `src/store/**` | Codex | État global si nécessaire |
| `src/mocks/**` | Codex | Données de démo / faux backend |
| `src/lib/utils.ts`, `src/lib/notify.tsx` | Claude | Utilitaires UI |
| `src/lib/**` (autres fichiers) | Codex | Utilitaires métier (calculs, formatage métier) |
| `package.json` | Partagé | Ajouter une dépendance = le noter dans COORDINATION |

Besoin d'un changement dans une zone qui n'est pas la tienne ? **Écris une demande dans
`docs/COORDINATION.md`** au lieu de modifier le fichier.

## 3. Le contrat : `src/types/index.ts`

- Les composants reçoivent leurs données **par props**, typées avec `@/types`.
  Un composant n'appelle jamais d'API, ne lit jamais de store.
- Codex expose des hooks qui renvoient ces mêmes types, ex. :
  ```ts
  useProducts(params: { search?: string; page: number; pageSize: number }): AsyncState<Paginated<ProductRow>>
  ```
- Les pages (`src/pages/`, `src/App.tsx`) branchent hook → composant.
- **Changer un type = changement de contrat** : l'ajouter dans COORDINATION (section « Changements de contrat »)
  avant ou en même temps que la modification. Préférer **ajouter** un champ optionnel plutôt que casser.
- Montants : nombres bruts dans les données (`value: number`), l'UI formate (`Intl.NumberFormat("fr-FR")`).
  Exception documentée : `Kpi.value` est déjà formaté.

## 4. Règles de design (pour Claude, à respecter aussi par Codex s'il touche une page)

- **Toute page s'affiche dans `CadreApplication`** (`src/pages/cadre-application.tsx`) : il fournit la seule
  navigation latérale (`AppSidebar`) et le seul en-tête (`Topbar`), collés aux bords de la fenêtre.
  Ne jamais recréer de sidebar, d'en-tête ou de bouton : utiliser `Button` (variantes default/outline/secondary/ghost/destructive).
- Réutiliser les composants existants avant d'en créer : `KpiCard`, `ProductTable`, `StatusBadge`,
  `StoreSelect`, `PillTabs`, `ConfirmDialog`, `EmptyState`, `notify()` (toasts), `Button`, `Input`…
- Jamais de couleur en dur : utiliser les tokens Tailwind du thème (`bg-primary`, `text-muted-foreground`,
  `bg-success-muted`, `text-warning`, `text-danger`, `bg-surface`, `border-input`, `shadow-card`…).
- Contrôles : hauteur **48–52 px**, rayon **10 px** (`rounded-lg`), cartes rayon 14 px (`rounded-xl`).
- Police Inter, textes 10/12/13/14 px ; icônes `lucide-react` uniquement.
- **Graphiques : composant `chart` de shadcn/ui (Recharts)**, `src/components/ui/chart.tsx`. Ne pas coder de graphique à la main ; pour tout composant riche, chercher d'abord une bibliothèque npm reconnue.
- Retour utilisateur : `notify("success" | "warning" | "error", message)` depuis `@/lib/notify`.
- États à prévoir pour toute liste : chargement, vide (`EmptyState`), erreur.
- **Langues (français / malgache)** : tout texte affiché passe par `t("Texte français")` ou `tr(variable)` de `@/i18n` ; la traduction malgache est dans `src/i18n/mg.json` (clé = phrase française). Dates : `formatDate(...)` de `@/i18n` (pas de `Intl.DateTimeFormat("fr-FR")`).

## 5. Commandes

```bash
npm run dev      # http://localhost:5173  (kit avancé : /#/kit-avance)
npm run build    # tsc -b + build Vite — doit passer avant de rendre la main
npm run lint     # oxlint
```

## 6. Workflow

1. Lire `docs/COORDINATION.md` (demandes ouvertes qui te concernent).
2. Travailler **uniquement dans ta zone**.
3. `npm run build` doit passer.
4. Mettre à jour `docs/COORDINATION.md` (statut des demandes, nouvelles demandes, changements de contrat).
5. Commit Git court et descriptif, préfixé : `ui:` (Claude) ou `logic:` (Codex), `contract:` si `src/types` change.
   **Ne jamais utiliser `git add -A` / `git add .`** : l'autre agent peut avoir du travail en cours.
   Ajouter uniquement ses chemins (`git add src/components src/pages …`) et vérifier `git status` avant de commiter.
