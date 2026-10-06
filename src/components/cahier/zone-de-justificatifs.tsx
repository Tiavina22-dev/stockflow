import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from "react"
import { ImagePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

const TAILLE_MAX = 10 * 1024 * 1024
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"]

/** Photos du cahier papier (justificatifs) : glisser-déposer ou bouton, aperçus, suppression. */
export function ZoneDeJustificatifs({ photos, onChange }: { photos: File[]; onChange: (photos: File[]) => void }) {
  const id = useId()
  const champ = useRef<HTMLInputElement>(null)
  const [survol, setSurvol] = useState(false)

  const apercus = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos])
  useEffect(() => () => apercus.forEach((u) => URL.revokeObjectURL(u)), [apercus])

  const ajouter = (fichiers: FileList | null) => {
    if (!fichiers) return
    const refuses: string[] = []
    const acceptes = [...fichiers].filter((f) => {
      const ok = TYPES_ACCEPTES.includes(f.type) && f.size <= TAILLE_MAX
      if (!ok) refuses.push(f.name)
      return ok
    })
    if (refuses.length) notify("warning", t("Ignoré (JPG, PNG ou WEBP de 10 Mo max) : {{v0}}", { v0: refuses.join(", ") }))
    if (acceptes.length) onChange([...photos, ...acceptes])
  }

  const deposer = (e: DragEvent) => {
    e.preventDefault()
    setSurvol(false)
    ajouter(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          survol ? "border-primary bg-accent" : "border-grid-line bg-background"
        )}
      >
        <ImagePlus className="size-7 text-primary" />
        <p className="text-[13px] font-semibold">{t("Glissez ici les photos du cahier papier")}</p>
        <p className="text-xs text-muted-foreground">{t("JPG, PNG ou WEBP · 10 Mo max par photo · plusieurs photos possibles")}</p>
        <Button type="button" variant="outline" onClick={() => champ.current?.click()} className="mt-1 h-10 rounded-sm border-grid-line text-[13px]">
          {t("Choisir des photos")}
        </Button>
        <input
          ref={champ}
          id={id}
          type="file"
          accept={TYPES_ACCEPTES.join(",")}
          multiple
          className="sr-only"
          aria-label={t("Ajouter des photos du cahier")}
          onChange={(e) => {
            ajouter(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((photo, i) => (
            <li key={`${photo.name}-${i}`} className="group relative overflow-hidden rounded-lg border border-grid-line bg-card">
              <a href={apercus[i]} target="_blank" rel="noreferrer" title={photo.name}>
                <img src={apercus[i]} alt={t("Photo {{v0}} du cahier", { v0: i + 1 })} className="aspect-[3/4] w-full object-cover" />
              </a>
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                aria-label={t("Retirer {{v0}}", { v0: photo.name })}
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 rounded-full"
              >
                <X />
              </Button>
              <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{photo.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
