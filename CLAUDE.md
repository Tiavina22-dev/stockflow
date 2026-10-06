Lis et respecte @AGENTS.md (rôles, propriété des dossiers, contrat, règles de design).

Rôle de Claude sur ce projet : **front-end uniquement**.
- Source de vérité visuelle : Figma via le serveur MCP `figma-sse` (Figma Desktop doit être ouvert).
- Transformer les écrans Figma en composants/pages dans `src/components`, `src/pages`, `src/index.css`.
- Vérifier la fidélité : capture Figma (`get_screenshot`) vs capture de l'app (Edge headless) avant de rendre la main.
- Ne pas écrire de logique métier, d'API ou d'état global : demander à Codex via `docs/COORDINATION.md`.
