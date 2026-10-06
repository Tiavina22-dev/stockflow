import { Check, Languages } from "lucide-react"

import { PanneauDeParametres } from "@/components/parametres/elements-de-parametres"
import { LANGUES, langueActive, t, type Langue } from "@/i18n"
import { cn } from "@/lib/utils"

/** Rubrique « Langue » des paramètres : français ou malgache (pas de maquette Figma, même style que les autres rubriques). */
export function ChoixDeLangue({ onChoisir }: { onChoisir: (langue: Langue) => void }) {
  const active = langueActive()
  return (
    <PanneauDeParametres titre="Langue de l’interface" description="Choisissez la langue d’affichage du logiciel. Le changement s’applique immédiatement.">
      <div role="radiogroup" aria-label={t("Langue de l’interface")} className="grid gap-3 sm:grid-cols-2">
        {LANGUES.map((langue) => {
          const choisie = langue.value === active
          return (
            <button
              key={langue.value}
              type="button"
              role="radio"
              aria-checked={choisie}
              onClick={() => !choisie && onChoisir(langue.value)}
              className={cn(
                "relative flex items-center gap-4 rounded-lg border bg-background p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                choisie ? "border-2 border-primary p-[15px]" : "border-grid-line hover:border-primary/50"
              )}
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-sm", choisie ? "bg-primary text-primary-foreground" : "bg-accent text-primary")}>
                <Languages className="size-5" />
              </span>
              <span className="flex flex-col gap-0.5">
                {/* Le nom de chaque langue reste écrit dans sa propre langue */}
                <span className="text-sm font-semibold">{langue.libelle}</span>
                <span className="text-xs text-muted-foreground">{langue.description}</span>
              </span>
              {choisie && (
                <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t("Les données saisies (produits, clients, notes) ne sont pas traduites.")}</p>
    </PanneauDeParametres>
  )
}
