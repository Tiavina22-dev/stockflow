import { t, tr, formatDate } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { useState } from "react"
import { ChevronDown, List, Package, User } from "lucide-react"

import { ActionsDeLigne } from "@/components/donnees/actions-de-ligne"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { ArticlesVendus } from "@/components/ventes/articles-vendus"
import { TON_PAR_STATUT_DE_VENTE } from "@/components/ventes/statut-de-vente"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { VenteDuCahier } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const heure = formatDate({ timeZone: "Indian/Antananarivo", hour: "2-digit", minute: "2-digit" })

type CahierDesVentesProps = {
  afficherHeures?: boolean
  ventes: VenteDuCahier[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onConsulter?: (vente: VenteDuCahier) => void
  onModifier?: (vente: VenteDuCahier) => void
  onSupprimer?: (vente: VenteDuCahier) => void
  enChargement?: boolean
  erreur?: string | null
}

/** Figma : calque `tableau_des_ventes` du `cahier_de_vente` — ventes à plusieurs articles dépliables. */
export function CahierDesVentes({ ventes, afficherHeures = true, onConsulter, onModifier, onSupprimer, ...props }: CahierDesVentesProps) {
  const [depliees, setDepliees] = useState<Set<string>>(() => new Set())
  const basculer = (id: string) =>
    setDepliees((actuelles) => {
      const suivantes = new Set(actuelles)
      if (suivantes.has(id)) suivantes.delete(id)
      else suivantes.add(id)
      return suivantes
    })

  const colonnes: ColonneDeTableau<VenteDuCahier>[] = [
    {
      id: "heure",
      libelle: "Heure",
      largeur: 100,
      min: 70,
      cellule: (v) => <span className="text-[13px] tabular-nums">{heure.format(new Date(v.venteDate))}</span>,
    },
    {
      id: "numero",
      libelle: "N° vente",
      largeur: 124,
      min: 90,
      cellule: (v) => (
        <Button variant="link" onClick={() => onConsulter?.(v)} className="h-auto p-0 text-[13px] font-semibold">
          {v.venteNumero}
        </Button>
      ),
    },
    {
      id: "articles",
      libelle: "Articles",
      largeur: 310,
      min: 180,
      cellule: (v) => {
        if (v.articles.length > 1) {
          const ouverte = depliees.has(v.id)
          return (
            <Button
              variant="ghost"
              aria-expanded={ouverte}
              onClick={() => basculer(v.id)}
              className="-ml-2 h-8 gap-2.5 px-2 text-[13px] font-semibold"
            >
              <List className="size-4 text-primary" />
              {v.articles.length} produits
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", ouverte && "rotate-180")} />
            </Button>
          )
        }
        const article = v.articles[0]
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            {article?.photoUrl ? (
              <img src={article.photoUrl} alt="" className="h-[42px] w-9 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-[42px] w-9 shrink-0 items-center justify-center rounded bg-background text-muted-foreground">
                <Package className="size-4" />
              </span>
            )}
            <span className="truncate text-[13px] font-semibold">{article?.produitNom ?? "—"}</span>
          </span>
        )
      },
    },
    { id: "qte", libelle: "Qté", largeur: 82, min: 60, cellule: (v) => <span className="text-xs tabular-nums">{nombre.format(v.venteQuantite)}</span> },
    {
      id: "total",
      libelle: "Total",
      largeur: 150,
      min: 100,
      cellule: (v) => <span className="text-[13px] font-semibold tabular-nums">{ariary.format(v.venteMontant)}</span>,
    },
    {
      id: "vendeur",
      libelle: "Vendeur",
      largeur: 172,
      min: 110,
      cellule: (v) => (
        <span className="flex min-w-0 items-center gap-2 text-[13px]">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{v.vendeurNom}</span>
        </span>
      ),
    },
    { id: "statut", libelle: "Statut", largeur: 160, min: 110, cellule: (v) => <PastilleEtat libelle={tr(v.statut)} ton={TON_PAR_STATUT_DE_VENTE[v.statut]} /> },
    {
      id: "actions",
      libelle: "Actions",
      largeur: null,
      min: 128,
      alignement: "droite",
      cellule: (v) => (
        <ActionsDeLigne
          nom={`la vente ${v.venteNumero}`}
          onConsulter={() => onConsulter?.(v)}
          onModifier={v.statut !== "Annulée" ? () => onModifier?.(v) : undefined}
          onSupprimer={v.statut !== "Annulée" ? () => onSupprimer?.(v) : undefined}
        />
      ),
    },
  ]

  return (
    <TableauDeDonnees
      lignes={ventes}
      titre={t("Cahier de vente")}
      avecEnTete={false}
      colonnes={afficherHeures ? colonnes : colonnes.filter(c => c.id !== "heure")}
      cleDeLigne={(v) => v.id}
      libelleElements="ventes"
      cleLargeurs="cahier-de-vente"
      vide={{ titre: "Aucune vente ce jour", description: "Choisissez une autre date ou enregistrez une vente." }}
      detailDeLigne={(v) =>
        v.articles.length > 1 && depliees.has(v.id) ? (
          <ArticlesVendus articles={v.articles} variante="compacte" className="ml-[204px] rounded-sm border border-grid-line" />
        ) : null
      }
      {...props}
    />
  )
}
