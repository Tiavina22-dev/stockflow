import { t, tr } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { useState, type ReactNode } from "react"
import { ArrowLeftRight, Boxes, ChartColumn, ChartColumnBig, Clock3, List, PackagePlus, RefreshCw, Store, Wallet } from "lucide-react"

import { CarteAvecTitre } from "@/components/donnees/carte-avec-titre"
import { CarteDeGraphique } from "@/components/donnees/carte-de-graphique"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { PastilleEtat, type TonPastille } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees } from "@/components/donnees/tableau-de-donnees"
import { GraphiqueEnBarres } from "@/components/rapports/graphiques"
import { ListeDeBarres } from "@/components/rapports/listes"
import { hauteurDeGraphique } from "@/pages/rapports/mise-en-page"
import type { RapportDuStock, StatutDAnalyseDeStock } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const unites = (v: number) => `${nombre.format(v)} u.`

const tonParStatut: Record<StatutDAnalyseDeStock, TonPastille> = {
  Normal: "succes",
  "Stock bas": "alerte",
  "Faible stock": "alerte",
  Rupture: "danger",
}

/** Petit tableau simple dans une carte (produits à faible rotation, transferts). */
function MiniTableau({ colonnes, lignes }: { colonnes: { libelle: string; droite?: boolean }[]; lignes: ReactNode[][] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <thead>
        <tr className="h-8 bg-background text-[11px] font-bold text-muted-foreground">
          {colonnes.map((c) => (
            <th key={c.libelle} scope="col" className={c.droite ? "px-2 text-right" : "px-2"}>
              {tr(c.libelle)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((cellules, i) => (
          <tr key={i} className="h-10 border-t border-border">
            {cellules.map((cellule, j) => (
              <td key={j} className={colonnes[j]?.droite ? "px-2 text-right tabular-nums" : "truncate px-2"}>
                {cellule}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Figma : `rapports_stock` (node 90:2156). */
export function RapportStock({ rapport }: { rapport: RapportDuStock }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IndicateurCle ton="neutre" icone={Boxes} libelle={tr(rapport.stockTotal.libelle)} valeur={rapport.stockTotal.valeur} detail={rapport.stockTotal.evolution} tendance={rapport.stockTotal.tendance} />
        <IndicateurCle ton="neutre" icone={PackagePlus} libelle={tr(rapport.stockEntrant.libelle)} valeur={rapport.stockEntrant.valeur} detail={rapport.stockEntrant.evolution} tendance={rapport.stockEntrant.tendance} />
        <IndicateurCle ton="neutre" icone={Wallet} libelle={tr(rapport.valeurDuStock.libelle)} valeur={rapport.valeurDuStock.valeur} detail={rapport.valeurDuStock.evolution} tendance={rapport.valeurDuStock.tendance} />
        <IndicateurCle ton="neutre" icone={RefreshCw} libelle={tr(rapport.rotationMoyenne.libelle)} valeur={rapport.rotationMoyenne.valeur} detail={rapport.rotationMoyenne.evolution} tendance={rapport.rotationMoyenne.tendance} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <CarteDeGraphique icone={ChartColumn} titre={t("Entrées vs sorties de stock")}>
          {(plein) => (
            <GraphiqueEnBarres
              donnees={rapport.mouvements}
              cleX="periode"
              series={[
                { cle: "entrees", libelle: "Entrées (u.)", couleur: "var(--chart-3)", type: "barre" },
                { cle: "sorties", libelle: "Sorties (u.)", couleur: "var(--chart-2)", type: "barre" },
              ]}
              formatValeur={unites}
              formatAxe={(v) => nombre.format(v)}
              hauteur={hauteurDeGraphique(plein, 230)}
            />
          )}
        </CarteDeGraphique>
        <CarteAvecTitre icone={Store} titre={t("Répartition par magasin")}>
          <ListeDeBarres elements={rapport.parMagasin} />
        </CarteAvecTitre>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CarteDeGraphique icone={ChartColumnBig} titre={t("Rotation par catégorie")}>
          {(plein) => (
            <GraphiqueEnBarres
              donnees={rapport.rotationParCategorie}
              cleX="categorie"
              series={[{ cle: "rotation", libelle: "Rotation (fois)", couleur: "var(--chart-1)", type: "barre" }]}
              formatValeur={(v) => `${nombre.format(v)} fois`}
              formatAxe={(v) => nombre.format(v)}
              toutesLesEtiquettes
              hauteur={hauteurDeGraphique(plein, 190)}
            />
          )}
        </CarteDeGraphique>
        <CarteAvecTitre icone={Clock3} titre={t("Produits à faible rotation")}>
          <MiniTableau
            colonnes={[{ libelle: "Produit" }, { libelle: "Catégorie" }, { libelle: "Stock", droite: true }, { libelle: "Ventes", droite: true }]}
            lignes={rapport.faibleRotation.map((p) => [p.produitNom, <span className="text-muted-foreground">{p.categorie}</span>, nombre.format(p.stock), <span className="font-semibold text-destructive">{nombre.format(p.ventes)}</span>])}
          />
        </CarteAvecTitre>
        <CarteAvecTitre icone={ArrowLeftRight} titre={t("Transferts entre magasins")}>
          <MiniTableau
            colonnes={[{ libelle: "De → vers" }, { libelle: "Produit" }, { libelle: "Quantité", droite: true }]}
            lignes={rapport.transferts.map((t) => [t.trajet, t.produitNom, <span className="font-semibold text-primary">{unites(t.quantite)}</span>])}
          />
        </CarteAvecTitre>
      </div>

      <TableauDeDonnees
        titre={t("Analyse du stock")}
        iconeTitre={List}
        colonnes={[
          { id: "produit", libelle: "Produit", largeur: 200, min: 120, cellule: (l) => <span className="truncate text-[13px] font-semibold">{l.produitNom}</span> },
          { id: "magasin", libelle: "Magasin", largeur: 180, min: 110, cellule: (l) => <span className="truncate text-[13px]">{l.magasinNom}</span> },
          { id: "initial", libelle: "Stock initial", largeur: 110, min: 80, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums">{nombre.format(l.stockInitial)}</span> },
          { id: "entrees", libelle: "Entrées", largeur: 90, min: 70, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums text-success">+{nombre.format(l.entrees)}</span> },
          { id: "sorties", libelle: "Sorties", largeur: 90, min: 70, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums text-destructive">−{nombre.format(l.sorties)}</span> },
          { id: "final", libelle: "Stock final", largeur: 110, min: 80, alignement: "droite", cellule: (l) => <span className="text-[13px] font-semibold tabular-nums">{nombre.format(l.stockFinal)}</span> },
          { id: "valeur", libelle: "Valeur", largeur: 120, min: 90, alignement: "droite", cellule: (l) => <span className="text-[13px] font-semibold tabular-nums">{ariary.format(l.valeur)}</span> },
          { id: "statut", libelle: "Statut", largeur: null, min: 120, cellule: (l) => <PastilleEtat libelle={tr(l.statut)} ton={tonParStatut[l.statut]} /> },
        ]}
        lignes={rapport.analyse.slice((page - 1) * pageSize, page * pageSize)}
        cleDeLigne={(l) => l.id}
        total={rapport.analyse.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(t) => {
          setPageSize(t)
          setPage(1)
        }}
        libelleElements="produits"
        cleLargeurs="rapport-stock"
        className="min-h-0"
      />
    </>
  )
}
