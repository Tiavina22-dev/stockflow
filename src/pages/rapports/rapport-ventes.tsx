import { t, tr } from "@/i18n"
import { ariary, ariaryCompact } from "@/components/donnees/montants"
import { useState } from "react"
import { BadgeCheck, CalendarCheck, ChartColumn, Clock3, ShoppingBasket, ShoppingCart, Users, Wallet } from "lucide-react"

import { CarteAvecTitre } from "@/components/donnees/carte-avec-titre"
import { CarteDeGraphique } from "@/components/donnees/carte-de-graphique"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { TableauDeDonnees } from "@/components/donnees/tableau-de-donnees"
import { GraphiqueDonut, GraphiqueEnBarres } from "@/components/rapports/graphiques"
import { libelleDeDate } from "@/components/tableau-de-bord/courbe-des-ventes"
import { TON_PAR_STATUT_DE_VENTE } from "@/components/ventes/statut-de-vente"
import { hauteurDeGraphique } from "@/pages/rapports/mise-en-page"
import type { RapportDesVentes } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : `rapports_ventes` (node 90:5908). */
export function RapportVentes({ rapport }: { rapport: RapportDesVentes }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const heurePlusActive = rapport.parHeure.reduce((a, b) => (b.ventes > a.ventes ? b : a), rapport.parHeure[0])
  const indexHeure = rapport.parHeure.indexOf(heurePlusActive)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IndicateurCle ton="succes" icone={ChartColumn} libelle={tr(rapport.chiffreDAffaires.libelle)} valeur={rapport.chiffreDAffaires.valeur} detail={rapport.chiffreDAffaires.evolution} tendance={rapport.chiffreDAffaires.tendance} />
        <IndicateurCle ton="info" icone={ShoppingCart} libelle={tr(rapport.nombreDeVentes.libelle)} valeur={rapport.nombreDeVentes.valeur} detail={rapport.nombreDeVentes.evolution} tendance={rapport.nombreDeVentes.tendance} />
        <IndicateurCle ton="neutre" icone={ShoppingBasket} libelle={tr(rapport.panierMoyen.libelle)} valeur={rapport.panierMoyen.valeur} detail={rapport.panierMoyen.evolution} tendance={rapport.panierMoyen.tendance} />
        <IndicateurCle ton="neutre" icone={BadgeCheck} libelle={tr(rapport.ventesValidees.libelle)} valeur={rapport.ventesValidees.valeur} detail={rapport.ventesValidees.evolution} tendance={rapport.ventesValidees.tendance} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <CarteDeGraphique icone={ChartColumn} titre={t("Évolution des ventes")}>
          {(plein) => (
            <GraphiqueEnBarres
              donnees={rapport.evolution}
              cleX="date"
              series={[
                { cle: "montant", libelle: "Ventes (Ar)", couleur: "var(--chart-1)", type: "barre" },
                { cle: "moyenne7Jours", libelle: "Moyenne 7 jours (Ar)", couleur: "var(--foreground)", type: "ligne" },
              ]}
              formatValeur={(v) => ariary.format(v)}
              formatAxe={(v) => ariaryCompact.format(v)}
              formatX={(d) => libelleDeDate(d)}
              hauteur={hauteurDeGraphique(plein, 230)}
            />
          )}
        </CarteDeGraphique>

        <CarteAvecTitre icone={CalendarCheck} titre={t("Meilleure journée")}>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <span className="inline-block text-xs text-muted-foreground first-letter:uppercase">{libelleDeDate(rapport.meilleureJournee.date, true)}</span>
            <span className="text-4xl font-bold tabular-nums">{ariary.format(rapport.meilleureJournee.montant)}</span>
            <span className="text-xs font-semibold text-success">{rapport.meilleureJournee.evolution}</span>
            <p className="pt-2 text-[13px] text-muted-foreground">{t("C’est votre meilleure journée de ventes sur cette période.")}</p>
          </div>
        </CarteAvecTitre>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CarteDeGraphique icone={Users} titre={t("Répartition par vendeur")}>
          {() => (
            <GraphiqueDonut
              donnees={rapport.parVendeur.map((v) => ({ id: v.vendeurId, libelle: v.vendeurNom, valeur: v.ventes }))}
              libelleTotal="ventes"
              formatValeur={(v) => nombre.format(v)}
            />
          )}
        </CarteDeGraphique>

        <CarteDeGraphique icone={Clock3} titre={t("Heures les plus actives")}>
          {(plein) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {heurePlusActive.heure} h – {heurePlusActive.heure + 1} h
                  </p>
                  <p className="text-xs text-muted-foreground">{t("Plage horaire la plus performante")}</p>
                </div>
                <span className="text-xs font-semibold text-success">{nombre.format(heurePlusActive.ventes)} ventes</span>
              </div>
              <GraphiqueEnBarres
                donnees={rapport.parHeure.map((h) => ({ heure: `${h.heure} h`, ventes: h.ventes }))}
                cleX="heure"
                series={[{ cle: "ventes", libelle: "Ventes", couleur: "var(--chart-1)", type: "barre" }]}
                formatValeur={(v) => nombre.format(v)}
                indexEnAvant={indexHeure}
                hauteur={hauteurDeGraphique(plein, 160)}
              />
            </div>
          )}
        </CarteDeGraphique>
      </div>

      <TableauDeDonnees
        titre={t("Analyse des ventes")}
        colonnes={[
          { id: "date", libelle: "Date", largeur: 150, min: 100, cellule: (l) => <span className="inline-block text-[13px] first-letter:uppercase">{libelleDeDate(l.date, true)}</span> },
          { id: "magasin", libelle: "Magasin", largeur: 200, min: 120, cellule: (l) => <span className="truncate text-[13px]">{l.magasinNom}</span> },
          { id: "ventes", libelle: "Ventes", largeur: 110, min: 80, alignement: "droite", cellule: (l) => <span className="text-[13px] font-semibold tabular-nums">{nombre.format(l.ventes)}</span> },
          { id: "ca", libelle: "Chiffre d’affaires", largeur: 170, min: 110, alignement: "droite", cellule: (l) => <span className="text-[13px] tabular-nums">{ariary.format(l.chiffreDAffaires)}</span> },
          { id: "panier", libelle: "Panier moyen", largeur: 150, min: 100, alignement: "droite", cellule: (l) => <span className="text-[13px] tabular-nums">{ariary.format(l.panierMoyen)}</span> },
          { id: "statut", libelle: "Statut", largeur: null, min: 110, cellule: (l) => <PastilleEtat libelle={tr(l.statut)} ton={TON_PAR_STATUT_DE_VENTE[l.statut]} /> },
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
        libelleElements="lignes"
        cleLargeurs="rapport-ventes"
        iconeTitre={Wallet}
        className="min-h-0"
      />
    </>
  )
}
