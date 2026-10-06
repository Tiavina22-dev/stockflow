import { t } from "@/i18n"
import { FormulaireDeConnexion } from "@/components/connexion/formulaire-de-connexion"
import { SymboleStockFlow } from "@/components/layout/logo-stockflow"
import { lienVersPage } from "@/pages/cadre-application"
import { login } from "@/services/http-api"
import { getCurrentUser } from "@/services/backend-api"

/** Adresse de l'administrateur affichée sous le formulaire (Figma : calque `Aide à l’accès`). */
const CONTACT_ADMINISTRATEUR = "misa@zsystem.mg"

/**
 * Figma : écran `Connexion` (node 217:150) — affiché hors du cadre de l'application (pas de menu ni d'en-tête).
 * Après connexion, retour à l'accueil.
 */
export function ConnexionPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-[448px] flex-col gap-8">
        {/* Identité de l’application */}
        <div className="flex items-center justify-center gap-4">
          <SymboleStockFlow className="size-14 drop-shadow-[0_6px_14px_color-mix(in_oklab,var(--primary)_35%,transparent)]" />
          <div className="flex flex-col">
            <p className="text-[28px] leading-tight font-extrabold tracking-tight text-sidebar">{t("StockFlow")}</p>
            <p className="text-sm tracking-wide text-muted-foreground">{t("Gestion magasin")}</p>
          </div>
        </div>

        <FormulaireDeConnexion
          onSeConnecter={async (identifiant, motDePasse) => {
            await login(identifiant, motDePasse)
            // Prénom pour « Bienvenue, … » (facultatif : la connexion est déjà faite)
            return (await getCurrentUser().catch(() => undefined))?.firstName
          }}
          onConnecte={() => window.location.assign(lienVersPage("accueil"))}
          onMotDePasseOublie={() => window.location.assign("/reinitialisation")}
        />

        {/* Aide à l’accès */}
        <p className="text-center text-xs leading-[1.6] text-muted-foreground">
          {t("Besoin d’un accès ? Contactez votre administrateur.")}
          <br />
          <a href={`mailto:${CONTACT_ADMINISTRATEUR}`} className="hover:text-primary hover:underline">
            {CONTACT_ADMINISTRATEUR}
          </a>
        </p>
      </div>
    </main>
  )
}
