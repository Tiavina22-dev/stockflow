import { useState } from "react"
import { changeProduct } from "@/services/backend-api"
import { t } from "@/i18n"
import { Plus, Search, Settings2, Tags } from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { TAILLES_DE_PAGE } from "@/components/donnees/tableau-de-donnees"
import { ListeDesProduits } from "@/components/produits/liste-des-produits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import { CadreApplication, naviguerVers } from "@/pages/cadre-application"
import { useProduitsDuCatalogueProvisoires } from "@/hooks/useCatalog"
import { lienVersDetailDuProduit } from "@/pages/produits/detail-du-produit-page"
import { useFenetreProduit } from "@/pages/produits/fenetre-produit"
import { useCategoriesDuStockProvisoires } from "@/hooks/useStock"
import type { FiltresDesProduits, StatutDeProduit } from "@/types"

const TOUS = "__tous__"

const optionsStatut: OptionDeFiltre<StatutDeProduit | typeof TOUS>[] = [
  { value: TOUS, label: "Tous les statuts" },
  { value: "Actif", label: "Actif" },
  { value: "Inactif", label: "Inactif" },
]

/**
 * Catalogue des produits. Pas d'écran dédié dans Figma : page assemblée uniquement
 * avec les composants existants (même structure que Stock / Ventes) ; la fenêtre
 * « Nouveau produit » suit Figma (nouveau_produit_fenetre).
 */
export function ProduitsPage() {
  const categories = useCategoriesDuStockProvisoires()
  const fenetreProduit = useFenetreProduit(categories.data ?? [])

  const [filtres, setFiltres] = useState<FiltresDesProduits>({
    recherche: "",
    categorie: null,
    statut: null,
    page: 1,
    pageSize: TAILLES_DE_PAGE[0],
  })
  const modifierFiltres = (modif: Partial<Omit<FiltresDesProduits, "page">>) => setFiltres((f) => ({ ...f, ...modif, page: 1 }))
  const produits = useProduitsDuCatalogueProvisoires(filtres)

  const optionsCategorie: OptionDeFiltre<string>[] = [
    { value: TOUS, label: "Toutes les catégories" },
    ...(categories.data ?? []).map((c) => ({ value: c, label: c })),
  ]

  return (
    <CadreApplication pageActive="produits">
      <main className="flex flex-col gap-4">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-2xl font-bold">{t("Produits")}</h1>
            <p className="text-sm text-muted-foreground">{t("Gérez le catalogue d’articles de vos magasins.")}</p>
          </div>
          <Button onClick={fenetreProduit.nouveauProduit} className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal">
            <Plus className="size-[17px]" />
            {t("Nouveau produit")}
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
          <Input
            type="search"
            aria-label={t("Rechercher un produit")}
            value={filtres.recherche}
            onChange={(e) => modifierFiltres({ recherche: e.target.value })}
            placeholder={t("Rechercher par nom, référence ou code-barres...")}
            className="h-12 rounded-sm border-grid-line pl-11 text-sm md:text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-2/3">
          <FiltreSelecteur
            icone={Tags}
            libelle={t("Catégorie")}
            options={optionsCategorie}
            valeur={filtres.categorie ?? TOUS}
            onChange={(v) => modifierFiltres({ categorie: v === TOUS ? null : v })}
          />
          <FiltreSelecteur
            icone={Settings2}
            libelle={t("Statut")}
            options={optionsStatut}
            valeur={filtres.statut ?? TOUS}
            onChange={(v) => modifierFiltres({ statut: v === TOUS ? null : v })}
          />
        </div>

        <ListeDesProduits
          lignes={produits.data?.items ?? []}
          total={produits.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtres.pageSize}
          onPageChange={(page) => setFiltres((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => modifierFiltres({ pageSize })}
          onConsulter={(p) => naviguerVers(lienVersDetailDuProduit(p.id))}
          onModifier={(p) => fenetreProduit.modifierProduit(p.id)}
          onChangerStatut={async (p) => {
            try { await changeProduct(p.id, p.statut === "Actif" ? "Inactif" : "Actif"); notify("success", `« ${p.nomDuProduit} » ${p.statut === "Actif" ? "désactivé" : "activé"}.`) }
            catch (e) { notify("error", e instanceof Error ? e.message : t("Erreur API.")) }
          }}
          enChargement={produits.isLoading}
          erreur={produits.error}
        />
      </main>
      {fenetreProduit.fenetre}
    </CadreApplication>
  )
}
