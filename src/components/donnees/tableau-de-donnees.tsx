import { t, tr } from "@/i18n"
import { Fragment, useEffect, useLayoutEffect, useState, type PointerEvent, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, List, PackageSearch, Table2, type LucideIcon } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type ColonneDeTableau<T> = {
  id: string
  /** Texte de l'en-tête (affiché en majuscules) */
  libelle: string
  /** Largeur initiale en px ; `null` = prend l'espace restant (non redimensionnable) */
  largeur: number | null
  /** Largeur minimale en px */
  min: number
  alignement?: "gauche" | "droite"
  /** En-tête cliquable pour trier (voir `tri` / `onTriChange`) */
  triable?: boolean
  /** Jamais plus étroite que son contenu (mesuré). Par défaut : vrai pour la colonne `actions`. */
  jamaisReduite?: boolean
  cellule: (ligne: T) => ReactNode
}

const jamaisReduite = <T,>(c: ColonneDeTableau<T>) => c.jamaisReduite ?? c.id === "actions"

export const TAILLES_DE_PAGE = [8, 16, 32]

type TableauDeDonneesProps<T> = {
  /** Titre de l'en-tête de liste, ex. « Liste des produits » */
  titre: string
  colonnes: ColonneDeTableau<T>[]
  lignes: T[]
  cleDeLigne: (ligne: T) => string
  /** Nombre total d'éléments (toutes pages) */
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** Nom des éléments au pluriel pour la pagination, ex. « produits », « ventes » */
  libelleElements: string
  /** Clé de mémorisation des largeurs de colonnes dans le navigateur */
  cleLargeurs: string
  enChargement?: boolean
  erreur?: string | null
  vide?: { titre: string; description: string; icone?: LucideIcon }
  /** Affiche l'en-tête (titre + taille de page). Désactivé pour les vues compactes. */
  avecEnTete?: boolean
  /** Icône du titre (liste par défaut) */
  iconeTitre?: LucideIcon
  /** Remplace le choix de taille de page à droite du titre (ex. lien « Voir tout ») */
  actionEnTete?: ReactNode
  /** Affiche la pagination en bas (désactivée pour un aperçu) */
  avecPagination?: boolean
  /** Contenu déplié sous une ligne ; `null` = ligne repliée */
  detailDeLigne?: (ligne: T) => ReactNode | null
  /** Tri courant (colonne = `id` d'une colonne `triable`) */
  tri?: { colonne: string; sens: "asc" | "desc" }
  /** Clic sur un en-tête triable : même colonne = inverse le sens */
  onTriChange?: (tri: { colonne: string; sens: "asc" | "desc" }) => void
  /** Clic sur une ligne (ex. afficher son détail) */
  onLigneClic?: (ligne: T) => void
  /** Ligne mise en évidence (sélectionnée) */
  estSelectionnee?: (ligne: T) => boolean
  className?: string
}

const nombre = new Intl.NumberFormat("fr-FR")
const PAS_CLAVIER = 16

/**
 * Tableau commun à toutes les listes (Figma : `liste_du_stock`, `liste_des_ventes`…) :
 * en-tête avec taille de page, colonnes redimensionnables, états chargement / erreur / vide, pagination.
 */
