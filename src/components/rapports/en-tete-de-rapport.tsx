import { CalendarDays, Store } from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { MenuDExport } from "@/components/donnees/menu-d-export"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FormatDExport, OngletDeRapport, PeriodeDeRapport, Store as Magasin } from "@/types"
import { t, tr } from "@/i18n"

export const ONGLETS_DE_RAPPORT: { value: OngletDeRapport; label: string }[] = [
  { value: "vue-generale", label: "Vue générale" },
  { value: "ventes", label: "Ventes" },
  { value: "stock", label: "Stock" },
  { value: "produits", label: "Produits" },
  { value: "prix-ecarts", label: "Prix / écarts" },
]

const optionsPeriode: OptionDeFiltre<PeriodeDeRapport>[] = [
  { value: "7-jours", label: "7 derniers jours" },
  { value: "30-jours", label: "30 derniers jours" },
  { value: "ce-mois", label: "Ce mois-ci" },
  { value: "trimestre", label: "Ce trimestre" },
  { value: "annee", label: "Cette année" },
]

type EnTeteDeRapportProps = {
  onglet: OngletDeRapport
  lienOnglet: (onglet: OngletDeRapport) => string
  magasins: Magasin[]
  magasinId: string | undefined
  onMagasinChange: (id: string) => void
  periode: PeriodeDeRapport
  onPeriodeChange: (periode: PeriodeDeRapport) => void
  onExporter: (format: FormatDExport) => void
}

/** Figma : en-tête commun des `rapports_*` — titre, filtres, « Exporter », onglets. */
export function EnTeteDeRapport({
  onglet,
  lienOnglet,
  magasins,
  magasinId,
  onMagasinChange,
  periode,
  onPeriodeChange,
  onExporter,
}: EnTeteDeRapportProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-[3px]">
          <h1 className="text-2xl font-bold">{t("Rapports")}</h1>
          <p className="text-sm text-muted-foreground">{t("Analysez les performances de vos ventes et prenez les bonnes décisions.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FiltreSelecteur
            icone={Store}
            libelle={t("Magasin")}
            options={magasins.map((m) => ({ value: m.id, label: m.name }))}
            valeur={magasinId ?? null}
            onChange={onMagasinChange}
            placeholder={t("Choisir un magasin")}
            className="w-[220px]"
          />
          <FiltreSelecteur icone={CalendarDays} libelle={t("Période")} options={optionsPeriode} valeur={periode} onChange={onPeriodeChange} className="w-[200px]" />
          <MenuDExport onExporter={onExporter} />
        </div>
      </div>

      {/* onglets (liens : chaque rapport a sa propre adresse) */}
      <nav aria-label={t("Rapports")} className="flex gap-1 overflow-x-auto border-b border-grid-line">
        {ONGLETS_DE_RAPPORT.map((o) => {
          const actif = o.value === onglet
          return (
            <Button
              key={o.value}
              variant="ghost"
              render={<a href={lienOnglet(o.value)} />}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "-mb-px h-10 rounded-none border-0 border-b-2 border-transparent px-3 text-[13px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground",
                actif && "border-b-primary font-semibold text-primary hover:text-primary"
              )}
            >
              {tr(o.label)}
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
