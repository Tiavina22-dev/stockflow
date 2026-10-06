import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t, tr } from "@/i18n"
import { useState } from "react"
import { Pencil, Plus, Save, Tags, Trash2 } from "lucide-react"

import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { CLASSE_DE_CHAMP, PanneauDeParametres } from "@/components/parametres/elements-de-parametres"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { CatalogueDeReference as Catalogue, ElementDeCatalogue, TypeDElementDeCatalogue } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

export const LIBELLES_DE_CATALOGUE: Record<TypeDElementDeCatalogue, { titre: string; singulier: string; /** Avec l’article défini : « la catégorie », « l’unité » */ defini: string; vide: string; colonne: string; description: string }> = {
  categorie: { titre: "Catégories", singulier: "catégorie", defini: "la catégorie", vide: "Aucune catégorie", colonne: "Catégorie", description: "Description" },
  unite: { titre: "Unités", singulier: "unité", defini: "l’unité", vide: "Aucune unité", colonne: "Unité", description: "Usage" },
  marque: { titre: "Marques", singulier: "marque", defini: "la marque", vide: "Aucune marque", colonne: "Marque", description: "Description" },
}

export type ElementSaisi = { type: TypeDElementDeCatalogue; id?: string; nom: string; description: string }

/** Figma : `parametres_catalogue` (node 90:745) — tableaux Catégories, Unités et Marques. */
export function CatalogueDeReference({
  catalogue,
  draftFor,
  uiDraft,
  enChargement = false,
  erreur = null,
  onEnregistrer,
  onSupprimer,
}: {
  catalogue: Catalogue | undefined
  draftFor?: (type: TypeDElementDeCatalogue, id?: string) => LocalDraft | undefined
  uiDraft?: LocalDraft
  enChargement?: boolean
  erreur?: string | null
  onEnregistrer: (element: ElementSaisi) => Promise<boolean>
  onSupprimer: (type: TypeDElementDeCatalogue, element: ElementDeCatalogue) => void
}) {
  const [enCours, setEnCours] = useDraftState<ElementSaisi | null>(uiDraft, "enCours", null)

  const tableau = (type: TypeDElementDeCatalogue, elements: ElementDeCatalogue[]) => {
    const l = LIBELLES_DE_CATALOGUE[type]
    const colonnes: ColonneDeTableau<ElementDeCatalogue>[] = [
      { id: "nom", libelle: l.colonne, largeur: null, min: 160, cellule: (e) => <span className="text-[13px] font-semibold">{e.nom}</span> },
      ...(type === "unite"
        ? []
        : [{ id: "produits", libelle: "Produits", largeur: 96, min: 72, cellule: (e: ElementDeCatalogue) => <span className="text-xs tabular-nums">{nombre.format(e.nombreDeProduits ?? 0)}</span> }]),
      { id: "description", libelle: l.description, largeur: 260, min: 140, cellule: (e) => <span className="block truncate text-xs text-muted-foreground">{e.description || "—"}</span> },
      {
        id: "actions",
        libelle: "Actions",
        largeur: 96,
        min: 84,
        alignement: "droite",
        cellule: (e) => (
          <div className="flex justify-end gap-1.5">
            <Button variant="secondary" aria-label={t("Modifier {{v0}}", { v0: e.nom })} onClick={() => setEnCours({ type, id: e.id, nom: e.nom, description: e.description })} className="size-7 rounded-[4px] p-0 hover:bg-primary hover:text-primary-foreground [&_svg]:size-3.5">
              <Pencil />
            </Button>
            <Button variant="ghost" aria-label={t("Supprimer {{v0}}", { v0: e.nom })} onClick={() => onSupprimer(type, e)} className="size-7 rounded-[4px] bg-background p-0 text-muted-foreground hover:bg-destructive hover:text-white [&_svg]:size-3.5">
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ]
    return (
      <TableauDeDonnees
        key={type}
        titre={tr(l.titre)}
        iconeTitre={Tags}
        colonnes={colonnes}
        lignes={elements}
        cleDeLigne={(e) => e.id}
        total={elements.length}
        page={1}
        pageSize={Math.max(elements.length, 1)}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        libelleElements={l.titre.toLowerCase()}
        cleLargeurs={`parametres.${type}`}
        enChargement={enChargement}
        erreur={erreur}
        vide={{ titre: l.vide, description: "Ajoutez un élément pour l’utiliser dans vos produits." }}
        avecPagination={false}
        actionEnTete={
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {nombre.format(elements.length)} {t("entrée")}{elements.length > 1 ? "s" : ""}
            </span>
            {type !== "categorie" && (
              <Button variant="outline" onClick={() => setEnCours({ type, nom: "", description: "" })} className="h-8 gap-1.5 rounded-sm border-grid-line px-2.5 text-xs">
                <Plus className="size-3.5" />
                {t("Ajouter")}
              </Button>
            )}
          </div>
        }
        className="min-h-0 border border-grid-line shadow-none"
      />
    )
  }

  return (
    <PanneauDeParametres
      titre={t("Catalogue")}
      description={t("Gérez les catégories, unités et marques utilisées dans votre catalogue produit.")}
      action={
        <Button onClick={() => setEnCours({ type: "categorie", nom: "", description: "" })} className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal">
          <Plus className="size-3.5" />
          {t("Ajouter une catégorie")}
        </Button>
      }
    >
      {tableau("categorie", catalogue?.categories ?? [])}
      {tableau("unite", catalogue?.unites ?? [])}
      {tableau("marque", catalogue?.marques ?? [])}

      <ElementFenetre
        element={enCours}
        draft={enCours ? draftFor?.(enCours.type, enCours.id) : undefined}
        onFermer={() => setEnCours(null)}
        onEnregistrer={async (e) => {
          if (await onEnregistrer(e)) setEnCours(null)
        }}
      />
    </PanneauDeParametres>
  )
}

/** Petite fenêtre d'ajout / modification d'une catégorie, unité ou marque. */
function ElementFenetre({
  draft,
  element,
  onFermer,
  onEnregistrer,
}: {
  element: ElementSaisi | null
  draft?: LocalDraft
  onFermer: () => void
  onEnregistrer: (element: ElementSaisi) => void
}) {
  return (
    <Dialog open={element !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent className="sm:max-w-[440px]">
        {/* `key` : le formulaire repart des valeurs de l'élément ouvert */}
        {element && <FormulaireDElement key={`${element.type}-${element.id ?? "nouveau"}`} draft={draft} element={element} onFermer={onFermer} onEnregistrer={onEnregistrer} />}
      </DialogContent>
    </Dialog>
  )
}

function FormulaireDElement({ draft, element, onFermer, onEnregistrer }: { draft?: LocalDraft; element: ElementSaisi; onFermer: () => void; onEnregistrer: (element: ElementSaisi) => void }) {
  const [nom, setNom] = useDraftState(draft, "nom", element.nom)
  const [description, setDescription] = useDraftState(draft, "description", element.description)
  const [tentative, setTentative] = useState(false)
  const l = LIBELLES_DE_CATALOGUE[element.type]
  const erreurNom = tentative && !nom.trim() ? "Le nom est obligatoire." : undefined

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        setTentative(true)
        if (nom.trim()) onEnregistrer({ ...element, nom: nom.trim(), description: description.trim() })
      }}
    >
      <DialogHeader>
        <DialogTitle>{element.id ? t("Modifier {{v0}}", { v0: l.defini }) : t("Nouvelle {{v0}}", { v0: l.singulier })}</DialogTitle>
        <DialogDescription>{t("Elle sera proposée dans la fiche produit.")}</DialogDescription>
      </DialogHeader>
      <ChampDeFormulaire id="element-nom" libelle={t("Nom")} obligatoire erreur={erreurNom}>
        <Input id="element-nom" autoFocus value={nom} aria-invalid={!!erreurNom} onChange={(e) => setNom(e.target.value)} className={CLASSE_DE_CHAMP} />
      </ChampDeFormulaire>
      <ChampDeFormulaire id="element-description" libelle={tr(l.description)}>
        <Input id="element-description" value={description} onChange={(e) => setDescription(e.target.value)} className={CLASSE_DE_CHAMP} />
      </ChampDeFormulaire>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFermer} className="h-10 rounded-sm">
          {t("Annuler")}
        </Button>
        <Button type="submit" className="h-10 gap-2 rounded-sm">
          <Save className="size-3.5" />
          {t("Enregistrer")}
        </Button>
      </DialogFooter>
    </form>
  )
}
