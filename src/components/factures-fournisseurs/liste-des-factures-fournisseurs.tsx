import { FileText } from "lucide-react"

import { PastilleEtat, type TonPastille } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { formatDate, tr } from "@/i18n"
import type { FactureFournisseur, StatutDeFactureFournisseur } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const jour = formatDate({ day: "2-digit", month: "2-digit", year: "numeric" })

export const TON_PAR_STATUT_DE_FACTURE: Record<StatutDeFactureFournisseur, TonPastille> = { Validé: "succes", Brouillon: "alerte", Annulé: "danger" }
export const dateDeFacture = (iso: string) => jour.format(new Date(`${iso}T12:00:00`))

/** Figma : panneau « Liste des factures fournisseurs » de `factures_fournisseurs` (node 238:25161). */
export function ListeDesFacturesFournisseurs({
  factures,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectionId,
  onSelection,
  enChargement,
  erreur,
}: {
  factures: FactureFournisseur[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  selectionId: string | null
  onSelection: (facture: FactureFournisseur) => void
  enChargement?: boolean
  erreur?: string | null
}) {
  const premier = (page - 1) * pageSize
  const colonnes: ColonneDeTableau<FactureFournisseur>[] = [
    { id: "rang", libelle: "#", largeur: 70, min: 50, cellule: (f) => <span className="block text-[13px] tabular-nums">{premier + factures.indexOf(f) + 1}</span> },
    { id: "numero", libelle: "N° facture", largeur: 200, min: 120, cellule: (f) => <span className="block text-[13px] font-bold">{f.numero}</span> },
    { id: "fournisseur", libelle: "Fournisseur", largeur: null, min: 180, cellule: (f) => <span className="block truncate text-[13px]">{f.fournisseurNom}</span> },
    { id: "date", libelle: "Date", largeur: 180, min: 110, cellule: (f) => <span className="block text-[13px] tabular-nums">{dateDeFacture(f.date)}</span> },
    { id: "total", libelle: "Total (Ar)", largeur: 160, min: 110, alignement: "droite", cellule: (f) => <span className="block text-[13px] tabular-nums">{nombre.format(f.total)}</span> },
    { id: "statut", libelle: "Statut", largeur: 160, min: 120, cellule: (f) => <PastilleEtat ton={TON_PAR_STATUT_DE_FACTURE[f.statut]} libelle={tr(f.statut)} className="h-[26px] text-xs font-bold" /> },
  ]

  return (
    <TableauDeDonnees
      titre="Liste des factures fournisseurs"
      iconeTitre={FileText}
      actionEnTete={<span />}
      colonnes={colonnes}
      lignes={factures}
      cleDeLigne={(f) => f.id}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      libelleElements="factures"
      cleLargeurs="factures-fournisseurs"
      onLigneClic={onSelection}
      estSelectionnee={(f) => f.id === selectionId}
      enChargement={enChargement}
      erreur={erreur}
      vide={{ titre: "Aucune facture fournisseur", description: "Modifiez le fournisseur, les dates ou la recherche." }}
      className="min-h-0"
    />
  )
}
