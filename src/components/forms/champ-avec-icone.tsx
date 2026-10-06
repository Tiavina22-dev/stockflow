import type { ComponentProps, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { ChampNombre } from "@/components/forms/champ-nombre"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

/** Libellé de champ de formulaire (13 px, astérisque rouge si obligatoire) + message d'erreur. */
export function ChampDeFormulaire({
  id,
  libelle,
  obligatoire = false,
  erreur,
  className,
  children,
}: {
  id: string
  libelle: string
  obligatoire?: boolean
  erreur?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {tr(libelle)}
        {obligatoire && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {erreur && (
        <p id={`${id}-erreur`} className="text-xs text-destructive">
          {tr(erreur)}
        </p>
      )}
    </div>
  )
}

/** Case grise à gauche d'un champ (Figma : calque `prefixe`). */
export function PrefixeDeChamp({ icone: Icone, className }: { icone: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-px left-px flex w-[42px] items-center justify-center rounded-l-[5px] bg-background text-foreground",
        className
      )}
    >
      <Icone className="size-4" />
    </span>
  )
}

type ChampAvecIconeProps = Omit<ComponentProps<typeof Input>, "className"> & {
  icone: LucideIcon
  /** Texte de la case grise à droite (Figma : calque `suffixe`, ex. « Ar ») */
  suffixe?: string
  /** Saisie numérique avec espace des milliers (remplace `value` / `onChange`) */
  nombre?: { valeur: string | number | null; onChange: (valeur: string) => void; decimales?: number }
  className?: string
}

/** Champ de saisie avec case d'icône (Figma : calque `saisie` de nouveau_produit_fenetre). */
export function ChampAvecIcone({ icone, suffixe, nombre, className, ...props }: ChampAvecIconeProps) {
  const classe = cn(
    "h-11 rounded-sm border-grid-line pl-[54px] text-[13px] md:text-[13px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
    suffixe && "pr-14",
    nombre && "tabular-nums"
  )
  return (
    <div className={cn("relative", className)}>
      <PrefixeDeChamp icone={icone} />
      {nombre ? (
        <ChampNombre
          id={props.id}
          placeholder={props.placeholder}
          aria-invalid={props["aria-invalid"]}
          aria-label={props["aria-label"]}
          readOnly={props.readOnly}
          valeur={nombre.valeur}
          onChange={nombre.onChange}
          decimales={nombre.decimales}
          className={classe}
        />
      ) : (
        <Input {...props} className={classe} />
      )}
      {suffixe && (
        <span className="pointer-events-none absolute inset-y-px right-px flex w-12 items-center justify-center rounded-r-[5px] bg-background text-[11px] font-semibold text-muted-foreground">
          {suffixe}
        </span>
      )}
    </div>
  )
}

type ZoneDeTexteAvecIconeProps = Omit<ComponentProps<typeof Textarea>, "className" | "value" | "onChange"> & {
  icone: LucideIcon
  valeur: string
  onChange: (valeur: string) => void
  /** Affiche « n / max » en bas à droite */
  maximum?: number
  className?: string
}

/** Zone de texte avec case d'icône et compteur (Figma : calque `zone_de_texte`). */
export function ZoneDeTexteAvecIcone({ icone: Icone, valeur, onChange, maximum, className, ...props }: ZoneDeTexteAvecIconeProps) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-px left-px flex w-[46px] justify-center rounded-l-[5px] bg-background pt-3.5 text-foreground"
      >
        <Icone className="size-[17px]" />
      </span>
      <Textarea
        {...props}
        value={valeur}
        maxLength={maximum}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-h-[150px] resize-none rounded-sm border-grid-line pt-3 pb-6 pl-[58px] text-xs leading-normal md:text-xs"
      />
      {maximum !== undefined && (
        <span className="pointer-events-none absolute right-3 bottom-2 text-[10px] text-muted-foreground tabular-nums">
          {valeur.length} / {maximum}
        </span>
      )}
    </div>
  )
}
