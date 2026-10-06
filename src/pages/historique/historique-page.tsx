import { t } from "@/i18n"
import { useState } from "react"
import { CalendarDays, Search, SlidersHorizontal, Store, User } from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { MenuDExport } from "@/components/donnees/menu-d-export"
import { TAILLES_DE_PAGE } from "@/components/donnees/tableau-de-donnees"
import { STATUTS_D_OPERATION } from "@/components/historique/categories-d-operation"
import { DetailDeLOperationFenetre } from "@/components/historique/detail-de-l-operation-fenetre"
import { ListeDesOperations } from "@/components/historique/liste-des-operations"
import { OngletsDeCategorie } from "@/components/historique/onglets-de-categorie"
import { Input } from "@/components/ui/input"
import { useStores } from "@/hooks/useStores"
import { notify } from "@/lib/notify"
import { CadreApplication } from "@/pages/cadre-application"
import {
  exporterHistorique,
  useCompteursDHistorique,
  useHistorique,
  useUtilisateursDeLHistorique,
} from "@/hooks/useHistory"
import type { FiltresDHistorique, FormatDExport, OperationDHistorique, PeriodeDeVente, StatutDOperation } from "@/types"

const TOUS = "__tous__"

const optionsPeriode: OptionDeFiltre<PeriodeDeVente>[] = [
  { value: "aujourd-hui", label: "Aujourd’hui" },
  { value: "7-jours", label: "7 derniers jours" },
  { value: "30-jours", label: "30 derniers jours" },
  { value: "ce-mois", label: "Ce mois-ci" },
  { value: "tout", label: "Toute la période" },
]
const optionsStatut: OptionDeFiltre<StatutDOperation | typeof TOUS>[] = [{ value: TOUS, label: "Tous les statuts" }, ...STATUTS_D_OPERATION.map((s) => ({ value: s, label: s }))]

/** Figma : `historique_des_operations` (node 90:4973). */
export function HistoriquePage() {
  const { data: magasins } = useStores()
  const [filtres, setFiltres] = useState<FiltresDHistorique>({
    recherche: "",
    categorie: null,
    type: null,
    magasinId: null,
    utilisateurId: null,
    periode: "7-jours",
    statut: null,
    page: 1,
    pageSize: TAILLES_DE_PAGE[0],
  })
  // Tout changement de filtre revient à la page 1
  const modifierFiltres = (modif: Partial<Omit<FiltresDHistorique, "page">>) => setFiltres((f) => ({ ...f, ...modif, page: 1 }))

  const historique = useHistorique(filtres)
  const compteurs = useCompteursDHistorique(filtres)
  const utilisateurs = useUtilisateursDeLHistorique()
  const [aConsulter, setAConsulter] = useState<OperationDHistorique | null>(null)

  const optionsMagasin: OptionDeFiltre<string>[] = [{ value: TOUS, label: "Tous les magasins" }, ...(magasins ?? []).map((m) => ({ value: m.id, label: m.name }))]
  const optionsUtilisateur: OptionDeFiltre<string>[] = [{ value: TOUS, label: "Tous les utilisateurs" }, ...(utilisateurs.data ?? []).map((u) => ({ value: u.id, label: u.nom }))]

  const exporter = async (format: FormatDExport) => {
    try {
      await exporterHistorique(format, filtres)
      notify("success", t("Export {{v0}} de l’historique lancé.", { v0: format.toUpperCase() }))
    } catch (erreur) {
      notify("error", erreur instanceof Error ? erreur.message : t("L’export a échoué."))
    }
  }

  return (
    <CadreApplication pageActive="historique">
      <main className="flex flex-col gap-4">
        {/* titre_et_action */}
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-2xl font-bold">{t("Historique")}</h1>
            <p className="text-sm text-muted-foreground">{t("Consultez toutes les opérations enregistrées dans le logiciel.")}</p>
          </div>
          <MenuDExport variante="outline" onExporter={exporter} />
        </div>

        {/* recherche */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
          <Input
            type="search"
            aria-label={t("Rechercher une opération")}
            value={filtres.recherche}
            onChange={(e) => modifierFiltres({ recherche: e.target.value })}
            placeholder={t("Rechercher par produit, référence, numéro d’opération...")}
            className="h-12 rounded-sm border-grid-line pl-11 text-sm md:text-sm"
          />
        </div>

        {/* filtres */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FiltreSelecteur icone={Store} libelle={t("Magasin")} options={optionsMagasin} valeur={filtres.magasinId ?? TOUS} onChange={(v) => modifierFiltres({ magasinId: v === TOUS ? null : v })} />
          <FiltreSelecteur icone={User} libelle={t("Utilisateur")} options={optionsUtilisateur} valeur={filtres.utilisateurId ?? TOUS} onChange={(v) => modifierFiltres({ utilisateurId: v === TOUS ? null : v })} />
          <FiltreSelecteur icone={CalendarDays} libelle={t("Période")} options={optionsPeriode} valeur={filtres.periode} onChange={(periode) => modifierFiltres({ periode })} />
          <FiltreSelecteur icone={SlidersHorizontal} libelle={t("Statut")} options={optionsStatut} valeur={filtres.statut ?? TOUS} onChange={(v) => modifierFiltres({ statut: v === TOUS ? null : v })} />
        </div>

        {/* categories */}
        <OngletsDeCategorie valeur={filtres.categorie} onChange={(categorie) => modifierFiltres({ categorie })} compteurs={compteurs.data} />

        {/* liste_des_operations */}
        <ListeDesOperations
          operations={historique.data?.items ?? []}
          total={historique.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtres.pageSize}
          onPageChange={(page) => setFiltres((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => modifierFiltres({ pageSize })}
          onConsulter={setAConsulter}
          enChargement={historique.isLoading}
          erreur={historique.error}
        />
      </main>

      <DetailDeLOperationFenetre operation={aConsulter} onFermer={() => setAConsulter(null)} />
    </CadreApplication>
  )
}
