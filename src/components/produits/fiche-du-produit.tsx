import { BadgeInfo, Package } from "lucide-react"

import { ariary } from "@/components/donnees/montants"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { t, tr } from "@/i18n"
import type { DetailDuProduit } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : panneau `fiche_produit` de `detail_du_produit_prix_par_magasin` (node 238:25855). */
export function FicheDuProduit({ produit }: { produit: DetailDuProduit }) {
  const quantite = (n: number) => `${nombre.format(n)} ${tr(produit.uniteAuPluriel)}`
  const colonneGauche: [string, string][] = [
    ["Catégorie", tr(produit.categorie)],
    ["Unité de vente", tr(produit.uniteDeVente)],
    ["Poids", produit.poids ?? "—"],
    ["Prix d’achat moyen", produit.prixDAchatMoyen === null ? "—" : ariary.format(produit.prixDAchatMoyen)],
  ]
  const colonneDroite: [string, string][] = [
    ["Stock actuel", quantite(produit.stockActuel)],
    ["Stock minimum", quantite(produit.stockMinimum)],
    ["Fournisseur principal", produit.fournisseurPrincipal ?? "—"],
    ["Statut", tr(produit.statut)],
  ]

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-grid-line bg-card p-5 shadow-card xl:flex-row xl:items-center">
      {/* photo_et_identite */}
      <div className="flex min-w-0 items-center gap-5 xl:w-[440px] xl:shrink-0">
        {produit.photoUrl ? (
          <img src={produit.photoUrl} alt={produit.nom} className="h-[126px] w-[132px] shrink-0 rounded-sm object-cover" />
        ) : (
          <span className="flex h-[126px] w-[132px] shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
            <Package className="size-10" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="truncate text-2xl font-bold">{produit.nom}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Réf. :")} {produit.reference}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {produit.typeDeProduit && <PastilleEtat ton="info" libelle={produit.typeDeProduit} className="h-[26px] text-xs font-bold" />}
            <PastilleEtat ton={produit.statut === "Actif" ? "succes" : "neutre"} libelle={produit.statut} className="h-[26px] text-xs font-bold" />
          </div>
        </div>
      </div>

      {/* informations_du_produit */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-grid-line p-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
            <BadgeInfo className="size-6" />
          </span>
          <h3 className="text-lg font-bold">{t("Informations")}</h3>
        </div>
        <div className="grid gap-x-5 gap-y-2.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Colonne lignes={colonneGauche} />
          <Colonne lignes={colonneDroite} />
        </div>
      </div>
    </section>
  )
}

function Colonne({ lignes }: { lignes: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-2.5 text-[13px]">
      {lignes.map(([terme, valeur]) => (
        <div key={terme} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
          <dt className="text-muted-foreground">{tr(terme)}</dt>
          <dd className="truncate" title={valeur}>
            {valeur}
          </dd>
        </div>
      ))}
    </dl>
  )
}
