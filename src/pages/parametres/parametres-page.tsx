import { useFormDraft, useDraftFactory, saveDraftOnServer } from "@/hooks/useFormDraft"
import { t, changerLangue, tr } from "@/i18n"
import { saveSettings, saveReference, deleteReference, saveShop, deleteShop } from "@/services/administration-api"
import { useState, type ReactNode } from "react"
import { Building2, Settings, ShieldCheck } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { ChoixDeLangue } from "@/components/parametres/choix-de-langue"
import { CatalogueDeReference, LIBELLES_DE_CATALOGUE } from "@/components/parametres/catalogue-de-reference"
import { GestionDesMagasins } from "@/components/parametres/gestion-des-magasins"
import { NavigationDesParametres, RUBRIQUES_DE_PARAMETRES } from "@/components/parametres/navigation-des-parametres"
import { ParametresDeFacturation } from "@/components/parametres/parametres-de-facturation"
import { ParametresDeVente } from "@/components/parametres/parametres-de-vente"
import { ParametresDuStock } from "@/components/parametres/parametres-du-stock"
import { Button } from "@/components/ui/button"
import { notify } from "@/lib/notify"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import {
  useCatalogueDeReference,
  useMagasinsDetailles,
  useParametresDeFacturation,
  useParametresDeVente,
  useParametresDuStock,
} from "@/hooks/useSettings"
import type { AsyncState, ElementDeCatalogue, FiltresDesMagasins, MagasinDetaille, RubriqueDeParametres, TypeDElementDeCatalogue } from "@/types"

export const lienRubriqueDeParametres = (rubrique: RubriqueDeParametres) => `/reglages/${rubrique}`

/** Rubrique d'après l'adresse (`/reglages/ventes`…) ; Stock par défaut. */
export function rubriqueDepuisRoute(route: string): RubriqueDeParametres {
  const rubrique = route.replace("/reglages", "").replace("/", "")
  return RUBRIQUES_DE_PARAMETRES.some((r) => r.value === rubrique) ? (rubrique as RubriqueDeParametres) : "stock"
}

const messageDErreur = (erreur: unknown) => (erreur instanceof Error ? erreur.message : "L’enregistrement a échoué.")

/** Figma : `parametres_stock`, `parametres_ventes`, `parametres_facturation`, `parametres_catalogue`, `parametres_magasins`. */
export function ParametresPage({ rubrique }: { rubrique: RubriqueDeParametres }) {
  return (
    <CadreApplication pageActive="reglages">
      <main className="flex flex-col gap-4">
        {/* titre_de_page */}
        <div className="flex items-center gap-4">
          <Settings className="size-[31px] text-primary" />
          <div className="flex flex-col gap-[5px]">
            <h1 className="text-2xl font-bold">{t("Paramètres")}</h1>
            <p className="text-sm text-muted-foreground">{t("Configurez votre entreprise et les paramètres du logiciel.")}</p>
          </div>
        </div>

        {/* contenu */}
        <div className="flex flex-col items-start gap-4 lg:flex-row">
          <NavigationDesParametres active={rubrique} lien={lienRubriqueDeParametres} />
          <div className="flex w-full min-w-0 flex-1">
            <Rubrique rubrique={rubrique} />
          </div>
        </div>
      </main>
    </CadreApplication>
  )
}

function Rubrique({ rubrique }: { rubrique: RubriqueDeParametres }) {
  switch (rubrique) {
    case "langue":
      return <ChoixDeLangue onChoisir={changerLangue} />
    case "stock":
      return <RubriqueStock />
    case "ventes":
      return <RubriqueVentes />
    case "facturation":
      return <RubriqueFacturation />
    case "catalogue":
      return <RubriqueCatalogue />
    case "magasins":
      return <RubriqueMagasins />
    case "roles":
      return (
        <EmptyState
          icon={ShieldCheck}
          title={t("Rôles & sécurité")}
          description={t("Les rôles et les permissions se règlent pour chaque compte dans l’écran Utilisateurs.")}
          action={
            <Button size="xl" className="w-full text-xs" render={<a href={lienVersPage("utilisateurs")} />}>
              {t("Ouvrir les utilisateurs")}
            </Button>
          }
          className="w-full bg-card"
        />
      )
    case "entreprise":
      return <EmptyState icon={Building2} title={t("Écran à venir")} description={t("La rubrique Entreprise n’a pas encore de maquette Figma.")} className="w-full bg-card" />
  }
}

/** Chargement / erreur communs aux formulaires de réglages. */
function Formulaire<T>({ etat, children }: { etat: AsyncState<T>; children: (valeurs: T) => ReactNode }) {
  if (etat.isLoading) return <p className="w-full py-16 text-center text-sm text-muted-foreground">{t("Chargement des paramètres…")}</p>
  if (etat.error || !etat.data)
    return (
      <p role="alert" className="w-full py-16 text-center text-sm text-destructive">
        {tr(etat.error) ?? t("Paramètres indisponibles.")}
      </p>
    )
  return <>{children(etat.data)}</>
}

/** Enregistrement commun : toast de succès ou d'erreur. */
function useEnregistrement<K extends "stock" | "ventes" | "facturation">(rubrique: K, message: string) {
  const draft = useFormDraft(`settings:${rubrique}`)
  const [enCours, setEnCours] = useState(false)
  const enregistrer = async (valeurs: Parameters<typeof saveSettings<K>>[1]) => {
    setEnCours(true)
    try {
      await saveDraftOnServer(draft, () => saveSettings(rubrique, valeurs))
      notify("success", message)
    } catch (erreur) {
      notify("error", messageDErreur(erreur))
    } finally {
      setEnCours(false)
    }
  }
  return [enCours, enregistrer] as const
}