export function TableauDeDonnees<T>({
  titre,
  colonnes,
  lignes,
  cleDeLigne,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  libelleElements,
  cleLargeurs,
  enChargement = false,
  erreur = null,
  vide = { titre: "Aucun résultat", description: "Modifiez la recherche ou les filtres." },
  avecEnTete = true,
  iconeTitre: IconeTitre = List,
  actionEnTete,
  avecPagination = true,
  detailDeLigne,
  tri,
  onTriChange,
  onLigneClic,
  estSelectionnee,
  className,
}: TableauDeDonneesProps<T>) {
  const [zoneDefilante, setZoneDefilante] = useState<HTMLDivElement | null>(null)
  const contenus = useLargeursDeContenu(zoneDefilante, colonnes.length)
  const { largeurs, redimensionner, reinitialiser } = useLargeursColonnes(colonnes, cleLargeurs, useLargeurDe(zoneDefilante), contenus)
  const nombreDePages = Math.max(1, Math.ceil(total / pageSize))
  const premier = total === 0 ? 0 : (page - 1) * pageSize + 1
  const dernier = Math.min(page * pageSize, total)

  return (
    <section className={cn("flex min-h-[560px] flex-col overflow-hidden rounded-lg bg-card shadow-card", className)}>
      {/* en_tete_de_liste */}
      <div className={cn("flex h-14 shrink-0 items-center justify-between px-4", !avecEnTete && "hidden")}>
        <h2 className="flex items-center gap-2.5 text-base font-bold">
          <IconeTitre className="size-[22px] text-primary" />
          {tr(titre)}
        </h2>
        {actionEnTete ?? (<Select value={String(pageSize)} onValueChange={(v) => v && onPageSizeChange(Number(v))}>
          <SelectTrigger
            aria-label={t("{{v0}} par page", { v0: libelleElements })}
            className="h-12 w-[140px] gap-2.5 rounded-sm border-grid-line bg-card px-3 text-xs data-[size=default]:h-12 [&>svg:last-child]:size-3.5"
          >
            <Table2 className="size-[18px] text-foreground" />
            <span className="flex-1 text-left">{pageSize} {t("par page")}</span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="end" sideOffset={6} className="p-1 shadow-card">
            {TAILLES_DE_PAGE.map((taille) => (
              <SelectItem key={taille} value={String(taille)} className="h-9 px-3 text-xs">
                {taille} {t("par page")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>)}
      </div>

      <div ref={setZoneDefilante} className="flex-1 overflow-x-auto">
        <table
          className="min-w-full table-fixed border-collapse text-left [&_td]:overflow-hidden [&_td,&_th]:border [&_td,&_th]:border-muted-foreground/25 [&_th]:border-t-0 [&_tr>*:first-child]:border-l-0 [&_tr>*:last-child]:border-r-0 [&_tr>*:last-child]:sticky [&_tr>*:last-child]:right-0 [&_td:last-child]:bg-card [&_th:last-child]:bg-background"
          style={{ width: largeurs.reduce((somme, l) => somme + l, 0) }}
        >
          <colgroup>
            {colonnes.map((colonne, index) => (
              <col key={colonne.id} style={{ width: colonne.largeur === null ? undefined : largeurs[index] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="h-10 bg-background">
              {colonnes.map((colonne, index) => (
                <th
                  key={colonne.id}
                  scope="col"
                  className={cn(
                    "relative px-3 text-center text-[10px] font-bold text-muted-foreground uppercase select-none",
                    index === 0 && "pl-4",
                    index === colonnes.length - 1 && "pr-4"
                  )}
                >
                  {colonne.triable && onTriChange ? (
                    <button
                      type="button"
                      onClick={() => onTriChange({ colonne: colonne.id, sens: tri?.colonne === colonne.id && tri.sens === "asc" ? "desc" : "asc" })}
                      aria-label={t("Trier par {{v0}}", { v0: tr(colonne.libelle) })}
                      className="mx-auto flex max-w-full items-center justify-center gap-1 uppercase hover:text-foreground"
                    >
                      <span className="truncate">{tr(colonne.libelle)}</span>
                      {tri?.colonne === colonne.id ? (tri.sens === "asc" ? <ArrowUp className="size-3 shrink-0 text-primary" /> : <ArrowDown className="size-3 shrink-0 text-primary" />) : <ArrowUpDown className="size-3 shrink-0" />}
                    </button>
                  ) : (
                    <span className="block truncate">{tr(colonne.libelle)}</span>
                  )}
                  {colonne.largeur !== null && index < colonnes.length - 1 && (
                    <PoigneeDeColonne
                      libelle={tr(colonne.libelle)}
                      largeur={largeurs[index]}
                      min={colonne.min}
                      onRedimensionner={(l) => redimensionner(index, l)}
                      onReinitialiser={() => reinitialiser(index)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enChargement &&
              Array.from({ length: pageSize }, (_, i) => (
                <tr key={i} className="h-12">
                  <td colSpan={colonnes.length} className="px-4">
                    <span className="block h-3.5 w-full animate-pulse rounded-sm bg-muted" />
                  </td>
                </tr>
              ))}

            {!enChargement &&
              lignes.map((ligne) => {
                const detail = detailDeLigne?.(ligne) ?? null
                return (
                  <Fragment key={cleDeLigne(ligne)}>
                    <tr
                      aria-expanded={detailDeLigne ? detail !== null : undefined}
                      aria-selected={estSelectionnee ? estSelectionnee(ligne) : undefined}
                      onClick={onLigneClic ? (e) => !(e.target as HTMLElement).closest("button, a, input") && onLigneClic(ligne) : undefined}
                      className={cn(
                        "h-12 transition-colors hover:bg-background/60",
                        onLigneClic && "cursor-pointer",
                        estSelectionnee?.(ligne) && "bg-accent hover:bg-accent",
                        detail !== null && "bg-accent/40 shadow-[inset_3px_0_0_var(--primary)]"
                      )}
                    >
                      {colonnes.map((colonne, index) => (
                        <td
                          key={colonne.id}
                          className={cn(
                            "px-3",
                            index === 0 && "pl-4",
                            index === colonnes.length - 1 && "pr-4",
                            colonne.alignement === "droite" && "text-right"
                          )}
                        >
                          {jamaisReduite(colonne) ? (
                            <div data-contenu-colonne={index} className={cn("w-max", colonne.alignement === "droite" && "ml-auto")}>
                              {colonne.cellule(ligne)}
                            </div>
                          ) : (
                            colonne.cellule(ligne)
                          )}
                        </td>
                      ))}
                    </tr>
                    {detail !== null && (
                      <tr className="bg-background">
                        <td colSpan={colonnes.length} className="px-4 py-2">
                          {detail}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
          </tbody>
        </table>

        {!enChargement && erreur && (
          <p role="alert" className="border-t border-border px-4 py-6 text-center text-[13px] text-destructive">
            {tr(erreur)}
          </p>
        )}
        {!enChargement && !erreur && lignes.length === 0 && (
          <EmptyState
            icon={vide.icone ?? PackageSearch}
            title={tr(vide.titre)}
            description={tr(vide.description)}
            className="m-4 min-h-[300px]"
          />
        )}
      </div>

      {/* pagination */}
      <div className={cn("flex h-14 shrink-0 items-center justify-between border-t border-border px-4", !avecPagination && "hidden")}>
        <p className="text-xs text-muted-foreground">
          {t("Affichage de")} {nombre.format(premier)} à {nombre.format(dernier)} sur {nombre.format(total)} {tr(libelleElements)}
        </p>
        <nav aria-label={t("Pagination")} className="flex items-center gap-[7px]">
          <Button
            variant="outline"
            aria-label={t("Page précédente")}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="size-[34px] rounded-sm border-grid-line p-0 disabled:border-grid-line disabled:bg-card disabled:text-muted-foreground/50"
          >
            <ChevronLeft className="size-[15px]" />
          </Button>
          {pagesVisibles(page, nombreDePages).map((numero) => (
            <Button
              key={numero}
              variant={numero === page ? "default" : "ghost"}
              aria-current={numero === page ? "page" : undefined}
              onClick={() => onPageChange(numero)}
              className={cn("size-[34px] rounded-sm p-0 text-xs font-normal tabular-nums", numero !== page && "text-muted-foreground")}
            >
              {numero}
            </Button>
          ))}
          <Button
            variant="outline"
            aria-label={t("Page suivante")}
            disabled={page >= nombreDePages}
            onClick={() => onPageChange(page + 1)}
            className="size-[34px] rounded-sm border-grid-line p-0 disabled:border-grid-line disabled:bg-card disabled:text-muted-foreground/50"
          >
            <ChevronRight className="size-[15px]" />
          </Button>
        </nav>
      </div>
    </section>
  )
}

/**
 * Largeurs des colonnes. Par défaut, elles sont réduites proportionnellement (sans passer sous `min`)
 * pour tenir dans la place disponible ; dès que l'utilisateur redimensionne, ses largeurs sont
 * mémorisées dans le navigateur (préférence d'affichage) et le tableau peut défiler horizontalement.
 */
function useLargeursColonnes<T>(colonnes: ColonneDeTableau<T>[], cle: string, largeurDisponible: number, contenus: number[]) {
  // Colonnes « jamais réduites » : au moins la largeur de leur contenu
  const plancher = (i: number) => (jamaisReduite(colonnes[i]) ? Math.max(colonnes[i].min, contenus[i] ?? 0) : colonnes[i].min)
  const initiales = colonnes.map((c, i) => Math.max(c.largeur ?? c.min, plancher(i)))
  const cleStockage = `stockflow.${cle}.largeurs.v2`
  const [personnalisees, setPersonnalisees] = useState<number[] | null>(() => {
    try {
      const sauvegarde = JSON.parse(localStorage.getItem(cleStockage) ?? "null")
      if (Array.isArray(sauvegarde) && sauvegarde.length === colonnes.length) return sauvegarde
    } catch {
      /* stockage indisponible : largeurs par défaut */
    }
    return null
  })

  const largeurs = (personnalisees ?? ajusterALaPlace(initiales, colonnes, largeurDisponible)).map((l, i) => Math.max(l, plancher(i)))

  const redimensionner = (index: number, largeur: number) => {
    const suivantes = largeurs.map((l, i) => (i === index ? Math.max(plancher(i), Math.round(largeur)) : l))
    setPersonnalisees(suivantes)
    try {
      localStorage.setItem(cleStockage, JSON.stringify(suivantes))
    } catch {
      /* ignoré */
    }
  }
  const reinitialiser = (index: number) => redimensionner(index, initiales[index])

  return { largeurs, redimensionner, reinitialiser }
}

/** Réduit les colonnes à largeur fixe, au prorata de leur marge au-dessus de `min`, pour tenir dans `disponible`. */
function ajusterALaPlace<T>(initiales: number[], colonnes: ColonneDeTableau<T>[], disponible: number) {
  const total = initiales.reduce((s, l) => s + l, 0)
  if (!disponible || total <= disponible) return initiales
  const marges = initiales.map((l, i) => (colonnes[i].largeur === null || jamaisReduite(colonnes[i]) ? 0 : Math.max(0, l - colonnes[i].min)))
  const totalDesMarges = marges.reduce((s, m) => s + m, 0)
  if (totalDesMarges === 0) return initiales
  const part = Math.min(1, (total - disponible) / totalDesMarges)
  return initiales.map((l, i) => Math.floor(l - marges[i] * part))
}

/**
 * Largeur du contenu des colonnes « jamais réduites » (marges de la cellule comprises), mesurée
 * après chaque rendu. On garde la dernière mesure pendant le chargement (aucune ligne affichée).
 */
function useLargeursDeContenu(zone: HTMLElement | null, nombreDeColonnes: number) {
  const [mesures, setMesures] = useState<number[]>([])
  useLayoutEffect(() => {
    if (!zone) return
    const contenus = zone.querySelectorAll<HTMLElement>("[data-contenu-colonne]")
    if (contenus.length === 0) return
    const suivantes = Array.from({ length: nombreDeColonnes }, () => 0)
    contenus.forEach((contenu) => {
      const cellule = contenu.parentElement as HTMLElement
      const style = getComputedStyle(cellule)
      const largeur = Math.ceil(contenu.offsetWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2)
      const index = Number(contenu.dataset.contenuColonne)
      suivantes[index] = Math.max(suivantes[index], largeur)
    })
    if (suivantes.some((l, i) => l !== (mesures[i] ?? 0))) setMesures(suivantes)
  })
  return mesures
}

/** Largeur intérieure d'un élément, suivie au redimensionnement de la fenêtre. */
function useLargeurDe(element: HTMLElement | null) {
  const [largeur, setLargeur] = useState(0)
  useEffect(() => {
    if (!element) return
    const observateur = new ResizeObserver(([entree]) => setLargeur(Math.floor(entree.contentRect.width)))
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [element])
  return largeur
}

/**
 * Poignée sur le bord droit d'un en-tête : glisser pour redimensionner,
 * double-clic pour revenir à la largeur initiale, ← → au clavier.
 */
function PoigneeDeColonne({
  libelle,
  largeur,
  min,
  onRedimensionner,
  onReinitialiser,
}: {
  libelle: string
  largeur: number
  min: number
  onRedimensionner: (largeur: number) => void
  onReinitialiser: () => void
}) {
  const commencer = (evenement: PointerEvent<HTMLDivElement>) => {
    evenement.preventDefault()
    const poignee = evenement.currentTarget
    poignee.setPointerCapture(evenement.pointerId)
    const departX = evenement.clientX
    const departLargeur = largeur

    const deplacer = (e: globalThis.PointerEvent) => onRedimensionner(departLargeur + e.clientX - departX)
    const terminer = () => {
      poignee.removeEventListener("pointermove", deplacer)
      poignee.removeEventListener("pointerup", terminer)
      poignee.removeEventListener("pointercancel", terminer)
      document.body.style.cursor = ""
    }
    poignee.addEventListener("pointermove", deplacer)
    poignee.addEventListener("pointerup", terminer)
    poignee.addEventListener("pointercancel", terminer)
    document.body.style.cursor = "col-resize"
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("Largeur de la colonne {{v0}}", { v0: libelle })}
      aria-valuenow={largeur}
      aria-valuemin={min}
      tabIndex={0}
      title={t("Glisser pour redimensionner · double-clic pour réinitialiser")}
      onPointerDown={commencer}
      onDoubleClick={onReinitialiser}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onRedimensionner(largeur - PAS_CLAVIER)
        else if (e.key === "ArrowRight") onRedimensionner(largeur + PAS_CLAVIER)
        else return
        e.preventDefault()
      }}
      className="group/poignee absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center outline-none"
    >
      <span className="h-full w-px bg-grid-line transition-colors group-hover/poignee:w-0.5 group-hover/poignee:bg-primary group-focus-visible/poignee:w-0.5 group-focus-visible/poignee:bg-primary" />
    </div>
  )
}

/** 3 numéros de page centrés sur la page active. */
function pagesVisibles(page: number, nombreDePages: number) {
  const debut = Math.max(1, Math.min(page - 1, nombreDePages - 2))
  return Array.from({ length: Math.min(3, nombreDePages) }, (_, i) => debut + i)
}
