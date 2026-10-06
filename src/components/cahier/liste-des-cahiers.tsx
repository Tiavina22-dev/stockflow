import { ShoppingCart } from "lucide-react"

import { ariary } from "@/components/donnees/montants"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { formatDate, t } from "@/i18n"
import { cn } from "@/lib/utils"
import type { CahierConsultable, TriDesCahiers } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const jour = formatDate({ day: "2-digit", month: "2-digit", year: "numeric" })

/** Pastille d'écart : 0 / +x en vert, −x en rouge (Figma : calque `statut` de la colonne Écart). */
export function PastilleDEcart({ ecart, className }: { ecart: number | null; className?: string }) {
  if (ecart === null) return <span className="text-xs text-muted-foreground">—</span>
  const negatif = ecart < 0
  return (
    <span className={cn("inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-bold tabular-nums", negatif ? "bg-danger-muted text-destructive" : "bg-success-muted text-success", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", negatif ? "bg-destructive" : "bg-success")} />
      {ecart > 0 ? "+ " : negatif ? "− " : ""}
      {nombre.format(Math.abs(ecart))}
    </span>
  )
}

/** Figma : panneau « Liste des cahiers » de `depenses_et_versements_consultables` (node 238:26030). */
export function ListeDesCahiers({
  cahiers,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  tri,
  onTriChange,
  selectionId,
  onSelection,
  enChargement,
  erreur,
}: {
  cahiers: CahierConsultable[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  tri: TriDesCahiers
  onTriChange: (tri: TriDesCahiers) => void
  selectionId: string | null
  onSelection: (cahier: CahierConsultable) => void
  enChargement?: boolean
  erreur?: string | null
}) {
  const colonnes: ColonneDeTableau<CahierConsultable>[] = [
    { id: "date", libelle: "Date", largeur: 140, min: 100, triable: true, cellule: (c) => <span className="text-[13px] tabular-nums">{jour.format(new Date(`${c.date}T12:00:00`))}</span> },
    { id: "numero", libelle: "Cahier", largeur: 110, min: 80, triable: true, cellule: (c) => <span className="text-[13px] font-bold text-primary">{c.numero}</span> },
    { id: "magasin", libelle: "Magasin", largeur: null, min: 150, triable: true, cellule: (c) => <span className="block truncate text-[13px]">{c.magasinNom}</span> },
    { id: "totalVentes", libelle: "Total ventes (Ar)", largeur: 160, min: 120, triable: true, alignement: "droite", cellule: (c) => <span className="text-[13px] tabular-nums">{nombre.format(c.totalVentes)}</span> },
    { id: "depenses", libelle: "Dépenses (Ar)", largeur: 140, min: 110, triable: true, alignement: "droite", cellule: (c) => <span className="text-[13px] tabular-nums">{nombre.format(c.depenses)}</span> },
    { id: "versement", libelle: "Versement (Ar)", largeur: 150, min: 110, triable: true, alignement: "droite", cellule: (c) => <span className="text-[13px] tabular-nums">{c.versement === null ? "—" : nombre.format(c.versement)}</span> },
    { id: "ecart", libelle: "Écart (Ar)", largeur: 140, min: 110, triable: true, cellule: (c) => <PastilleDEcart ecart={c.ecart} /> },
  ]

  return (
    <TableauDeDonnees
      titre="Liste des cahiers"
      iconeTitre={ShoppingCart}
      actionEnTete={<span className="text-[13px] text-muted-foreground">{t("{{v0}} résultat(s)", { v0: nombre.format(total) })}</span>}
      colonnes={colonnes}
      lignes={cahiers}
      cleDeLigne={(c) => c.id}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      libelleElements="résultats"
      cleLargeurs="cahiers-consultables"
      tri={tri}
      onTriChange={(nouveau) => onTriChange(nouveau as TriDesCahiers)}
      onLigneClic={onSelection}
      estSelectionnee={(c) => c.id === selectionId}
      enChargement={enChargement}
      erreur={erreur}
      vide={{ titre: "Aucun cahier", description: "Modifiez la période, le magasin ou la recherche." }}
      className="min-h-0"
    />
  )
}

/** Montant formaté pour la synthèse. */
export const montantDeSynthese = (valeur: number | null) => (valeur === null ? "—" : ariary.format(valeur))
