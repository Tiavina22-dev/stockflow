import { ariary, ariaryCompact, ariarySigne } from "@/components/donnees/montants"
import { ArrowRight, Coins, ChartNoAxesCombined, ChevronRight, History, PackageSearch, Store, TriangleAlert, Wallet } from "lucide-react"

import { CarteAvecTitre } from "@/components/donnees/carte-avec-titre"
import { CarteDeGraphique } from "@/components/donnees/carte-de-graphique"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { TableauDeDonnees } from "@/components/donnees/tableau-de-donnees"
import { GraphiqueDEcarts } from "@/components/rapports/graphiques"
import { ListeDeBarres } from "@/components/rapports/listes"
import { libelleDeDate } from "@/components/tableau-de-bord/courbe-des-ventes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hauteurDeGraphique } from "@/pages/rapports/mise-en-page"
import type { RapportDesPrix } from "@/types"
import { t, tr } from "@/i18n"


/** Figma : `rapports_prix_ecarts` (node 90:1367). */
export function RapportPrix({ rapport, lienHistorique }: { rapport: RapportDesPrix; lienHistorique: string }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IndicateurCle ton="neutre" icone={TriangleAlert} libelle={tr(rapport.ecartsDetectes.libelle)} valeur={rapport.ecartsDetectes.valeur} detail={rapport.ecartsDetectes.evolution} tendance={rapport.ecartsDetectes.tendance} />
        <IndicateurCle ton="neutre" icone={PackageSearch} libelle={tr(rapport.produitsConcernes.libelle)} valeur={rapport.produitsConcernes.valeur} detail={rapport.produitsConcernes.evolution} tendance={rapport.produitsConcernes.tendance} />
        <IndicateurCle ton="neutre" icone={Wallet} libelle={tr(rapport.montantImpacte.libelle)} valeur={rapport.montantImpacte.valeur} detail={rapport.montantImpacte.evolution} tendance={rapport.montantImpacte.tendance} />
        <IndicateurCle ton="neutre" icone={Coins} libelle={tr(rapport.modificationsDePrix.libelle)} valeur={rapport.modificationsDePrix.valeur} detail={rapport.modificationsDePrix.evolution} tendance={rapport.modificationsDePrix.tendance} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <TableauDeDonnees
          titre={t("Écarts de prix")}
          iconeTitre={ChartNoAxesCombined}
          avecPagination={false}
          actionEnTete={
            <Button variant="link" render={<a href={lienHistorique} />} className="h-auto gap-1 p-0 text-xs font-semibold">
              {t("Voir tous les écarts")}
              <ArrowRight className="size-3.5" />
            </Button>
          }
          colonnes={[
            { id: "date", libelle: "Date", largeur: 100, min: 80, cellule: (l) => <span className="text-xs">{libelleDeDate(l.date)}</span> },
            { id: "produit", libelle: "Produit", largeur: 170, min: 100, cellule: (l) => <span className="truncate text-[13px] font-semibold">{l.produitNom}</span> },
            { id: "magasin", libelle: "Magasin", largeur: 150, min: 88, cellule: (l) => <span className="truncate text-xs text-muted-foreground">{l.magasinNom}</span> },
            { id: "attendu", libelle: "Prix attendu", largeur: 110, min: 80, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums">{ariary.format(l.prixAttendu)}</span> },
            { id: "pratique", libelle: "Prix pratiqué", largeur: 110, min: 80, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums">{ariary.format(l.prixPratique)}</span> },
            {
              id: "ecart",
              libelle: "Écart",
              largeur: 100,
              min: 80,
              alignement: "droite",
              cellule: (l) => (
                <span className={cn("text-[13px] font-semibold tabular-nums", l.ecart >= 0 ? "text-destructive" : "text-success")}>{ariarySigne.format(l.ecart)}</span>
              ),
            },
            { id: "utilisateur", libelle: "Utilisateur", largeur: null, min: 110, cellule: (l) => <span className="truncate text-xs">{l.utilisateurNom}</span> },
          ]}
          lignes={rapport.ecarts}
          cleDeLigne={(l) => l.id}
          total={rapport.ecarts.length}
          page={1}
          pageSize={rapport.ecarts.length || 5}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          libelleElements="écarts"
          cleLargeurs="rapport-prix"
          className="min-h-0"
        />
        <CarteAvecTitre icone={TriangleAlert} titre={t("Produits avec les plus gros écarts")}>
          <ListeDeBarres elements={rapport.plusGrosEcarts} ton="danger" />
        </CarteAvecTitre>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <CarteDeGraphique icone={ChartNoAxesCombined} titre={t("Évolution des écarts dans le temps")}>
          {(plein) => (
            <GraphiqueDEcarts
              donnees={rapport.evolutionDesEcarts}
              cleX="date"
              cleValeur="ecart"
              libellePositif={t("Écarts positifs (Ar)")}
              libelleNegatif={t("Écarts négatifs (Ar)")}
              formatValeur={(v) => ariaryCompact.format(v)}
              formatX={(d) => libelleDeDate(d)}
              hauteur={hauteurDeGraphique(plein, 220)}
            />
          )}
        </CarteDeGraphique>
        <div className="flex flex-col gap-4">
          <CarteAvecTitre icone={Store} titre={t("Magasins avec le plus d’écarts")}>
            <ListeDeBarres elements={rapport.magasinsAvecPlusDEcarts} />
          </CarteAvecTitre>
          <Button
            variant="outline"
            render={<a href={lienHistorique} />}
            className="h-auto justify-start gap-3 rounded-lg border-border bg-card p-4 text-left whitespace-normal shadow-card"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <History className="size-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[13px] font-semibold">{t("Voir l’historique complet des prix")}</span>
              <span className="text-xs font-normal text-muted-foreground">{t("Consultez toutes les modifications et écarts détectés.")}</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </>
  )
}
