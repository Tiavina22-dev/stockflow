import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

/** Carte blanche de droite (Figma : calque `panneau_principal`) avec `en_tete_de_contenu`. */
export function PanneauDeParametres({
  titre,
  description,
  action,
  children,
  className,
}: {
  titre: string
  description: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-1 flex-col gap-4 rounded-lg border border-grid-line bg-card p-4 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-base font-bold">{tr(titre)}</h2>
          <p className="text-[13px] text-muted-foreground">{tr(description)}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * Bloc de réglages (Figma : `parametres_de_numerotation`, `comportement_des_ventes`…).
 * `tuile` : icône dans une case bleue ; `bandeau` : en-tête gris pleine largeur (écran Facturation).
 */
export function SectionDeParametres({
  icone: Icone,
  titre,
  description,
  entete = "tuile",
  children,
  className,
}: {
  icone: LucideIcon
  titre: string
  description: string
  entete?: "tuile" | "bandeau"
  children: ReactNode
  className?: string
}) {
  if (entete === "bandeau")
    return (
      <div className={className}>
        <div className="flex items-center gap-2.5 border-b border-grid-line bg-background px-4 py-2.5">
          <Icone className="size-4 text-primary" />
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[13px] font-bold">{tr(titre)}</h3>
            <p className="text-[11px] text-muted-foreground">{tr(description)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3">{children}</div>
      </div>
    )
  return (
    <div className={cn("flex flex-col gap-3.5 rounded-sm border border-grid-line bg-card p-4", className)}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <Icone className="size-3.5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[13px] font-bold">{tr(titre)}</h3>
          <p className="text-[11px] text-muted-foreground">{tr(description)}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Interrupteur du kit : 34 × 18 px (Figma : calque `interrupteur`). */
export function Interrupteur({
  id,
  valeur,
  onChange,
  libelle,
}: {
  id?: string
  valeur: boolean
  onChange: (valeur: boolean) => void
  /** Libellé accessible quand le texte n'est pas relié par `id` */
  libelle?: string
}) {
  return (
    <Switch
      id={id}
      aria-label={tr(libelle)}
      checked={valeur}
      onCheckedChange={onChange}
      className="data-[size=default]:h-[18px] data-[size=default]:w-[34px] data-unchecked:bg-grid-line [&>span]:shadow-sm"
    />
  )
}

/** Ligne « titre + description + interrupteur » (Figma : calque `reglage`). */
export function ReglageAInterrupteur({
  id,
  titre,
  description,
  valeur,
  onChange,
  taille = "normale",
}: {
  id: string
  titre: string
  description: string
  valeur: boolean
  onChange: (valeur: boolean) => void
  /** `compacte` : textes 12 / 10 px (écran Stock) */
  taille?: "normale" | "compacte"
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-grid-line/70 py-2.5">
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
        <span className={cn("font-semibold", taille === "compacte" ? "text-xs" : "text-[13px]")}>{tr(titre)}</span>
        <span className={cn("text-muted-foreground", taille === "compacte" ? "text-[10px]" : "text-[11px]")}>{tr(description)}</span>
      </label>
      <Interrupteur id={id} valeur={valeur} onChange={onChange} />
    </div>
  )
}

/** Option « interrupteur + libellé » (Figma : calque `option` de l'écran Facturation). */
export function OptionAInterrupteur({
  id,
  libelle,
  valeur,
  onChange,
}: {
  id: string
  libelle: string
  valeur: boolean
  onChange: (valeur: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2 border-b border-grid-line/70 py-2.5 pr-6">
      <Interrupteur id={id} valeur={valeur} onChange={onChange} />
      <label htmlFor={id} className="cursor-pointer text-xs text-foreground/90">
        {tr(libelle)}
      </label>
    </div>
  )
}

/** Classes communes des champs de saisie des paramètres. */
export const CLASSE_DE_CHAMP = "h-11 rounded-sm border-grid-line bg-card text-[13px] md:text-[13px]"
