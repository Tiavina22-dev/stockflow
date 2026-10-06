import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { changeSale } from "@/services/backend-api"
import { useState } from "react"
import { usePreferences } from "@/hooks/usePreferences"
import { BookOpen, CalendarDays, CircleX, Coins, Plus, Search, ShoppingCart, Store, Tag, TriangleAlert, User } from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { ListeDesVentes } from "@/components/ventes/liste-des-ventes"
import { FenetreDeFactureClient } from "@/components/ventes/facture-client-fenetre"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useActiveStore } from "@/hooks/useActiveStore"
import { useStores } from "@/hooks/useStores"
import { notify } from "@/lib/notify"
import { CadreApplication } from "@/pages/cadre-application"
import {
  useDetailDeVenteProvisoire,
  useResumeDesVentesProvisoire,
  useVendeursProvisoires,
  useVentesProvisoires,
} from "@/hooks/useSales"
import { useFenetresDeVente } from "@/pages/ventes/fenetres-de-vente"
import { useCreerFactureClient, useClientsDeFacture } from "@/hooks/useCustomerInvoices"
import type { FiltresDesVentes, PeriodeDeVente, StatutDeVente } from "@/types"

const TOUS = "__tous__"

const optionsPeriode: OptionDeFiltre<PeriodeDeVente>[] = [
  { value: "aujourd-hui", label: "Aujourd’hui" },
  { value: "7-jours", label: "7 derniers jours" },
  { value: "30-jours", label: "30 derniers jours" },
  { value: "ce-mois", label: "Ce mois-ci" },
  { value: "tout", label: "Toute la période" },
]

