import { montantEnLettres } from "@/components/donnees/montants"
import { cn } from "@/lib/utils"

/** Montant écrit en toutes lettres, sous un total (vente, facture). */
export function MontantEnLettres({ montant, prefixe, className }: { montant: number; prefixe?: string; className?: string }) {
  return (
    <p className={cn("text-[11px] text-muted-foreground italic", className)}>
      {prefixe && <span className="not-italic">{prefixe} </span>}
      {montantEnLettres(montant)}
    </p>
  )
}
