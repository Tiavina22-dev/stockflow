import { t, tr } from "@/i18n"
import { useState, type FormEvent } from "react"
import { Check, Eye, EyeOff, LoaderCircle } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Durée pendant laquelle « Bienvenue » reste affiché avant d'ouvrir l'application */
const DUREE_DE_BIENVENUE = 800

const CLASSE_DE_CHAMP = "h-12 rounded-sm border-grid-line bg-card px-4 text-sm md:text-sm placeholder:text-muted-foreground/70"

/** Figma : calque `Formulaire de connexion` de l'écran `Connexion` (node 217:150). */
export function FormulaireDeConnexion({
  onSeConnecter,
  onConnecte,
  onMotDePasseOublie,
}: {
  /** Rejette avec `Error(message)` si les identifiants sont refusés ; renvoie le prénom si connu */
  onSeConnecter: (identifiant: string, motDePasse: string) => Promise<string | undefined>
  /** Appelé après l'animation de bienvenue (ouvrir l'application) */
  onConnecte: () => void
  onMotDePasseOublie: () => void
}) {
  const sansAnimation = useReducedMotion()
  const [identifiant, setIdentifiant] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [visible, setVisible] = useState(false)
  const [tentative, setTentative] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  // Étape 2 de l'animation : connexion réussie (null = pas encore)
  const [bienvenue, setBienvenue] = useState<{ prenom?: string } | null>(null)

  const erreurIdentifiant = tentative && !identifiant.trim() ? "Saisissez votre identifiant." : undefined
  const erreurMotDePasse = tentative && !motDePasse ? "Saisissez votre mot de passe." : undefined

  const soumettre = async (e: FormEvent) => {
    e.preventDefault()
    setTentative(true)
    setErreur(null)
    if (!identifiant.trim() || !motDePasse) return
    setEnCours(true)
    try {
      const prenom = await onSeConnecter(identifiant.trim(), motDePasse)
      setBienvenue({ prenom })
      window.setTimeout(onConnecte, sansAnimation ? 0 : DUREE_DE_BIENVENUE)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : t("Connexion impossible. Réessayez."))
      setEnCours(false)
    }
  }

  const etat = bienvenue ? "bienvenue" : enCours ? "verification" : "repos"
  const transition = sansAnimation ? { duration: 0 } : { duration: 0.18, ease: "easeOut" as const }

  return (
    <form noValidate onSubmit={soumettre} className="flex flex-col gap-6 rounded-xl border border-grid-line bg-card p-8 shadow-card">
      {/* Introduction */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] leading-tight font-bold">{t("Connexion")}</h1>
        <p className="text-sm leading-normal text-muted-foreground">{t("Connectez-vous à votre espace de gestion de stock.")}</p>
      </div>

      {/* Identifiants */}
      <div className="flex flex-col gap-5">
        <ChampDeFormulaire id="connexion-identifiant" libelle={t("Identifiant")} erreur={erreurIdentifiant}>
          <Input
            id="connexion-identifiant"
            autoComplete="username"
            autoFocus
            value={identifiant}
            aria-invalid={!!erreurIdentifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            placeholder={t("Saisissez votre identifiant")}
            className={CLASSE_DE_CHAMP}
          />
        </ChampDeFormulaire>

        <div className="flex flex-col gap-3">
          <ChampDeFormulaire id="connexion-mot-de-passe" libelle={t("Mot de passe")} erreur={erreurMotDePasse}>
            <div className="relative">
              <Input
                id="connexion-mot-de-passe"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                value={motDePasse}
                aria-invalid={!!erreurMotDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder={t("Saisissez votre mot de passe")}
                className={`${CLASSE_DE_CHAMP} pr-11`}
              />
              <Button
                type="button"
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
          </ChampDeFormulaire>
          <Button type="button" variant="link" onClick={onMotDePasseOublie} className="h-auto self-end p-0 text-[13px] font-medium">
            {t("Mot de passe oublié ?")}
          </Button>
        </div>
      </div>

      {erreur && (
        <p role="alert" className="-my-2 rounded-lg bg-danger-muted px-3.5 py-2.5 text-[13px] text-destructive">
          {tr(erreur)}
        </p>
      )}

      {/* Animation : roue pendant la vérification, puis coche verte et « Bienvenue » */}
      <Button
        type="submit"
        disabled={enCours}
        aria-live="polite"
        className={cn(
          "relative h-12 w-full overflow-hidden rounded-sm text-sm font-semibold transition-colors duration-300",
          bienvenue && "bg-success text-white disabled:opacity-100"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={etat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={transition}
            className="flex items-center gap-2"
          >
            {etat === "verification" && <LoaderCircle className="animate-spin" />}
            {etat === "bienvenue" && (
              <motion.span
                initial={sansAnimation ? false : { scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="flex size-5 items-center justify-center rounded-full bg-white text-success"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
            )}
            {etat === "repos" && t("Se connecter")}
            {etat === "verification" && t("Vérification…")}
            {etat === "bienvenue" && (bienvenue?.prenom ? t("Bienvenue, {{v0}}", { v0: bienvenue.prenom }) : t("Bienvenue"))}
          </motion.span>
        </AnimatePresence>
      </Button>
    </form>
  )
}
