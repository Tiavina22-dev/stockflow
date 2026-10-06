import { t, tr } from "@/i18n"
import { ariary, ariaryCompact } from "@/components/donnees/montants"
import { useState } from "react"
import { Boxes, ChartColumnBig, ChartNoAxesCombined, PackageCheck, Percent, Shapes, TrendingDown, TrendingUp, Trophy } from "lucide-react"

import { CarteAvecTitre, SelecteurDePeriode } from "@/components/donnees/carte-avec-titre"
import { CarteDeGraphique } from "@/components/donnees/carte-de-graphique"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { TableauDeDonnees } from "@/components/donnees/tableau-de-donnees"
import { GraphiqueEnBarres } from "@/components/rapports/graphiques"
import { ListeDEvolution } from "@/components/rapports/listes"
import { libelleDeDate } from "@/components/tableau-de-bord/courbe-des-ventes"
import { cn } from "@/lib/utils"
import { hauteurDeGraphique } from "@/pages/rapports/mise-en-page"
import type { RapportDesProduits } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const pourcentageSigne = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" })

type MesureCategorie = "chiffreDAffaires" | "marge"
type MesureProduit = "ventes" | "chiffreDAffaires"

/** Figma : `rapports_produits` (node 90:1771). Un seul axe par graphique : la mesure se choisit. */
export function RapportProduits({
  rapport,
  produitSuiviId,
  onProduitSuiviChange,
}: {
  rapport: RapportDesProduits
  produitSuiviId: string
  onProduitSuiviChange: (id: string) => void
}) {
  const [mesureCategorie, setMesureCategorie] = useState<MesureCategorie>("chiffreDAffaires")
  const [mesureProduit, setMesureProduit] = useState<MesureProduit>("ventes")

  const choixCategorie = (
    <SelecteurDePeriode
      aria-label={t("Mesure affichée")}
      options={[
        { value: "chiffreDAffaires", label: "Chiffre d’affaires" },
        { value: "marge", label: "Marge (%)" },
      ]}
      valeur={mesureCategorie}
      onChange={setMesureCategorie}
    />
  )
  const choixProduit = (
    <div className="flex gap-2">
      <SelecteurDePeriode
        aria-label={t("Produit suivi")}
        options={rapport.produitsSuivis.map((p) => ({ value: p.produitId, label: p.produitNom }))}
        valeur={produitSuiviId}
        onChange={onProduitSuiviChange}
      />
      <SelecteurDePeriode
        aria-label={t("Mesure affichée")}
        options={[
          { value: "ventes", label: "Ventes (u.)" },
          { value: "chiffreDAffaires", label: "Chiffre d’affaires" },
        ]}
        valeur={mesureProduit}
        onChange={setMesureProduit}
      />
    </div>
  )

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IndicateurCle ton="succes" icone={PackageCheck} libelle={tr(rapport.produitsVendus.libelle)} valeur={rapport.produitsVendus.valeur} detail={rapport.produitsVendus.evolution} tendance={rapport.produitsVendus.tendance} />
        <IndicateurCle ton="violet" icone={Shapes} libelle={tr(rapport.nouveauxProduits.libelle)} valeur={rapport.nouveauxProduits.valeur} detail={rapport.nouveauxProduits.evolution} tendance={rapport.nouveauxProduits.tendance} />
        <IndicateurCle ton="info" icone={Boxes} libelle={tr(rapport.produitsActifs.libelle)} valeur={rapport.produitsActifs.valeur} detail={rapport.produitsActifs.evolution} tendance={rapport.produitsActifs.tendance} />
        <IndicateurCle ton="alerte" icone={Percent} libelle={tr(rapport.margeMoyenne.libelle)} valeur={rapport.margeMoyenne.valeur} detail={rapport.margeMoyenne.evolution} tendance={rapport.margeMoyenne.tendance} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <CarteDeGraphique icone={ChartColumnBig} titre={t("Performance par catégorie")} action={choixCategorie}>
          {(plein) => (
            <GraphiqueEnBarres
              donnees={rapport.parCategorie}
              cleX="categorie"
              series={[
                mesureCategorie === "chiffreDAffaires"
                  ? { cle: "chiffreDAffaires", libelle: "Chiffre d’affaires (Ar)", couleur: "var(--chart-1)", type: "barre" }
                  : { cle: "marge", libelle: "Marge (%)", couleur: "var(--chart-1)", type: "barre" },
              ]}
              formatValeur={(v) => (mesureCategorie === "marge" ? `${nombre.format(v)} %` : ariary.format(v))}
              formatAxe={(v) => (mesureCategorie === "marge" ? `${v} %` : ariaryCompact.format(v))}
              toutesLesEtiquettes
              hauteur={hauteurDeGraphique(plein, 230)}
            />
          )}
        </CarteDeGraphique>
        <CarteAvecTitre icone={TrendingUp} titre={t("Produits en progression")}>
          <ListeDEvolution produits={rapport.enProgression} />
        </CarteAvecTitre>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <CarteDeGraphique icone={ChartNoAxesCombined} titre={t("Évolution d’un produit sélectionné")} action={choixProduit}>
          {(plein) => (
            <GraphiqueEnBarres
              donnees={rapport.evolutionProduit}
              cleX="date"
              series={[
                mesureProduit === "ventes"
                  ? { cle: "ventes", libelle: "Ventes (u.)", couleur: "var(--chart-1)", type: "barre" }
                  : { cle: "chiffreDAffaires", libelle: "Chiffre d’affaires (Ar)", couleur: "var(--chart-1)", type: "barre" },
              ]}
              formatValeur={(v) => (mesureProduit === "ventes" ? `${nombre.format(v)} u.` : ariary.format(v))}
              formatAxe={(v) => (mesureProduit === "ventes" ? nombre.format(v) : ariaryCompact.format(v))}
              formatX={(d) => libelleDeDate(d)}
              hauteur={hauteurDeGraphique(plein, 210)}
            />
          )}
        </CarteDeGraphique>
        <CarteAvecTitre icone={TrendingDown} titre={t("Produits en baisse")}>
          <ListeDEvolution produits={rapport.enBaisse} />
        </CarteAvecTitre>
      </div>

      <TableauDeDonnees
        titre={t("Classement des produits")}
        iconeTitre={Trophy}
        avecPagination={false}
        colonnes={[
          {
            id: "rang",
            libelle: "Rang",
            largeur: 70,
            min: 60,
            cellule: (l) => <span className={cn("text-[13px] font-bold tabular-nums", l.rang === 1 ? "text-caution" : "text-muted-foreground")}>{l.rang}</span>,
          },
          { id: "produit", libelle: "Produit", largeur: 240, min: 140, cellule: (l) => <span className="truncate text-[13px] font-semibold">{l.produitNom}</span> },
          { id: "categorie", libelle: "Catégorie", largeur: 160, min: 100, cellule: (l) => <span className="text-[13px] text-muted-foreground">{l.categorie}</span> },
          { id: "stock", libelle: "Stock", largeur: 100, min: 70, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums">{nombre.format(l.stock)}</span> },
          { id: "ca", libelle: "Chiffre d’affaires", largeur: 160, min: 110, alignement: "droite", cellule: (l) => <span className="text-[13px] font-semibold tabular-nums">{ariary.format(l.chiffreDAffaires)}</span> },
          { id: "ventes", libelle: "Ventes", largeur: 110, min: 80, alignement: "droite", cellule: (l) => <span className="text-xs tabular-nums">{nombre.format(l.ventes)} u.</span> },
          {
            id: "evolution",
            libelle: "Évolution",
            largeur: null,
            min: 100,
            alignement: "droite",
            cellule: (l) => (
              <span className={cn("text-[13px] font-semibold tabular-nums", l.evolution >= 0 ? "text-success" : "text-destructive")}>
                {pourcentageSigne.format(l.evolution / 100)}
              </span>
            ),
          },
        ]}
        lignes={rapport.classement}
        cleDeLigne={(l) => l.produitId}
        total={rapport.classement.length}
        page={1}
        pageSize={rapport.classement.length || 5}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        actionEnTete={<span />}
        libelleElements="produits"
        cleLargeurs="rapport-produits"
        className="min-h-0"
      />
    </>
  )
}
