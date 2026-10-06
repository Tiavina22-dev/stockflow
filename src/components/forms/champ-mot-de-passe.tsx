import { useState, type ComponentProps } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"

import { ChampAvecIcone } from "@/components/forms/champ-avec-icone"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n"

/** Champ mot de passe avec cadenas et bouton œil pour afficher / masquer la saisie. */
export function ChampMotDePasse(props: Omit<ComponentProps<typeof ChampAvecIcone>, "icone" | "type" | "suffixe">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <ChampAvecIcone {...props} icone={Lock} type={visible ? "text" : "password"} autoComplete="new-password" className="[&_input]:pr-11" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={visible ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  )
}
