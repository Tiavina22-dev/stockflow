import { useEffect, useId, useState } from "react"
import { CloudUpload, ImagePlus, UserRound, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { t, tr } from "@/i18n"

/** Réglages des deux usages Figma : photo de produit (`zone_de_depot`) et photo de profil. */
const VARIANTES = {
  produit: {
    types: ["image/png", "image/jpeg", "image/webp"],
    tailleMaxMo: 5,
    titre: "Cliquez pour ajouter une photo",
    aide: "PNG, JPG ou WEBP (max. 5 Mo)",
    erreurFormat: "Format non accepté : PNG, JPG ou WEBP.",
  },
  profil: {
    types: ["image/png", "image/jpeg"],
    tailleMaxMo: 2,
    titre: "Ajouter une photo",
    aide: "JPG, PNG · Max 2 Mo",
    erreurFormat: "Format non accepté : JPG ou PNG.",
  },
} as const

type ZoneDePhotoProps = {
  /** Fichier choisi (null = aucun nouveau fichier) */
  fichier: File | null
  onChange: (fichier: File | null) => void
  /** Photo déjà enregistrée (modification) */
  photoUrl?: string
  variante?: keyof typeof VARIANTES
  className?: string
}

/** Clic ou glisser-déposer, contrôle du format et de la taille, aperçu, retrait. */
export function ZoneDePhoto({ fichier, onChange, photoUrl, variante = "produit", className }: ZoneDePhotoProps) {
  const id = useId()
  const reglages = VARIANTES[variante]
  const profil = variante === "profil"
  const [erreur, setErreur] = useState<string | null>(null)
  const [survol, setSurvol] = useState(false)
  const [apercu, setApercu] = useState<string | null>(null)

  useEffect(() => {
    if (!fichier) return setApercu(null)
    const url = URL.createObjectURL(fichier)
    setApercu(url)
    return () => URL.revokeObjectURL(url)
  }, [fichier])

  const choisir = (f: File | undefined) => {
    if (!f) return
    if (!(reglages.types as readonly string[]).includes(f.type)) return setErreur(reglages.erreurFormat)
    if (f.size > reglages.tailleMaxMo * 1024 * 1024) return setErreur(t("Fichier trop lourd : {{v0}} Mo maximum.", { v0: reglages.tailleMaxMo }))
    setErreur(null)
    onChange(f)
  }

  const image = apercu ?? photoUrl

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSurvol(false)
          choisir(e.dataTransfer.files[0])
        }}
        className={cn(
          "relative flex h-[150px] flex-col items-center justify-center gap-2 overflow-hidden rounded-sm text-center transition-colors",
          profil ? "bg-accent/60" : "border border-dashed border-grid-line bg-card",
          survol && "border-primary bg-accent/40"
        )}
      >
        {image ? (
          <>
            <img
              src={image}
              alt={profil ? t("Aperçu de la photo de profil") : t("Aperçu de la photo du produit")}
              className={profil ? "size-24 rounded-full object-cover" : "size-full object-contain p-2"}
            />
            <Button
              variant="outline"
              aria-label={t("Retirer la photo")}
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 size-7 rounded-sm border-grid-line p-0"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <label htmlFor={id} className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 px-2">
            <span className="relative flex size-[42px] items-center justify-center rounded-full bg-accent text-primary">
              {profil ? <UserRound className="size-6" /> : <CloudUpload className="size-6" />}
              {profil && (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ImagePlus className="size-3" />
                </span>
              )}
            </span>
            <span className={cn("font-semibold", profil ? "text-[11px] text-primary" : "text-[13px]")}>{tr(reglages.titre)}</span>
            <span className={cn("text-muted-foreground", profil ? "text-[10px]" : "text-[11px]")}>{tr(reglages.aide)}</span>
          </label>
        )}
        <input
          id={id}
          type="file"
          accept={reglages.types.join(",")}
          className="sr-only"
          onChange={(e) => {
            choisir(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </div>
      {erreur && <p className="text-xs text-destructive">{tr(erreur)}</p>}
    </div>
  )
}
