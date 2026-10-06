import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { ChevronRight, Clock } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { FicheDuProduit } from "@/components/produits/fiche-du-produit"
import { NavigationDuProduit, ONGLETS_DU_PRODUIT } from "@/components/produits/navigation-du-produit"
import { PrixParMagasin } from "@/components/produits/prix-par-magasin"
import { useStores } from "@/hooks/useStores"
import { t, tr } from "@/i18n"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import { useDetailDuProduit, usePrixParMagasin } from "@/hooks/useProductDetails"
import type { OngletDuProduit } from "@/types"

/** `/produits/<id>` ou `/produits/<id>/<onglet>` ; null si la route n'est pas un détail de produit. */
export function detailDuProduitDepuisRoute(route: string): { id: string; onglet: OngletDuProduit } | null {
  const [, racine, id, onglet] = route.split("/")
  if (racine !== "produits" || !id) return null
  return { id: decodeURIComponent(id), onglet: ONGLETS_DU_PRODUIT.some((o) => o.value === onglet) ? (onglet as OngletDuProduit) : "prix" }
}

export const lienVersDetailDuProduit = (id: string, onglet?: OngletDuProduit) => `/produits/${encodeURIComponent(id)}${onglet ? `/${onglet}` : ""}`

/** Figma : `detail_du_produit_prix_par_magasin` (node 238:25756). */
export function DetailDuProduitPage({ id, onglet }: { id: string; onglet: OngletDuProduit }) {
  const draft = useFormDraft("shop-prices", undefined, id)
  const produit = useDetailDuProduit(id)
  const prix = usePrixParMagasin(id)
  const { data: magasins } = useStores()

  return (
    <CadreApplication pageActive="produits">
      <main className="flex flex-col gap-4">
        {/* en_tete */}
        <div className="flex flex-col gap-2">
          <nav aria-label={t("Fil d’Ariane")} className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href={lienVersPage("produits")} className="hover:text-primary hover:underline">
              {t("Produits")}
            </a>
            <ChevronRight className="size-3.5" />
            <span aria-current="page">{t("Détail du produit")}</span>
          </nav>
          <h1 className="text-2xl font-bold">{t("Détail du produit")}</h1>
          <p className="text-sm text-muted-foreground">{t("Consultez et gérez les informations du produit.")}</p>
        </div>

        {produit.error ? (
          <EmptyState title={t("Produit introuvable")} description={tr(produit.error)} />
        ) : produit.data ? (
          <>
            <FicheDuProduit produit={produit.data} />
            <p className="text-sm text-muted-foreground">{t("Le stock affiché cumule les magasins auxquels vous avez accès.")}</p>

            {/* contenu_du_produit */}
            <div className="flex flex-col gap-4 lg:min-h-[420px] lg:flex-row lg:items-stretch">
              <NavigationDuProduit active={onglet} lien={(o) => lienVersDetailDuProduit(id, o)} />
              {onglet === "prix" ? (
                prix.error ? (
                  <EmptyState title={t("Erreur de chargement")} description={tr(prix.error)} />
                ) : prix.data ? (
                  <PrixParMagasin
                    draft={draft}
                    key={prix.version}
                    prix={prix.data}
                    magasins={magasins ?? []}
                    onEnregistrer={async (rows, expected) => { try { await saveDraftOnServer(draft, () => prix.enregistrer(rows, expected)) } catch (e) { throw new Error(tr(e instanceof Error ? e.message : "L’enregistrement a échoué.")) } }}
                  />
                ) : <p className="text-sm text-muted-foreground">{t("Chargement…")}</p>
              ) : (
                <EmptyState
                  icon={Clock}
                  title={tr(ONGLETS_DU_PRODUIT.find((o) => o.value === onglet)!.titre)}
                  description={t("Écran à venir : pas encore de maquette Figma pour cet onglet.")}
                  className="flex-1"
                />
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("Chargement…")}</p>
        )}
      </main>
    </CadreApplication>
  )
}
