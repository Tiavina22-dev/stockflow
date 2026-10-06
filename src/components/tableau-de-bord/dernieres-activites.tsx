import { t, tr, formatDate } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import {
  ArrowLeftRight,
  ArrowRight,
  ClipboardPenLine,
  Clock3,
  PackageMinus,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Undo2,
  type LucideIcon,
} from "lucide-react"

import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { TON_PAR_STATUT_DE_VENTE } from "@/components/ventes/statut-de-vente"
import { Button } from "@/components/ui/button"
import type { ActiviteRecente, TypeDActivite } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const heure = formatDate({ hour: "2-digit", minute: "2-digit" })

const ICONES: Record<TypeDActivite, LucideIcon> = {
  Vente: ShoppingCart,
  "Entrée stock": PackagePlus,
  "Sortie stock": PackageMinus,
  Retour: Undo2,
  Transfert: ArrowLeftRight,
  "Correction stock": ClipboardPenLine,
  Dépense: ReceiptText,
}

/** Figma : calque `dernieres_activites` — aperçu sur le tableau commun, lien « Voir tout ». */
export function DernieresActivites({
  activites,
  lienVoirTout,
  enChargement,
  erreur,
}: {
  activites: ActiviteRecente[]
  lienVoirTout: string
  enChargement?: boolean
  erreur?: string | null
}) {
  const colonnes: ColonneDeTableau<ActiviteRecente>[] = [
    { id: "heure", libelle: "Heure", largeur: 100, min: 70, cellule: (a) => <span className="text-xs font-semibold tabular-nums">{heure.format(new Date(a.date))}</span> },
    {
      id: "type",
      libelle: "Type",
      largeur: 180,
      min: 120,
      cellule: (a) => {
        const Icone = ICONES[a.type]
        return (
          <span className="flex items-center gap-2 text-[13px]">
            <Icone className="size-4 shrink-0 text-primary" />
            {tr(a.type)}
          </span>
        )
      },
    },
    { id: "numero", libelle: "Numéro", largeur: 120, min: 90, cellule: (a) => <span className="text-xs font-semibold text-primary">{a.numero}</span> },
    { id: "description", libelle: "Description", largeur: 220, min: 120, cellule: (a) => <span className="truncate text-[13px]">{tr(a.description)}</span> },
    { id: "utilisateur", libelle: "Utilisateur", largeur: 180, min: 110, cellule: (a) => <span className="truncate text-[13px]">{a.utilisateurNom}</span> },
    {
      id: "montant",
      libelle: "Montant",
      largeur: 140,
      min: 90,
      alignement: "droite",
      cellule: (a) => (
        <span className="text-xs font-semibold tabular-nums">
          {a.montant !== null ? ariary.format(a.montant) : a.quantite !== undefined ? `${nombre.format(a.quantite)} u.` : "—"}
        </span>
      ),
    },
    { id: "statut", libelle: "Statut", largeur: null, min: 110, alignement: "droite", cellule: (a) => <PastilleEtat libelle={tr(a.statut)} ton={TON_PAR_STATUT_DE_VENTE[a.statut]} /> },
  ]

  return (
    <TableauDeDonnees
      titre={t("Dernières activités")}
      iconeTitre={Clock3}
      actionEnTete={
        <Button variant="link" render={<a href={lienVoirTout} />} className="h-auto gap-1 p-0 text-xs font-semibold">
          {t("Voir tout")}
          <ArrowRight className="size-3.5" />
        </Button>
      }
      avecPagination={false}
      colonnes={colonnes}
      lignes={activites}
      cleDeLigne={(a) => a.id}
      total={activites.length}
      page={1}
      pageSize={activites.length || 5}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      libelleElements="activités"
      cleLargeurs="dernieres-activites"
      enChargement={enChargement}
      erreur={erreur}
      vide={{ titre: "Aucune activité récente", description: "Les ventes et opérations de stock apparaîtront ici." }}
      className="min-h-0"
    />
  )
}
