import { Ellipsis, Eye, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { t, tr } from "@/i18n"

export type ActionSecondaire = { libelle: string; onClick: () => void; danger?: boolean }

type ActionsDeLigneProps = {
  /** Nom de l'élément, pour les libellés accessibles */
  nom: string
  onConsulter?: () => void
  /** Bouton crayon direct (ex. cahier de vente) */
  onModifier?: () => void
  /** Bouton corbeille direct (ex. cahier de vente) */
  onSupprimer?: () => void
  /** Actions du menu « … » */
  actions?: ActionSecondaire[]
}

/** Cellule « Actions » commune : œil (consulter), crayon / corbeille facultatifs, menu « … » facultatif. */
export function ActionsDeLigne({ nom, onConsulter, onModifier, onSupprimer, actions = [] }: ActionsDeLigneProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        aria-label={t("Consulter {{v0}}", { v0: nom })}
        onClick={onConsulter}
        className="size-[34px] rounded-sm p-0 hover:bg-primary hover:text-primary-foreground"
      >
        <Eye />
      </Button>
      {onModifier && (
        <Button
          variant="ghost"
          aria-label={t("Modifier {{v0}}", { v0: nom })}
          onClick={onModifier}
          className="size-[34px] rounded-sm bg-background p-0 text-muted-foreground"
        >
          <Pencil />
        </Button>
      )}
      {onSupprimer && (
        <Button
          variant="ghost"
          aria-label={t("Supprimer {{v0}}", { v0: nom })}
          onClick={onSupprimer}
          className="size-[34px] rounded-sm bg-danger-muted p-0 text-destructive hover:bg-destructive hover:text-white"
        >
          <Trash2 />
        </Button>
      )}
      {actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("Plus d'actions pour {{v0}}", { v0: nom })}
            render={<Button variant="ghost" className="size-[34px] rounded-sm bg-background p-0 text-muted-foreground" />}
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.libelle}
                onClick={action.onClick}
                className={action.danger ? "text-destructive focus:text-destructive" : undefined}
              >
                {tr(action.libelle)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
