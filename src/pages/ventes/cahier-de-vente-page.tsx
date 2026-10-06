import { t, tr } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { changeSale, getSale } from "@/services/backend-api"
import { useState } from "react"
import { Banknote, ClipboardList, Scale, List, Package, Plus, ShoppingCart, Store } from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { ChampDate, dateDuJour } from "@/components/forms/champ-date"
import { CahierDesVentes } from "@/components/ventes/cahier-des-ventes"
import { Button } from "@/components/ui/button"
import { useActiveStore } from "@/hooks/useActiveStore"
import { useStores } from "@/hooks/useStores"
import { useJournauxDeCaisse, useResumeDeCaisse, useValiderJournalDeCaisse } from "@/hooks/useCashJournals"
import { download } from "@/services/http-api"
import { usePreferences } from "@/hooks/usePreferences"
import { notify } from "@/lib/notify"
import { CadreApplication } from "@/pages/cadre-application"
import { useCahierDeVenteProvisoire, useResumeDuCahierProvisoire } from "@/hooks/useSales"
import { useFenetresDeVente } from "@/pages/ventes/fenetres-de-vente"
import type { FiltresDuCahier, VenteDuCahier } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : frame `cahier_de_vente` (node 90:5666) — vue compacte des ventes d'une journée. */
export function CahierDeVentePage() {
  const { data: magasins } = useStores()
  const [magasinActif, choisirMagasin] = useActiveStore()
  const preferences = usePreferences()
  const [taillePersonnalisee, setTaillePersonnalisee] = useState<number | null>(null)
  const fenetresDeVente = useFenetresDeVente(magasins ?? [], magasinActif)

  const [filtres, setFiltres] = useState<Omit<FiltresDuCahier, "storeId">>({
    date: dateDuJour(),
    page: 1,
    pageSize: 25,
  })
  const filtresComplets: FiltresDuCahier = { ...filtres, pageSize: taillePersonnalisee ?? preferences.data?.ventes.nombreDeVentesParPage ?? 25, storeId: magasinActif?.id }
  const resume = useResumeDuCahierProvisoire(magasinActif?.id, filtres.date)
  const cahier = useCahierDeVenteProvisoire(filtresComplets)
  const caisse = useResumeDeCaisse(magasinActif?.id, filtres.date)
  const journaux = useJournauxDeCaisse(magasinActif?.id, filtres.date)
  const validerJournal = useValiderJournalDeCaisse()
  const [journalEnCours, setJournalEnCours] = useState<string | null>(null)

  const [venteASupprimer, setVenteASupprimer] = useState<VenteDuCahier | null>(null)

  const optionsMagasin: OptionDeFiltre<string>[] = (magasins ?? []).map((m) => ({ value: m.id, label: m.name }))

  // Le cahier contient déjà les articles : on prépare directement le formulaire de modification
  const modifier = async (v: VenteDuCahier) => {
    try { fenetresDeVente.modifier(await getSale(v.id)) } catch (e) { notify("error", e instanceof Error ? e.message : t("Erreur API.")) }
  }

  return (
    <CadreApplication pageActive="ventes">
      <main className="flex flex-col gap-4">
        {/* titre_de_page */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-lg bg-accent text-primary">
              <ShoppingCart className="size-[26px]" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-2xl font-bold">{t("Cahier de vente")}</h1>
              <p className="text-sm text-muted-foreground">{t("Vue compacte des ventes")}</p>
            </div>
          </div>
          <Button variant="outline" render={<a href="/ventes" />} className="h-10 gap-2 rounded-sm border-grid-line px-3.5 text-[13px]">
            <List className="size-[17px]" />
            {t("Liste des ventes")}
          </Button>
        </div>

        {/* filtres_et_action */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-card p-4 shadow-card">
          <FiltreSelecteur
            icone={Store}
            libelle={t("Magasin")}
            options={optionsMagasin}
            valeur={magasinActif?.id ?? null}
            onChange={(id) => {
              choisirMagasin(id)
              setFiltres((f) => ({ ...f, page: 1 }))
            }}
            placeholder={t("Choisir un magasin")}
            className="w-[320px]"
          />
          <ChampDate
            aria-label={t("Date du cahier")}
            valeur={filtres.date}
            max={dateDuJour()}
            onChange={(date) => setFiltres((f) => ({ ...f, date, page: 1 }))}
            className="w-[320px]"
          />
          <Button variant="outline" render={<a href="/ventes/depenses-versements" />} className="ml-auto h-10 gap-2 rounded-sm border-grid-line px-3.5 text-[13px] font-semibold">
            <Scale className="size-[17px]" />
            {t("Dépenses & versements")}
          </Button>
          <Button variant="outline" render={<a href="/ventes/cahier/saisie" />} className="h-10 gap-2 rounded-sm border-grid-line px-3.5 text-[13px] font-semibold">
            <ClipboardList className="size-[17px]" />
            {t("Saisir le cahier")}
          </Button>
          <Button onClick={fenetresDeVente.nouvelleVente} className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-semibold">
            <Plus className="size-[17px]" />
            {t("Enregistrer une vente")}
          </Button>
        </div>

        {/* indicateurs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <IndicateurCle
            ton="info"
            icone={Banknote}
            libelle={t("Total du jour")}
            valeur={resume.data ? ariary.format(resume.data.venteMontant) : ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="succes"
            icone={ShoppingCart}
            libelle={t("Ventes")}
            valeur={resume.data ? nombre.format(resume.data.ventes) : ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="alerte"
            icone={Package}
            libelle={t("Articles")}
            valeur={resume.data ? nombre.format(resume.data.articles) : ""}
            enChargement={resume.isLoading}
          />
        </div>

        <section className="flex flex-col gap-4 rounded-lg bg-card p-4 shadow-card" aria-label={t("Dépenses et clôture de caisse")}>
          <h2 className="text-base font-semibold">{t("Dépenses et clôture de caisse")}</h2>
          {caisse.isLoading ? <p role="status" className="text-sm">{t("Chargement de la caisse…")}</p> : caisse.error ? <p role="alert" className="text-sm text-destructive">{caisse.error}</p> : caisse.data && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[["Ventes validées", caisse.data.salesTotal], ["Dépenses validées", caisse.data.expenseTotal], ["Montant après dépenses", caisse.data.amountAfterExpenses], ["Espèces attendues", caisse.data.expectedCash]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{tr(label)}</p><p className="text-base font-semibold">{nombre.format(Number(value))} {caisse.data?.currencyLabel ?? t("Ar")}</p></div>)}
          </div>}
          <p className="text-xs text-muted-foreground">{t("Les espèces attendues tiennent compte des ventes et dépenses réglées en espèces. Les brouillons ne modifient ni le stock ni les totaux.")}</p>
          {journaux.isLoading ? <p role="status" className="text-sm">{t("Chargement des journaux…")}</p> : journaux.error ? <p role="alert" className="text-sm text-destructive">{journaux.error}</p> : journaux.data?.length === 0 ? <p className="text-sm text-muted-foreground">{t("Aucun journal saisi pour cette date.")}</p> : journaux.data?.map(j => <div key={j.id} className="flex flex-col gap-2 border-t border-grid-line pt-3 text-sm">
            <p>{t("Journal")} {j.id.slice(0, 8)} · {j.status === "DRAFT" ? t("Brouillon") : j.status === "VALIDATED" ? t("Validé") : t("Annulé")} · {j.operations.length} {t("vente(s)")}</p>
            {j.finance.map(f => <p key={f.id}>{f.kind === "EXPENSE" ? t("Dépense") : t("Argent remis")} {f.number} : {ariary.format(Number(f.amount))}{f.kind === "REMITTANCE" && f.expectedAmount !== null ? t(" · Attendu : {{v0}} · Écart : {{v1}}", { v0: ariary.format(Number(f.expectedAmount)), v1: ariary.format(Number(f.difference)) }) : ""}</p>)}
            <div className="flex flex-wrap gap-2">{j.attachments.map(f => <Button key={f.id} variant="outline" onClick={async () => { try { await download(`/cash-journals/${j.id}/attachments/${f.id}`, f.originalName) } catch (e) { notify("error", e instanceof Error ? e.message : t("Justificatif indisponible.")) } }}>{f.originalName}</Button>)}
            {j.status === "DRAFT" && <Button disabled={journalEnCours !== null} onClick={async () => { setJournalEnCours(j.id); try { const warnings = await validerJournal(j.id); for (const message of warnings) notify("warning", message); notify("success", t("Journal validé.")) } catch (e) { notify("error", e instanceof Error ? e.message : t("Validation impossible.")) } finally { setJournalEnCours(null) } }}>{journalEnCours === j.id ? t("Validation…") : t("Valider le journal complet")}</Button>}</div>
          </div>)}
        </section>
        {/* tableau_des_ventes */}
        <CahierDesVentes
          afficherHeures={preferences.data?.ventes.afficherHeuresDansLeCahier}
          ventes={cahier.data?.items ?? []}
          total={cahier.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtresComplets.pageSize}
          onPageChange={(page) => setFiltres((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => { setTaillePersonnalisee(pageSize); setFiltres((f) => ({ ...f, pageSize, page: 1 })) }}
          onConsulter={(v) => fenetresDeVente.consulter(v.id, v.venteNumero)}
          onModifier={modifier}
          onSupprimer={setVenteASupprimer}
          enChargement={cahier.isLoading}
          erreur={cahier.error}
        />
      </main>

      {fenetresDeVente.fenetres}
      <ConfirmDialog
        open={venteASupprimer !== null}
        onOpenChange={(ouvert) => !ouvert && setVenteASupprimer(null)}
        title={t("Supprimer la vente {{v0}}", { v0: venteASupprimer?.venteNumero ?? "" })}
        message={t("La vente sera annulée et les articles remis en stock. Cette action est définitive.")}
        confirmLabel={t("Supprimer")}
        onConfirm={async () => { if (!venteASupprimer) return; try { await changeSale(venteASupprimer.id, "annuler"); setVenteASupprimer(null); notify("success", t("Vente annulée.")) } catch (e) { notify("error", e instanceof Error ? e.message : t("Erreur API.")) } }}
      />
    </CadreApplication>
  )
}
