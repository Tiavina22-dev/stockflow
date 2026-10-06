import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useEffect, useState, type ReactNode } from "react"
import { Building2, ChevronRight, Search } from "lucide-react"

import { type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { TAILLES_DE_PAGE } from "@/components/donnees/tableau-de-donnees"
import { DetailDeFactureFournisseur } from "@/components/factures-fournisseurs/detail-de-facture-fournisseur"
import { ListeDesFacturesFournisseurs } from "@/components/factures-fournisseurs/liste-des-factures-fournisseurs"
import { PrixAVerifierFenetre } from "@/components/factures-fournisseurs/prix-a-verifier-fenetre"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { ChampDate, dateDuJour } from "@/components/forms/champ-date"
import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { Input } from "@/components/ui/input"
import { t, tr } from "@/i18n"
import { EmptyState } from "@/components/feedback/empty-state"
import { useActiveStore } from "@/hooks/useActiveStore"
import { notify } from "@/lib/notify"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import {
  useDetailDeFactureFournisseur,
  useFacturesFournisseurs,
  useFournisseurs,
  useValiderFactureFournisseur,
} from "@/hooks/useSupplierInvoices"
import { usePrixAVerifier, useDeciderPrixAVerifier } from "@/hooks/useSupplierPriceReview"
import type { FiltresDesFacturesFournisseurs } from "@/types"

const TOUS = "__tous__"
/** Premier jour du mois, `n` mois en arrière, AAAA-MM-JJ. */
function debutDuMois(n: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

/** Figma : `factures_fournisseurs` (node 238:25161) — factures d'achat auprès des fournisseurs. */
export function FacturesFournisseursPage() {
  const [magasin] = useActiveStore()
  const valider = useValiderFactureFournisseur()
  const fournisseurs = useFournisseurs()
  const [filtres, setFiltres] = useState<FiltresDesFacturesFournisseurs>({
    fournisseurId: null,
    du: debutDuMois(2),
    au: dateDuJour(),
    recherche: "",
    page: 1,
    pageSize: TAILLES_DE_PAGE[0],
  })
  useEffect(() => { setFiltres(f => ({ ...f, fournisseurId: null, page: 1 })) }, [magasin?.id])
  const modifier = (m: Partial<FiltresDesFacturesFournisseurs>) => setFiltres((f) => ({ ...f, ...m, page: 1 }))
  const factures = useFacturesFournisseurs(filtres)
  const uiDraft = useFormDraft("supplier-price-ui", magasin?.id)
  const [selectionId, setSelectionId] = useDraftState<string | null>(uiDraft, "selectionId", null)
  const idAffiche = factures.data?.items.some((f) => f.id === selectionId) ? selectionId : (factures.data?.items[0]?.id ?? null)
  const detail = useDetailDeFactureFournisseur(idAffiche)
  const [aValider, setAValider] = useState(false)
  // Prix à vérifier (Figma : prix_a_verifier_fenetre) : nouveaux prix détectés sur la facture affichée
  const prixAVerifier = usePrixAVerifier(detail.data?.id)
  const deciderPrix = useDeciderPrixAVerifier()
  const priceDraft = useFormDraft("supplier-price-review", magasin?.id, detail.data?.id)
  const [verificationOuverte, setVerificationOuverte] = useDraftState(uiDraft, "verificationOuverte", false)

  const options: OptionDeFiltre<string>[] = [{ value: TOUS, label: "Tous les fournisseurs" }, ...(fournisseurs.data ?? []).map((f) => ({ value: f.id, label: f.nom }))]

  return (
    <CadreApplication pageActive="stock">
      <main className="flex flex-col gap-4">
        {/* en_tete */}
        <div className="flex flex-col gap-2">
          <nav aria-label={t("Fil d’Ariane")} className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href={lienVersPage("stock")} className="hover:text-primary hover:underline">
              {t("Stock")}
            </a>
            <ChevronRight className="size-3.5" />
            <span aria-current="page">{t("Factures fournisseurs")}</span>
          </nav>
          <h1 className="text-2xl font-bold">{t("Factures fournisseurs")}</h1>
          <p className="text-sm text-muted-foreground">{t("Consultez et gérez toutes les factures d’achat auprès de vos fournisseurs.")}</p>
        </div>

        {/* filtres */}
        <section className="grid gap-4 rounded-xl border border-grid-line bg-card p-4 shadow-card md:grid-cols-2 xl:grid-cols-[400fr_336fr_336fr_416fr] xl:items-end">
          <Champ libelle="Fournisseur">
            <SelectAvecIcone
              iconeSimple
              icone={Building2}
              aria-label={t("Fournisseur")}
              options={options}
              valeur={filtres.fournisseurId ?? TOUS}
              onChange={(v) => modifier({ fournisseurId: v === TOUS ? null : v })}
              className="[&_[data-slot=select-trigger]]:h-12! [&_[data-slot=select-trigger]]:text-sm"
            />
          </Champ>
          <Champ libelle="Date du">
            <ChampDate aria-label={t("Date du")} valeur={filtres.du} max={filtres.au} onChange={(du) => modifier({ du })} />
          </Champ>
          <Champ libelle="Au">
            <ChampDate aria-label={t("Au")} valeur={filtres.au} max={dateDuJour()} onChange={(au) => modifier({ au, du: au < filtres.du ? au : filtres.du })} />
          </Champ>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
            <Input
              type="search"
              aria-label={t("Rechercher une facture, un fournisseur")}
              placeholder={t("Rechercher une facture, un fournisseur...")}
              value={filtres.recherche}
              onChange={(e) => modifier({ recherche: e.target.value })}
              className="h-12 rounded-sm border-grid-line pl-12 text-sm md:text-sm"
            />
          </div>
        </section>

        {fournisseurs.error && <p role="alert" className="text-sm text-danger">{tr(fournisseurs.error)}</p>}
        <ListeDesFacturesFournisseurs
          factures={factures.data?.items ?? []}
          total={factures.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtres.pageSize}
          onPageChange={(page) => setFiltres((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => modifier({ pageSize })}
          selectionId={idAffiche}
          onSelection={(f) => setSelectionId(f.id)}
          enChargement={factures.isLoading}
          erreur={factures.error}
        />

        {prixAVerifier.error && <p role="alert" className="text-sm text-danger">{tr(prixAVerifier.error)}</p>}
        {detail.error && <EmptyState title={t("Erreur de chargement")} description={tr(detail.error)} />}
        {detail.isLoading && !detail.data && <p className="text-sm text-muted-foreground">{t("Chargement…")}</p>}
        {detail.data && (
          <DetailDeFactureFournisseur
            facture={detail.data}
            onModifier={() => notify("warning", t("Modification d’une facture fournisseur : écran à venir (pas encore de maquette)."))}
            onValider={detail.data.statut === "Brouillon" ? () => setAValider(true) : undefined}
            prixAVerifier={prixAVerifier.data?.lignes.length ?? 0}
            onPrixAVerifier={() => setVerificationOuverte(true)}
          />
        )}
      </main>

      <PrixAVerifierFenetre
        key={priceDraft?.key}
        draft={priceDraft}
        ouverte={verificationOuverte}
        onOuvertureChange={setVerificationOuverte}
        verification={prixAVerifier.data}
        onValider={async decisions => { if (!detail.data) throw new Error(t("Facture indisponible.")); await saveDraftOnServer(priceDraft, () => deciderPrix(detail.data!.id, decisions)) }}
      />

      <ConfirmDialog
        open={aValider}
        onOpenChange={setAValider}
        title={t("Valider la facture {{v0}}", { v0: detail.data?.numero ?? "" })}
        message={t("La facture validée ne pourra plus être modifiée. Elle reste liée à la réception de marchandise correspondante.")}
        confirmLabel={t("Valider")}
        onConfirm={async () => {
          try {
            if (!detail.data) return
            await valider(detail.data.id)
            notify("success", t("Facture {{v0}} validée.", { v0: detail.data?.numero ?? "" }))
          } catch (e) {
            notify("error", e instanceof Error ? tr(e.message) : t("La validation a échoué."))
          }
        }}
      />
    </CadreApplication>
  )
}

function Champ({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-[13px] font-semibold text-muted-foreground">{t(libelle)}</span>
      {children}
    </div>
  )
}