function RubriqueStock() {
  const draft = useFormDraft("settings:stock")
  const etat = useParametresDuStock()
  const [enCours, enregistrer] = useEnregistrement("stock", "Paramètres du stock enregistrés.")
  return <Formulaire etat={etat}>{(p) => <ParametresDuStock draft={draft} parametres={p} onEnregistrer={enregistrer} enregistrement={enCours} />}</Formulaire>
}

function RubriqueVentes() {
  const draft = useFormDraft("settings:ventes")
  const etat = useParametresDeVente()
  const [enCours, enregistrer] = useEnregistrement("ventes", "Paramètres de vente enregistrés.")
  return <Formulaire etat={etat}>{(p) => <ParametresDeVente draft={draft} parametres={p} onEnregistrer={enregistrer} enregistrement={enCours} />}</Formulaire>
}

function RubriqueFacturation() {
  const draft = useFormDraft("settings:facturation")
  const etat = useParametresDeFacturation()
  const [enCours, enregistrer] = useEnregistrement("facturation", "Paramètres de facturation enregistrés.")
  return <Formulaire etat={etat}>{(p) => <ParametresDeFacturation draft={draft} parametres={p} onEnregistrer={enregistrer} enregistrement={enCours} />}</Formulaire>
}

function RubriqueCatalogue() {
  const factory = useDraftFactory()
  const uiDraft = useFormDraft("reference-ui")
  const draftFor = (type: string, id?: string) => factory(`reference:${type}`, id)
  const catalogue = useCatalogueDeReference()
  const [aSupprimer, setASupprimer] = useState<{ type: TypeDElementDeCatalogue; element: ElementDeCatalogue } | null>(null)
  const elementDefini = aSupprimer ? LIBELLES_DE_CATALOGUE[aSupprimer.type].defini : ""

  return (
    <>
      <CatalogueDeReference
        uiDraft={uiDraft}
        draftFor={draftFor}
        catalogue={catalogue.data}
        enChargement={catalogue.isLoading}
        erreur={catalogue.error}
        onEnregistrer={async (e) => {
          try {
            await saveDraftOnServer(draftFor(e.type, e.id), () => saveReference(e.type, e))
            notify("success", e.id ? t("« {{v0}} » modifié.", { v0: e.nom }) : t("« {{v0}} » ajouté.", { v0: e.nom }))
            return true
          } catch (erreur) {
            notify("error", messageDErreur(erreur))
            return false
          }
        }}
        onSupprimer={(type, element) => setASupprimer({ type, element })}
      />
      <ConfirmDialog
        open={aSupprimer !== null}
        onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}
        title={t("Supprimer {{v0}} « {{v1}} »", { v0: elementDefini, v1: aSupprimer?.element.nom ?? "" })}
        message={
          aSupprimer?.element.nombreDeProduits
            ? t("{{v0}} produit(s) l’utilisent : ils devront être reclassés.", { v0: aSupprimer.element.nombreDeProduits })
            : t("Elle ne sera plus proposée dans les fiches produit.")
        }
        confirmLabel={t("Supprimer")}
        onConfirm={async () => { if (!aSupprimer) return; try { await deleteReference(aSupprimer.type, aSupprimer.element.id); setASupprimer(null); notify("success", t("Élément retiré du catalogue.")) } catch (e) { notify("error", messageDErreur(e)) } }}
      />
    </>
  )
}

function RubriqueMagasins() {
  const factory = useDraftFactory()
  const uiDraft = useFormDraft("shop-ui")
  const draftFor = (id?: string) => factory("shop", id)
  const [filtres, setFiltres] = useState<FiltresDesMagasins>({ recherche: "", statut: null })
  const magasins = useMagasinsDetailles(filtres)
  const [aSupprimer, setASupprimer] = useState<MagasinDetaille | null>(null)

  return (
    <>
      <GestionDesMagasins
        uiDraft={uiDraft}
        draftFor={draftFor}
        magasins={magasins.data ?? []}
        enChargement={magasins.isLoading}
        erreur={magasins.error}
        filtres={filtres}
        onFiltresChange={setFiltres}
        onEnregistrer={async (m) => {
          try {
            await saveDraftOnServer(draftFor(m.id), () => saveShop(m))
            notify("success", m.id ? t("{{v0}} mis à jour.", { v0: m.nom }) : t("{{v0}} créé.", { v0: m.nom }))
            return true
          } catch (erreur) {
            notify("error", messageDErreur(erreur))
            return false
          }
        }}
        onSupprimer={setASupprimer}
      />
      <ConfirmDialog
        open={aSupprimer !== null}
        onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}
        title={t("Supprimer {{v0}}", { v0: aSupprimer?.nom ?? "" })}
        message={t("Le magasin sera archivé. Le magasin principal et les magasins avec un historique ne peuvent pas être retirés.")}
        confirmLabel={t("Supprimer")}
        onConfirm={async () => { if (!aSupprimer) return; try { await deleteShop(aSupprimer.id); setASupprimer(null); notify("success", t("Magasin archivé.")) } catch (e) { notify("error", messageDErreur(e)) } }}
      />
    </>
  )
}
