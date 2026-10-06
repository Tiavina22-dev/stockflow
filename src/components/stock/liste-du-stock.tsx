import { ActionsDeLigne } from "@/components/donnees/actions-de-ligne"
import { PastilleEtat, type TonPastille } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import type { EtatDuStock, LigneDeStock } from "@/types"
import { t, tr } from "@/i18n"

const nombre = new Intl.NumberFormat("fr-FR")

const tonParEtat: Record<EtatDuStock, TonPastille> = {
  Disponible: "succes",
  "Stock faible": "alerte",
  Rupture: "danger",
}

type ListeDuStockProps = {
  lignes: LigneDeStock[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onConsulter?: (ligne: LigneDeStock) => void
  onModifier?: (ligne: LigneDeStock) => void
  onTransferer?: (ligne: LigneDeStock) => void
  enChargement?: boolean
  erreur?: string | null
}

/** Figma : calque `liste_du_stock` — colonnes du stock sur le tableau commun. */
export function ListeDuStock({ onConsulter, onModifier, onTransferer, ...props }: ListeDuStockProps) {
  const colonnes: ColonneDeTableau<LigneDeStock>[] = [
    {
      id: "produit",
      libelle: "Produit",
      largeur: 240,
      min: 140,
      cellule: (l) => (
        <>
          <p className="truncate text-[13px] font-semibold">{l.produitNom}</p>
          <p className="truncate text-[11px] text-muted-foreground">{tr(l.sousTitre)}</p>
        </>
      ),
    },
    { id: "reference", libelle: "Référence", largeur: 110, min: 80, cellule: (l) => <span className="text-xs text-muted-foreground">{l.reference}</span> },
    { id: "categorie", libelle: "Catégorie", largeur: 150, min: 90, cellule: (l) => <span className="truncate text-xs">{l.categorie}</span> },
    { id: "magasin", libelle: "Magasin", largeur: 170, min: 100, cellule: (l) => <span className="truncate text-xs">{l.magasin}</span> },
    {
      id: "stock-disponible",
      libelle: "Stock disponible",
      largeur: 150,
      min: 100,
      cellule: (l) => <span className="text-[13px] font-bold tabular-nums">{nombre.format(l.stockDisponible)}</span>,
    },
    {
      id: "seuil-alerte",
      libelle: "Seuil d'alerte",
      largeur: 130,
      min: 90,
      cellule: (l) => <span className="text-xs text-muted-foreground tabular-nums">{nombre.format(l.seuilAlerte)}</span>,
    },
    { id: "etat", libelle: "État", largeur: 160, min: 120, cellule: (l) => <PastilleEtat libelle={l.etat} ton={tonParEtat[l.etat]} /> },
    {
      id: "actions",
      libelle: "Actions",
      largeur: null,
      min: 85,
      alignement: "droite",
      cellule: (l) => (
        <ActionsDeLigne
          nom={l.produitNom}
          onConsulter={() => onConsulter?.(l)}
          actions={[
            { libelle: "Modifier", onClick: () => onModifier?.(l) },
            { libelle: "Transférer", onClick: () => onTransferer?.(l) },
          ]}
        />
      ),
    },
  ]

  return (
    <TableauDeDonnees
      titre={t("Liste des produits")}
      colonnes={colonnes}
      cleDeLigne={(l) => l.id}
      libelleElements="produits"
      cleLargeurs="liste-du-stock"
      vide={{ titre: "Aucun produit trouvé", description: "Modifiez la recherche ou les filtres pour afficher d’autres produits." }}
      {...props}
    />
  )
}
