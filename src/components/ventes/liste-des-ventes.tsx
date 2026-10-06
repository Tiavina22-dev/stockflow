import { ariary } from "@/components/donnees/montants"
import { ActionsDeLigne } from "@/components/donnees/actions-de-ligne"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { TON_PAR_STATUT_DE_VENTE } from "@/components/ventes/statut-de-vente"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { Button } from "@/components/ui/button"
import type { LigneDeVente } from "@/types"
import { t, tr, formatDate } from "@/i18n"

const dateHeure = formatDate({ dateStyle: "short", timeStyle: "short" })

type ListeDesVentesProps = {
  lignes: LigneDeVente[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onConsulter?: (vente: LigneDeVente) => void
  onValider?: (vente: LigneDeVente) => void
  onImprimer?: (vente: LigneDeVente) => void
  onAnnuler?: (vente: LigneDeVente) => void
  /** « Créer la facture » (ventes validées uniquement) */
  onFacturer?: (vente: LigneDeVente) => void
  enChargement?: boolean
  erreur?: string | null
}

/** Figma : calque `liste_des_ventes` — colonnes des ventes sur le tableau commun. */
export function ListeDesVentes({ onConsulter, onValider, onImprimer, onAnnuler, onFacturer, ...props }: ListeDesVentesProps) {
  const colonnes: ColonneDeTableau<LigneDeVente>[] = [
    {
      id: "vente",
      libelle: "Vente",
      largeur: 110,
      min: 80,
      cellule: (v) => (
        <Button
          variant="link"
          onClick={() => onConsulter?.(v)}
          className="h-auto p-0 text-[13px] font-bold"
        >
          {v.venteNumero}
        </Button>
      ),
    },
    {
      id: "date",
      libelle: "Date",
      largeur: 150,
      min: 110,
      cellule: (v) => <span className="text-xs text-muted-foreground tabular-nums">{dateHeure.format(new Date(v.venteDate))}</span>,
    },
    { id: "magasin", libelle: "Magasin", largeur: 170, min: 110, cellule: (v) => <span className="truncate text-xs">{v.magasinNom}</span> },
    {
      id: "produits",
      libelle: "Produits",
      largeur: 130,
      min: 90,
      cellule: (v) => (
        <span className="text-xs text-muted-foreground">
          {v.nombreProduits} {v.nombreProduits > 1 ? "produits" : "produit"}
        </span>
      ),
    },
    {
      id: "montant",
      libelle: "Montant",
      largeur: 150,
      min: 100,
      cellule: (v) => <span className="text-[13px] font-semibold tabular-nums">{ariary.format(v.venteMontant)}</span>,
    },
    { id: "utilisateur", libelle: "Utilisateur", largeur: 150, min: 100, cellule: (v) => <span className="truncate text-xs text-muted-foreground">{v.utilisateurNom}</span> },
    { id: "statut", libelle: "Statut", largeur: 140, min: 120, cellule: (v) => <PastilleEtat libelle={tr(v.statut)} ton={TON_PAR_STATUT_DE_VENTE[v.statut]} /> },
    {
      id: "actions",
      libelle: "Actions",
      largeur: null,
      min: 85,
      alignement: "droite",
      cellule: (v) => (
        <ActionsDeLigne
          nom={`la vente ${v.venteNumero}`}
          onConsulter={() => onConsulter?.(v)}
          actions={[
            ...(v.statut === "En attente" ? [{ libelle: "Valider", onClick: () => onValider?.(v) }] : []),
            ...(v.statut === "Validée" && onFacturer ? [{ libelle: "Créer la facture", onClick: () => onFacturer(v) }] : []),
            { libelle: "Imprimer le ticket", onClick: () => onImprimer?.(v) },
            ...(v.statut !== "Annulée" ? [{ libelle: "Annuler la vente", onClick: () => onAnnuler?.(v), danger: true }] : []),
          ]}
        />
      ),
    },
  ]

  return (
    <TableauDeDonnees
      titre={t("Liste des ventes")}
      colonnes={colonnes}
      cleDeLigne={(v) => v.id}
      libelleElements="ventes"
      cleLargeurs="liste-des-ventes"
      vide={{ titre: "Aucune vente trouvée", description: "Modifiez la recherche, la période ou les filtres." }}
      {...props}
    />
  )
}
