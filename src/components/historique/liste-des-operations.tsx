import { t, tr, formatDate } from "@/i18n"
import { History, Zap } from "lucide-react"

import { ActionsDeLigne } from "@/components/donnees/actions-de-ligne"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { ECRAN_PAR_CATEGORIE, ICONE_PAR_CATEGORIE, libelleDOperation, TON_PAR_STATUT_D_OPERATION, valeurPrincipale } from "@/components/historique/categories-d-operation"
import { cn } from "@/lib/utils"
import type { OperationDHistorique } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const jour = formatDate({ day: "2-digit", month: "short", year: "numeric" })
const heure = formatDate({ hour: "2-digit", minute: "2-digit" })

/** Quantité signée colorée (Figma : calque `cellule_quantite`). */
export function QuantiteSignee({ quantite, className }: { quantite: number | null; className?: string }) {
  if (quantite === null) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  return (
    <span className={cn("text-xs font-bold tabular-nums", quantite > 0 ? "text-success" : quantite < 0 ? "text-destructive" : "text-foreground", className)}>
      {quantite > 0 ? "+" : ""}
      {nombre.format(quantite)}
    </span>
  )
}


/** Figma : calque `liste_des_operations` de `historique_des_operations` (node 90:4973). */
export function ListeDesOperations({
  operations,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onConsulter,
  enChargement,
  erreur,
}: {
  operations: OperationDHistorique[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onConsulter: (operation: OperationDHistorique) => void
  enChargement?: boolean
  erreur?: string | null
}) {
  const colonnes: ColonneDeTableau<OperationDHistorique>[] = [
    {
      id: "date",
      libelle: "Date",
      largeur: 116,
      min: 110,
      cellule: (o) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">{jour.format(new Date(o.date))}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">{heure.format(new Date(o.date))}</span>
        </span>
      ),
    },
    {
      id: "type",
      libelle: "Type",
      largeur: 64,
      min: 60,
      cellule: (o) => {
        const { icone: Icone, fond, texte } = ICONE_PAR_CATEGORIE[o.categorie]
        return (
          <span title={tr(o.type)} className={cn("flex size-9 items-center justify-center rounded-full", fond, texte)}>
            <Icone className="size-[18px]" />
            <span className="sr-only">{tr(o.type)}</span>
          </span>
        )
      },
    },
    {
      id: "operation",
      libelle: "Opération",
      largeur: 210,
      min: 160,
      cellule: (o) => (
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[13px] font-semibold">{libelleDOperation(o)}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Zap className={cn("size-3 shrink-0", ICONE_PAR_CATEGORIE[o.categorie].texte)} />
            <span className="truncate">{tr(o.source)}</span>
          </span>
        </span>
      ),
    },
    {
      id: "reference",
      libelle: "Référence",
      largeur: null,
      min: 140,
      cellule: (o) => (
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[13px]">{o.reference}</span>
          <span className="truncate text-[11px] text-muted-foreground">{o.referenceDetail}</span>
        </span>
      ),
    },
    { id: "quantite", libelle: "Qté", largeur: 72, min: 60, cellule: (o) => <QuantiteSignee quantite={o.quantite} /> },
    {
      id: "valeurs",
      libelle: "Valeurs",
      largeur: 200,
      min: 140,
      cellule: (o) => (
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[13px] tabular-nums">{valeurPrincipale(o)}</span>
          {o.montant !== null && <span className="truncate text-[11px] text-muted-foreground">{o.detailValeur}</span>}
        </span>
      ),
    },
    {
      id: "statut",
      libelle: "Statut",
      largeur: 124,
      min: 110,
      cellule: (o) => <PastilleEtat ton={TON_PAR_STATUT_D_OPERATION[o.statut]} libelle={tr(o.statut)} className="h-[26px] font-semibold" />,
    },
    {
      id: "actions",
      libelle: "Actions",
      largeur: 100,
      min: 90,
      alignement: "droite",
      cellule: (o) => {
        const ecran = ECRAN_PAR_CATEGORIE[o.categorie]
        return (
          <ActionsDeLigne
            nom={libelleDOperation(o)}
            onConsulter={() => onConsulter(o)}
            actions={[{ libelle: `Ouvrir dans ${ecran.libelle}`, onClick: () => (window.location.assign(ecran.lien)) }]}
          />
        )
      },
    },
  ]

  return (
    <TableauDeDonnees
      titre={t("Liste des opérations")}
      iconeTitre={History}
      actionEnTete={
        <span className="text-[13px] text-muted-foreground">
          {nombre.format(total)} {t("opération")}{total > 1 ? "s" : ""} {t("trouvée")}{total > 1 ? "s" : ""}
        </span>
      }
      colonnes={colonnes}
      lignes={operations}
      cleDeLigne={(o) => o.id}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      libelleElements="opérations"
      cleLargeurs="historique"
      enChargement={enChargement}
      erreur={erreur}
      vide={{ titre: "Aucune opération", description: "Modifiez la recherche, l’onglet ou les filtres.", icone: History }}
    />
  )
}
