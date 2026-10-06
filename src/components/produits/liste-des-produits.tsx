import { t, tr } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { Package } from "lucide-react"

import { ActionsDeLigne } from "@/components/donnees/actions-de-ligne"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import type { LigneDeProduit } from "@/types"


type ListeDesProduitsProps = {
  lignes: LigneDeProduit[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onConsulter?: (produit: LigneDeProduit) => void
  onModifier?: (produit: LigneDeProduit) => void
  onChangerStatut?: (produit: LigneDeProduit) => void
  enChargement?: boolean
  erreur?: string | null
}

/** Catalogue des produits — colonnes sur le tableau commun. */
export function ListeDesProduits({ onConsulter, onModifier, onChangerStatut, ...props }: ListeDesProduitsProps) {
  const colonnes: ColonneDeTableau<LigneDeProduit>[] = [
    {
      id: "produit",
      libelle: "Produit",
      largeur: 280,
      min: 160,
      cellule: (p) => (
        <span className="flex min-w-0 items-center gap-3">
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground">
              <Package className="size-4" />
            </span>
          )}
          <span className="truncate text-[13px] font-semibold">{p.nomDuProduit}</span>
        </span>
      ),
    },
    { id: "reference", libelle: "Référence", largeur: 120, min: 80, cellule: (p) => <span className="text-xs text-muted-foreground">{p.reference}</span> },
    { id: "code-barres", libelle: "Code-barres", largeur: 150, min: 100, cellule: (p) => <span className="text-xs text-muted-foreground tabular-nums">{p.codeBarres || "—"}</span> },
    { id: "categorie", libelle: "Catégorie", largeur: 160, min: 100, cellule: (p) => <span className="truncate text-xs">{p.categorie}</span> },
    { id: "unite", libelle: "Unité", largeur: 90, min: 70, cellule: (p) => <span className="text-xs">{p.unite}</span> },
    {
      id: "prix",
      libelle: "Prix de vente",
      largeur: 130,
      min: 90,
      cellule: (p) => <span className="text-[13px] font-semibold tabular-nums">{ariary.format(p.prixDeVente)}</span>,
    },
    {
      id: "statut",
      libelle: "Statut",
      largeur: 130,
      min: 100,
      cellule: (p) => <PastilleEtat libelle={tr(p.statut)} ton={p.statut === "Actif" ? "succes" : "neutre"} />,
    },
    {
      id: "actions",
      libelle: "Actions",
      largeur: null,
      min: 85,
      alignement: "droite",
      cellule: (p) => (
        <ActionsDeLigne
          nom={p.nomDuProduit}
          onConsulter={() => onConsulter?.(p)}
          onModifier={() => onModifier?.(p)}
          actions={[{ libelle: p.statut === "Actif" ? "Désactiver" : "Activer", onClick: () => onChangerStatut?.(p) }]}
        />
      ),
    },
  ]

  return (
    <TableauDeDonnees
      titre={t("Catalogue des produits")}
      colonnes={colonnes}
      cleDeLigne={(p) => p.id}
      libelleElements="produits"
      cleLargeurs="liste-des-produits"
      vide={{ titre: "Aucun produit trouvé", description: "Modifiez la recherche ou ajoutez un nouveau produit." }}
      {...props}
    />
  )
}
