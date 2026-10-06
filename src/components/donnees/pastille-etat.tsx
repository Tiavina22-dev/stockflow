import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

export type TonPastille = "succes" | "alerte" | "danger" | "neutre" | "info"

const styles: Record<TonPastille, { fond: string; texte: string; point: string }> = {
  succes: { fond: "bg-success-muted", texte: "text-success", point: "bg-success" },
  alerte: { fond: "bg-caution-muted", texte: "text-caution", point: "bg-caution" },
  danger: { fond: "bg-danger-muted", texte: "text-destructive", point: "bg-destructive" },
  neutre: { fond: "bg-muted", texte: "text-muted-foreground", point: "bg-muted-foreground" },
  info: { fond: "bg-accent", texte: "text-primary", point: "bg-primary" },
}

/** Pastille d'état avec point coloré (Figma : calques `etat` / `statut` des listes). */
export function PastilleEtat({ libelle, ton, className }: { libelle: string; ton: TonPastille; className?: string }) {
  const { fond, texte, point } = styles[ton]
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-[7px] rounded-full px-3 text-xs whitespace-nowrap",
        fond,
        texte,
        className
      )}
    >
      <span className={cn("size-[7px] shrink-0 rounded-full", point)} aria-hidden />
      {tr(libelle)}
    </span>
  )
}
