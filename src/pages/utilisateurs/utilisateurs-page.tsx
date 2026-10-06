import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t } from "@/i18n"
import { getUser } from "@/services/administration-api"
import { useState } from "react"
import { CircleX, Plus, Search, ShieldCheck, Store, Tag, Users } from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { TAILLES_DE_PAGE } from "@/components/donnees/tableau-de-donnees"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { ListeDesUtilisateurs } from "@/components/utilisateurs/liste-des-utilisateurs"
import { ROLES } from "@/components/utilisateurs/roles-et-permissions"
import { UtilisateurFenetre } from "@/components/utilisateurs/utilisateur-fenetre"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStores } from "@/hooks/useStores"
import { notify } from "@/lib/notify"
import { CadreApplication } from "@/pages/cadre-application"
import {
  useEnregistrerUtilisateur, useChangerStatutUtilisateur, useReinitialiserMotDePasse,
  useResumeDesUtilisateurs,
  useUtilisateurs,

} from "@/hooks/useUsers"
import type { FiltresDesUtilisateurs, LigneDUtilisateur, RoleUtilisateur, StatutUtilisateur, UtilisateurSaisi } from "@/types"

const TOUS = "__tous__"
const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : `utilisateurs` (node 90:5341) + fenêtre `nouvel_utilisateur` (node 90:2727). */
export function UtilisateursPage() {
  const { data: magasins } = useStores()
  const [filtres, setFiltres] = useState<FiltresDesUtilisateurs>({
    recherche: "",
    magasinId: null,
    role: null,
    statut: null,
    page: 1,
    pageSize: TAILLES_DE_PAGE[0],
  })
  const modifierFiltres = (modif: Partial<Omit<FiltresDesUtilisateurs, "page">>) => setFiltres((f) => ({ ...f, ...modif, page: 1 }))
  const resume = useResumeDesUtilisateurs()
  const utilisateurs = useUtilisateurs(filtres)

  const enregistrer = useEnregistrerUtilisateur()
  const changerStatut = useChangerStatutUtilisateur()
  const reinitialiser = useReinitialiserMotDePasse()
  const [lienReinitialisation, setLienReinitialisation] = useState<string | null>(null)
  const uiDraft = useFormDraft("user-ui")
  const [fenetreOuverte, setFenetreOuverte] = useDraftState(uiDraft, "fenetreOuverte", false)
  const [aModifier, setAModifier] = useDraftState<UtilisateurSaisi | undefined>(uiDraft, "aModifier", undefined)
  const [aChangerDeStatut, setAChangerDeStatut] = useState<LigneDUtilisateur | null>(null)

  const draft = useFormDraft("user", undefined, aModifier?.utilisateurId)
  const ouvrir = async (id?: string) => {
    try { const u = id ? await getUser(id) : undefined; setAModifier(u); setFenetreOuverte(true) }
    catch (e) { notify("error", e instanceof Error ? e.message : t("Utilisateur introuvable.")) }
  }
  const soumettre = async (u: UtilisateurSaisi) => {
    try {
      const nouveau = !u.utilisateurId
      await saveDraftOnServer(draft, () => enregistrer(u))
      setFenetreOuverte(false)
      notify("success", !nouveau ? t("{{v0}} mis à jour.", { v0: u.nomComplet }) : t("{{v0}} ajouté.", { v0: u.nomComplet }))
    } catch (erreur) {
      notify("error", erreur instanceof Error ? erreur.message : t("L’enregistrement a échoué."))
    }
  }

  const optionsMagasin: OptionDeFiltre<string>[] = [{ value: TOUS, label: "Tous les magasins" }, ...(magasins ?? []).map((m) => ({ value: m.id, label: m.name }))]
  const optionsRole: OptionDeFiltre<RoleUtilisateur | typeof TOUS>[] = [{ value: TOUS, label: "Tous les rôles" }, ...ROLES.map((r) => ({ value: r, label: r }))]
  const optionsStatut: OptionDeFiltre<StatutUtilisateur | typeof TOUS>[] = [
    { value: TOUS, label: "Tous les statuts" },
    { value: "Actif", label: "Actif" },
    { value: "Inactif", label: "Inactif" },
  ]

  return (
    <CadreApplication pageActive="utilisateurs">
      <main className="flex flex-col gap-4">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-2xl font-bold">{t("Utilisateurs")}</h1>
            <p className="text-sm text-muted-foreground">{t("Consultez et gérez les accès et les permissions du logiciel.")}</p>
          </div>
          <Button onClick={() => ouvrir()} className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal">
            <Plus className="size-[17px]" />
            {t("Nouvel utilisateur")}
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
          <Input
            type="search"
            aria-label={t("Rechercher un utilisateur")}
            value={filtres.recherche}
            onChange={(e) => modifierFiltres({ recherche: e.target.value })}
            placeholder={t("Rechercher un utilisateur, un rôle ou un magasin...")}
            className="h-12 rounded-sm border-grid-line pl-11 text-sm md:text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:w-3/4">
          <FiltreSelecteur icone={Store} libelle={t("Magasin")} options={optionsMagasin} valeur={filtres.magasinId ?? TOUS} onChange={(v) => modifierFiltres({ magasinId: v === TOUS ? null : v })} />
          <FiltreSelecteur icone={Tag} libelle={t("Rôle")} options={optionsRole} valeur={filtres.role ?? TOUS} onChange={(v) => modifierFiltres({ role: v === TOUS ? null : v })} />
          <FiltreSelecteur icone={ShieldCheck} libelle={t("Statut")} options={optionsStatut} valeur={filtres.statut ?? TOUS} onChange={(v) => modifierFiltres({ statut: v === TOUS ? null : v })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <IndicateurCle ton="info" icone={Users} libelle={t("Utilisateurs actifs")} valeur={resume.data ? nombre.format(resume.data.utilisateursActifs) : ""} detail={resume.data?.utilisateursActifsDetail} enChargement={resume.isLoading} />
          <IndicateurCle ton="succes" icone={ShieldCheck} libelle={t("Administrateurs")} valeur={resume.data ? nombre.format(resume.data.administrateurs) : ""} detail={resume.data?.administrateursDetail} enChargement={resume.isLoading} />
          <IndicateurCle ton="alerte" icone={Store} libelle={t("Magasins couverts")} valeur={resume.data ? nombre.format(resume.data.magasinsCouverts) : ""} detail={resume.data?.magasinsCouvertsDetail} enChargement={resume.isLoading} />
          <IndicateurCle ton="danger" icone={CircleX} libelle={t("Comptes inactifs")} valeur={resume.data ? nombre.format(resume.data.comptesInactifs) : ""} detail={resume.data?.comptesInactifsDetail} enChargement={resume.isLoading} />
        </div>

        {lienReinitialisation && <div className="flex flex-col gap-2 rounded-lg bg-card p-4"><p className="text-sm">{t("Lien privé, valable 30 minutes. Aucun e-mail envoyé.")}</p><Input aria-label={t("Lien de réinitialisation")} readOnly value={lienReinitialisation} onFocus={e => e.target.select()} /><Button variant="outline" onClick={() => setLienReinitialisation(null)}>{t("Masquer le lien")}</Button></div>}
        <ListeDesUtilisateurs
          lignes={utilisateurs.data?.items ?? []}
          total={utilisateurs.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtres.pageSize}
          onPageChange={(page) => setFiltres((f) => ({ ...f, page }))}
          onPageSizeChange={(pageSize) => modifierFiltres({ pageSize })}
          onConsulter={(u) => ouvrir(u.id)}
          onModifier={(u) => ouvrir(u.id)}
          onChangerStatut={setAChangerDeStatut}
          onReinitialiserMotDePasse={async (u) => { try { setLienReinitialisation(await reinitialiser(u.id)); notify("success", t("Lien créé : transmettez-le à la personne concernée.")) } catch (e) { notify("error", e instanceof Error ? e.message : t("Réinitialisation impossible.")) } }}
          enChargement={utilisateurs.isLoading}
          erreur={utilisateurs.error}
        />
      </main>

      <UtilisateurFenetre key={draft?.key} draft={draft} open={fenetreOuverte} onOpenChange={setFenetreOuverte} magasins={magasins ?? []} utilisateurAModifier={aModifier} onSoumettre={soumettre} />
      <ConfirmDialog
        open={aChangerDeStatut !== null}
        onOpenChange={(ouvert) => !ouvert && setAChangerDeStatut(null)}
        title={aChangerDeStatut?.statut === "Actif" ? t("Désactiver le compte") : t("Réactiver le compte")}
        message={
          aChangerDeStatut?.statut === "Actif"
            ? t("{{v0}} ne pourra plus se connecter au logiciel.", { v0: aChangerDeStatut?.nom })
            : t("{{v0}} pourra de nouveau se connecter.", { v0: aChangerDeStatut?.nom ?? "" })
        }
        confirmLabel={aChangerDeStatut?.statut === "Actif" ? t("Désactiver") : t("Réactiver")}
        onConfirm={async () => { if (!aChangerDeStatut) return; try { await changerStatut(aChangerDeStatut.id, aChangerDeStatut.statut === "Actif" ? "Inactif" : "Actif"); setAChangerDeStatut(null); notify("success", t("Statut enregistré.")) } catch (e) { notify("error", e instanceof Error ? e.message : t("Modification impossible.")) } }}
      />
    </CadreApplication>
  )
}