const optionsStatut: OptionDeFiltre<StatutDeVente | typeof TOUS>[] = [
  { value: TOUS, label: "Tous les statuts" },
  { value: "Validée", label: "Validée" },
  { value: "En attente", label: "En attente" },
  { value: "Annulée", label: "Annulée" },
]

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : frame `liste_des_ventes` (node 90:4062). */
export function VentesPage() {
  const { data: magasins } = useStores()
  const [magasinActif, choisirMagasin] = useActiveStore()
  const preferences = usePreferences()
  const [taillePersonnalisee, setTaillePersonnalisee] = useState<number | null>(null)

  const [filtres, setFiltres] = useState<Omit<FiltresDesVentes, "storeId">>({
    recherche: "",
    periode: "aujourd-hui",
    statut: null,
    utilisateurId: null,
    page: 1,
    pageSize: 25,
  })
  // Tout changement de filtre revient à la page 1
  const modifierFiltres = (modif: Partial<Omit<FiltresDesVentes, "storeId" | "page">>) =>
    setFiltres((actuels) => ({ ...actuels, ...modif, page: 1 }))

  const filtresComplets: FiltresDesVentes = { ...filtres, pageSize: taillePersonnalisee ?? preferences.data?.ventes.nombreDeVentesParPage ?? 25, storeId: magasinActif?.id }
  const resume = useResumeDesVentesProvisoire(magasinActif?.id, filtres.periode)
  const ventes = useVentesProvisoires(filtresComplets, magasinActif?.name)
  const vendeurs = useVendeursProvisoires(magasinActif?.id)

  const optionsMagasin: OptionDeFiltre<string>[] = (magasins ?? []).map((m) => ({ value: m.id, label: m.name }))
  const optionsVendeur: OptionDeFiltre<string>[] = [
    { value: TOUS, label: "Tous les utilisateurs" },
    ...(vendeurs.data ?? []).map((v) => ({ value: v.id, label: v.nom })),
  ]

  const bientot = (action: string) => notify("warning", t("{{v0}} : écran à venir.", { v0: action }))

  const fenetresDeVente = useFenetresDeVente(magasins ?? [], magasinActif)
  // Facture client (Figma : facture_client_fenetre) depuis une vente validée
  const invoiceUi = useFormDraft("customer-invoice-ui", magasinActif?.id)
  const [venteAFacturer, setVenteAFacturer] = useDraftState<string | null>(invoiceUi, "venteAFacturer", null)
  const venteFacturee = useDetailDeVenteProvisoire(venteAFacturer)
  const invoiceDraft = useFormDraft("customer-invoice", venteFacturee.data?.magasinId, venteAFacturer ?? undefined)
  const creerFactureClient = useCreerFactureClient()
  const clientsDeFacture = useClientsDeFacture(venteFacturee.data?.magasinId)

  return (
    <CadreApplication pageActive="ventes">
      <main className="flex flex-col gap-4">
        {/* titre_et_action */}
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-2xl font-bold">{t("Ventes")}</h1>
            <p className="text-sm text-muted-foreground">{t("Consultez et gérez les ventes de votre magasin.")}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              render={<a href="/ventes/cahier" />}
              className="h-10 gap-2 rounded-sm border-grid-line px-3.5 text-[13px]"
            >
              <BookOpen className="size-[17px]" />
              {t("Cahier de vente")}
            </Button>
            <Button onClick={fenetresDeVente.nouvelleVente} className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal">
              <Plus className="size-[17px]" />
              {t("Nouvelle vente")}
            </Button>
          </div>
        </div>

        {/* recherche */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
          <Input
            type="search"
            aria-label={t("Rechercher une vente")}
            value={filtres.recherche}
            onChange={(e) => modifierFiltres({ recherche: e.target.value })}
            placeholder={t("Rechercher par numéro, produit ou utilisateur...")}
            className="h-12 rounded-sm border-grid-line pl-11 text-sm md:text-sm"
          />
        </div>

        {/* filtres */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[320fr_320fr_320fr_338fr]">
          <FiltreSelecteur
            icone={Store}
            libelle={t("Magasin")}
            options={optionsMagasin}
            valeur={magasinActif?.id ?? null}
            onChange={(id) => {
              choisirMagasin(id)
              modifierFiltres({})
            }}
            placeholder={t("Choisir un magasin")}
          />
          <FiltreSelecteur
            icone={CalendarDays}
            libelle={t("Période")}
            options={optionsPeriode}
            valeur={filtres.periode}
            onChange={(periode) => modifierFiltres({ periode })}
          />
          <FiltreSelecteur
            icone={Tag}
            libelle={t("Statut")}
            options={optionsStatut}
            valeur={filtres.statut ?? TOUS}
            onChange={(v) => modifierFiltres({ statut: v === TOUS ? null : v })}
          />
          <FiltreSelecteur
            icone={User}
            libelle={t("Utilisateur")}
            options={optionsVendeur}
            valeur={filtres.utilisateurId ?? TOUS}
            onChange={(v) => modifierFiltres({ utilisateurId: v === TOUS ? null : v })}
          />
        </div>

        {/* indicateurs_cles */}
        <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
          <IndicateurCle
            ton="info"
            icone={ShoppingCart}
            libelle={t("Ventes aujourd’hui")}
            valeur={resume.data ? nombre.format(resume.data.ventesAujourdHui) : ""}
            detail={resume.data?.ventesAujourdHuiEvolution ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="succes"
            icone={Coins}
            libelle={t("Montant du jour")}
            valeur={resume.data ? ariary.format(resume.data.venteMontant) : ""}
            detail={resume.data?.venteMontantEvolution ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="alerte"
            icone={TriangleAlert}
            libelle={t("À vérifier")}
            valeur={resume.data ? nombre.format(resume.data.aVerifier) : ""}
            detail={resume.data?.aVerifierDetail ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="danger"
            icone={CircleX}
            libelle={t("Ventes annulées")}
            valeur={resume.data ? nombre.format(resume.data.ventesAnnulees) : ""}
            detail={resume.data?.ventesAnnuleesDetail ?? ""}
            enChargement={resume.isLoading}
          />
        </div>

        {/* liste_des_ventes */}
        <ListeDesVentes
          lignes={ventes.data?.items ?? []}
          total={ventes.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtresComplets.pageSize}
          onPageChange={(page) => setFiltres((actuels) => ({ ...actuels, page }))}
          onPageSizeChange={(pageSize) => { setTaillePersonnalisee(pageSize); modifierFiltres({ pageSize }) }}
          onConsulter={(v) => fenetresDeVente.consulter(v.id, v.venteNumero)}
          onValider={async (v) => { try { await changeSale(v.id, "valider"); notify("success", t("Vente {{v0}} validée.", { v0: v.venteNumero })) } catch (e) { notify("error", e instanceof Error ? e.message : t("Erreur API.")) } }}
          onImprimer={(v) => bientot(`Ticket de la vente ${v.venteNumero}`)}
          onFacturer={(v) => setVenteAFacturer(v.id)}
          onAnnuler={async (v) => { try { await changeSale(v.id, "annuler"); notify("success", t("Vente {{v0}} annulée.", { v0: v.venteNumero })) } catch (e) { notify("error", e instanceof Error ? e.message : t("Erreur API.")) } }}
          enChargement={ventes.isLoading}
          erreur={ventes.error}
        />
      </main>

      {venteAFacturer && (venteFacturee.error || clientsDeFacture.error) && <p role="alert" className="text-sm text-danger">{t(venteFacturee.error ?? clientsDeFacture.error ?? "Erreur API.")}</p>}
      {fenetresDeVente.fenetres}
      <FenetreDeFactureClient
        key={invoiceDraft?.key}
        draft={invoiceDraft}
        ouverte={venteAFacturer !== null}
        onOuvertureChange={(o) => !o && setVenteAFacturer(null)}
        vente={venteAFacturer ? venteFacturee.data : undefined}
        clients={clientsDeFacture.data ?? []}
        numeroPrevu={null}
        onEnregistrer={saisie => saveDraftOnServer(invoiceDraft, () => creerFactureClient(saisie))}
      />
    </CadreApplication>
  )
}
