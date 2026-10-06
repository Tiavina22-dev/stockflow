import { useState, type ReactNode } from "react"
import { ChevronRight, Search, Store, Users } from "lucide-react"

import { DetailDuCahier } from "@/components/cahier/detail-du-cahier"
import { ListeDesCahiers } from "@/components/cahier/liste-des-cahiers"
import { type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { TAILLES_DE_PAGE } from "@/components/donnees/tableau-de-donnees"
import { dateDuJour } from "@/components/forms/champ-date"
import { ChampPeriode } from "@/components/forms/champ-periode"
import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { Input } from "@/components/ui/input"
import { useStores } from "@/hooks/useStores"
import { t, tr } from "@/i18n"
import { EmptyState } from "@/components/feedback/empty-state"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import {
  useCahiersConsultables,
  useDetailDuCahier,
  useUtilisateursDesCahiers,
} from "@/hooks/useCahiersConsultables"
import type { FiltresDesCahiers } from "@/types"

const TOUS = "__tous__"
/** Listes à 48 px comme le champ Période et la recherche (Figma : calque `champ`). */
const CHAMP_48 = "[&_[data-slot=select-trigger]]:h-12! [&_[data-slot=select-trigger]]:text-sm"
/** Il y a `n` jours, AAAA-MM-JJ (heure locale). */
function ilYA(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Figma : `depenses_et_versements_consultables` (node 238:26030) — résultats financiers journaliers des cahiers. */
export function DepensesVersementsPage() {
  const { data: magasins } = useStores()
  const utilisateurs = useUtilisateursDesCahiers()
  const [filtres, setFiltres] = useState<FiltresDesCahiers>({
    magasinId: null,
    du: ilYA(7),
    au: dateDuJour(),
    utilisateurId: null,
    recherche: "",
    tri: { colonne: "date", sens: "desc" },
    page: 1,
    pageSize: TAILLES_DE_PAGE[0],
  })
  const modifier = (m: Partial<FiltresDesCahiers>) => setFiltres((f) => ({ ...f, ...m, page: 1 }))
  const cahiers = useCahiersConsultables(filtres)
  const [selectionId, setSelectionId] = useState<string | null>(null)
  // Par défaut, le premier cahier de la liste est détaillé
  const idAffiche = cahiers.data?.items.some((c) => c.id === selectionId) ? selectionId : (cahiers.data?.items[0]?.id ?? null)
  const detail = useDetailDuCahier(idAffiche)

  const optionsMagasin: OptionDeFiltre<string>[] = [{ value: TOUS, label: "Tous les magasins" }, ...(magasins ?? []).map((m) => ({ value: m.id, label: m.name }))]
  const optionsUtilisateur: OptionDeFiltre<string>[] = [{ value: TOUS, label: "Tous les utilisateurs" }, ...(utilisateurs.data ?? []).map((u) => ({ value: u.id, label: u.nom }))]

  return (
    <CadreApplication pageActive="ventes">
      <main className="flex flex-col gap-4">
        {/* en_tete */}
        <div className="flex flex-col gap-2">
          <nav aria-label={t("Fil d’Ariane")} className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href={lienVersPage("ventes")} className="hover:text-primary hover:underline">
              {t("Ventes")}
            </a>
            <ChevronRight className="size-3.5" />
            <span aria-current="page">{t("Dépenses & versements")}</span>
          </nav>
          <h1 className="text-2xl font-bold">{t("Dépenses & versements consultables")}</h1>
          <p className="text-sm text-muted-foreground">{t("Consultez les résultats financiers journaliers des cahiers de vente (ventes, dépenses, versement et écart).")}</p>
        </div>

        {/* filtres */}
        <section className="grid gap-4 rounded-lg border border-grid-line bg-card p-3 shadow-card md:grid-cols-2 xl:grid-cols-[336fr_348fr_300fr_464fr] xl:items-end">
          <Champ libelle="Magasin">
            <SelectAvecIcone iconeSimple icone={Store} aria-label={t("Magasin")} options={optionsMagasin} valeur={filtres.magasinId ?? TOUS} onChange={(v) => modifier({ magasinId: v === TOUS ? null : v })} className={CHAMP_48} />
          </Champ>
          <Champ libelle="Période">
            <ChampPeriode du={filtres.du} au={filtres.au} max={dateDuJour()} onChange={(p) => modifier(p)} />
          </Champ>
          <Champ libelle="Utilisateur">
            <SelectAvecIcone iconeSimple icone={Users} aria-label={t("Utilisateur")} options={optionsUtilisateur} valeur={filtres.utilisateurId ?? TOUS} onChange={(v) => modifier({ utilisateurId: v === TOUS ? null : v })} className={CHAMP_48} />
          </Champ>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
            <Input
              type="search"
              aria-label={t("Rechercher un cahier, un magasin")}
              placeholder={t("Rechercher un cahier, un magasin...")}
              value={filtres.recherche}
              onChange={(e) => modifier({ recherche: e.target.value })}
              className="h-12 rounded-sm border-grid-line pl-12 text-sm md:text-sm"
            />
          </div>
        </section>

        <p className="text-sm text-muted-foreground">{t("L’écart de clôture inclut les opérations en espèces de toute la journée.")}</p>
        {utilisateurs.error && <p role="alert" className="text-sm text-danger">{tr(utilisateurs.error)}</p>}
        <ListeDesCahiers
          cahiers={cahiers.data?.items ?? []}
          total={cahiers.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtres.pageSize}
          onPageChange={(page) => setFiltres((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => modifier({ pageSize })}
          tri={filtres.tri}
          onTriChange={(tri) => modifier({ tri })}
          selectionId={idAffiche}
          onSelection={(c) => setSelectionId(c.id)}
          enChargement={cahiers.isLoading}
          erreur={cahiers.error}
        />

        {detail.error && <EmptyState title={t("Erreur de chargement")} description={tr(detail.error)} />}
        {detail.isLoading && !detail.data && <p className="text-sm text-muted-foreground">{t("Chargement…")}</p>}
        {detail.data && (
          <DetailDuCahier
            cahier={detail.data}
          />
        )}
      </main>
    </CadreApplication>
  )
}

function Champ({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-[13px] font-semibold">{t(libelle)}</span>
      {children}
    </div>
  )
}
