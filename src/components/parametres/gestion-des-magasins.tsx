import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState } from "react"
import { Pencil, Plus, Save, Search, Store, Trash2 } from "lucide-react"

import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { CLASSE_DE_CHAMP, OptionAInterrupteur, PanneauDeParametres } from "@/components/parametres/elements-de-parametres"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { FiltresDesMagasins, MagasinDetaille, MagasinSaisi, StatutDeMagasin } from "@/types"
import { t, tr } from "@/i18n"

const TOUS = "__tous__"
const OPTIONS_STATUT: { value: StatutDeMagasin | typeof TOUS; label: string }[] = [
  { value: TOUS, label: "Tous les statuts" },
  { value: "Actif", label: "Actif" },
  { value: "Inactif", label: "Inactif" },
]

const MAGASIN_VIDE: MagasinSaisi = { nom: "", code: "", responsable: "", telephone: "", email: "", adresse: "", principal: false, statut: "Actif" }

/** Figma : `parametres_magasins` (node 90:1093) — `liste_des_magasins` + `details_du_magasin`. */
export function GestionDesMagasins({
  magasins,
  draftFor,
  uiDraft,
  enChargement = false,
  erreur = null,
  filtres,
  onFiltresChange,
  onEnregistrer,
  onSupprimer,
}: {
  magasins: MagasinDetaille[]
  draftFor?: (id?: string) => LocalDraft | undefined
  uiDraft?: LocalDraft
  enChargement?: boolean
  erreur?: string | null
  filtres: FiltresDesMagasins
  onFiltresChange: (filtres: FiltresDesMagasins) => void
  /** Renvoie `true` si l'enregistrement a réussi */
  onEnregistrer: (magasin: MagasinSaisi) => Promise<boolean>
  onSupprimer: (magasin: MagasinDetaille) => void
}) {
  /** Magasin ouvert dans `details_du_magasin` : un magasin existant ou `MAGASIN_VIDE` pour une création. */
  const [selection, setSelection] = useDraftState<MagasinSaisi | null>(uiDraft, "selection", null)

  const colonnes: ColonneDeTableau<MagasinDetaille>[] = [
    {
      id: "magasin",
      libelle: "Magasin",
      largeur: 320,
      min: 220,
      cellule: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
            <Store className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-col gap-[3px]">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold">{m.nom}</span>
              <span className="shrink-0 rounded-[4px] bg-accent px-1.5 py-0.5 text-[10px] text-primary">{m.code}</span>
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{m.adresse}</span>
          </span>
        </div>
      ),
    },
    {
      id: "responsable",
      libelle: "Responsable",
      largeur: null,
      min: 180,
      cellule: (m) => (
        <span className="flex flex-col gap-[3px] text-xs">
          <span className="truncate">{m.responsable}</span>
          <span className="truncate text-[11px] text-muted-foreground">{m.telephone}</span>
        </span>
      ),
    },
    {
      id: "statut",
      libelle: "Statut",
      largeur: 180,
      min: 130,
      cellule: (m) => (
        <span className="flex gap-2">
          {m.principal && <PastilleEtat ton="succes" libelle={t("Principal")} className="h-6 px-2.5 text-[11px]" />}
          <PastilleEtat ton={m.statut === "Actif" ? "succes" : "neutre"} libelle={tr(m.statut)} className="h-6 px-2.5 text-[11px]" />
        </span>
      ),
    },
    {
      id: "actions",
      libelle: "Actions",
      largeur: 96,
      min: 84,
      alignement: "droite",
      cellule: (m) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            aria-label={t("Modifier {{v0}}", { v0: m.nom })}
            aria-pressed={selection?.id === m.id}
            onClick={() => setSelection(m)}
            className="size-7 rounded-[4px] p-0 hover:bg-primary hover:text-primary-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-3.5"
          >
            <Pencil />
          </Button>
          <Button variant="ghost" aria-label={t("Supprimer {{v0}}", { v0: m.nom })} onClick={() => onSupprimer(m)} className="size-7 rounded-[4px] bg-background p-0 text-muted-foreground hover:bg-destructive hover:text-white [&_svg]:size-3.5">
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PanneauDeParametres
      titre={t("Gestion des magasins")}
      description={t("Ajoutez et gérez vos magasins. Vous pouvez aussi préciser un point de vente principal.")}
      action={
        <Button onClick={() => setSelection(MAGASIN_VIDE)} className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal">
          <Plus className="size-3.5" />
          {t("Nouveau magasin")}
        </Button>
      }
    >
      {/* outils */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("Rechercher un magasin")}
            placeholder={t("Rechercher un magasin...")}
            value={filtres.recherche}
            onChange={(e) => onFiltresChange({ ...filtres, recherche: e.target.value })}
            className="h-12 rounded-sm border-grid-line pl-10 text-sm md:text-sm"
          />
        </div>
        <SelectAvecIcone
          aria-label={t("Statut des magasins")}
          options={OPTIONS_STATUT}
          valeur={filtres.statut ?? TOUS}
          onChange={(v) => onFiltresChange({ ...filtres, statut: v === TOUS ? null : v })}
          className="w-[180px] [&_[data-slot=select-trigger]]:h-12"
        />
      </div>

      <TableauDeDonnees
        titre={t("Liste des magasins")}
        colonnes={colonnes}
        lignes={magasins}
        cleDeLigne={(m) => m.id}
        total={magasins.length}
        page={1}
        pageSize={Math.max(magasins.length, 1)}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        libelleElements="magasins"
        cleLargeurs="parametres.magasins"
        enChargement={enChargement}
        erreur={erreur}
        vide={{ titre: "Aucun magasin", description: "Modifiez la recherche ou ajoutez un magasin.", icone: Store }}
        avecEnTete={false}
        avecPagination={false}
        className="min-h-0 border border-grid-line shadow-none"
      />

      {/* details_du_magasin : fenêtre ouverte par « Nouveau magasin » ou le crayon d'une ligne */}
      <Dialog open={selection !== null} onOpenChange={(ouvert) => !ouvert && setSelection(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto p-0 sm:max-w-[760px]">
          {selection && (
            <DetailsDuMagasin
              key={selection.id ?? "nouveau"}
              magasin={selection}
              draft={draftFor?.(selection.id)}
              onAnnuler={() => setSelection(null)}
              onSupprimer={
                selection.id
                  ? () => {
                      onSupprimer(selection as MagasinDetaille)
                      setSelection(null)
                    }
                  : undefined
              }
              onEnregistrer={async (m) => {
                if (await onEnregistrer(m)) setSelection(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PanneauDeParametres>
  )
}

type ChampTexte = "nom" | "responsable" | "code" | "email" | "telephone" | "adresse"

/** Figma : calque `details_du_magasin`. */
function DetailsDuMagasin({
  draft,
  magasin,
  onAnnuler,
  onSupprimer,
  onEnregistrer,
}: {
  magasin: MagasinSaisi
  draft?: LocalDraft
  onAnnuler: () => void
  onSupprimer?: () => void
  onEnregistrer: (magasin: MagasinSaisi) => void
}) {
  const [brouillon, setBrouillon] = useDraftState(draft, "brouillon", magasin)
  const [tentative, setTentative] = useState(false)
  const modifier = (modif: Partial<MagasinSaisi>) => setBrouillon((b) => ({ ...b, ...modif }))

  const erreurs: Partial<Record<ChampTexte, string>> = {}
  for (const cle of ["nom", "responsable", "code", "telephone", "adresse"] as const) if (!brouillon[cle].trim()) erreurs[cle] = "Champ obligatoire."
  if (brouillon.email.trim() && !/^\S+@\S+\.\S+$/.test(brouillon.email.trim())) erreurs.email = "Adresse e-mail invalide."
  const erreur = (cle: ChampTexte) => (tentative ? erreurs[cle] : undefined)

  const champ = (cle: ChampTexte, libelle: string, props: { obligatoire?: boolean; type?: string; className?: string } = {}) => (
    <ChampDeFormulaire id={`magasin-${cle}`} libelle={tr(libelle)} obligatoire={props.obligatoire} erreur={erreur(cle)} className={props.className}>
      <Input
        id={`magasin-${cle}`}
        type={props.type}
        value={brouillon[cle]}
        aria-invalid={!!erreur(cle)}
        onChange={(e) => modifier({ [cle]: cle === "code" ? e.target.value.toUpperCase() : e.target.value })}
        className={cn(CLASSE_DE_CHAMP, "h-12")}
      />
    </ChampDeFormulaire>
  )

  return (
    <form
      aria-label={t("Détails du magasin")}
      className="flex flex-col gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        setTentative(true)
        if (Object.keys(erreurs).length === 0) onEnregistrer({ ...brouillon, email: brouillon.email.trim() })
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[30px] items-center justify-center rounded-sm bg-accent text-primary">
            <Store className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-base font-bold">{magasin.id ? t("Détails du magasin") : t("Nouveau magasin")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {magasin.id ? t("Modifiez les informations du magasin sélectionné.") : t("Renseignez les informations du nouveau magasin.")}
            </DialogDescription>
          </div>
        </div>
        {onSupprimer && (
          <Button type="button" variant="outline" onClick={onSupprimer} className="h-10 gap-2 rounded-sm border-destructive bg-danger-muted px-3.5 text-[13px] font-semibold text-destructive hover:bg-destructive hover:text-white">
            <Trash2 className="size-3.5" />
            {t("Supprimer ce magasin")}
          </Button>
        )}
      </div>

      <div className="grid gap-x-2.5 gap-y-2.5 md:grid-cols-2">
        {champ("nom", "Nom du magasin", { obligatoire: true })}
        {champ("responsable", "Responsable du magasin", { obligatoire: true })}
        {champ("code", "Code magasin", { obligatoire: true, className: "md:col-span-2" })}
        {champ("email", "Email (optionnel)", { type: "email" })}
        {champ("telephone", "Téléphone", { obligatoire: true, type: "tel" })}
        {champ("adresse", "Adresse", { obligatoire: true })}
        <div className="grid grid-cols-2 gap-x-2.5 self-end">
          <OptionAInterrupteur id="magasin-principal" libelle={t("Point de vente principal")} valeur={brouillon.principal} onChange={(principal) => modifier({ principal })} />
          <OptionAInterrupteur id="magasin-actif" libelle={t("Magasin actif")} valeur={brouillon.statut === "Actif"} onChange={(actif) => modifier({ statut: actif ? "Actif" : "Inactif" })} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onAnnuler} className="h-10 w-[140px] rounded-sm border-grid-line text-[13px] font-semibold">
          {t("Annuler")}
        </Button>
        <Button type="submit" className="h-10 gap-2 rounded-sm px-3.5 text-[13px]">
          <Save className="size-3.5" />
          {magasin.id ? t("Enregistrer les modifications") : t("Créer le magasin")}
        </Button>
      </div>
    </form>
  )
}
