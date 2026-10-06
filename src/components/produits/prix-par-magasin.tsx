import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState } from "react"
import { Plus, Store, X } from "lucide-react"

import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { Button } from "@/components/ui/button"
import { ChampNombre } from "@/components/forms/champ-nombre"
import { t } from "@/i18n"
import { notify } from "@/lib/notify"
import type { PrixParMagasin as Prix, Store as Magasin } from "@/types"


type Brouillon = { cle: string; magasinId: string | null; magasinNom: string; prixDeVente: number | null; nouvelle: boolean }

const versBrouillon = (prix: Prix[]): Brouillon[] => prix.map((p) => ({ cle: p.magasinId, ...p, nouvelle: false }))
const identiques = (a: Brouillon[], b: Brouillon[]) =>
  a.length === b.length && a.every((l, i) => l.magasinId === b[i].magasinId && l.prixDeVente === b[i].prixDeVente)

/**
 * Figma : panneau « Prix de vente par magasin » de `detail_du_produit_prix_par_magasin` (node 238:25981).
 * Le brouillon repart de `prix` à chaque nouvelle valeur : la page donne une `key` qui change après enregistrement.
 */
export function PrixParMagasin({
  prix,
  draft,
  magasins,
  onEnregistrer,
}: {
  prix: Prix[]
  draft?: LocalDraft
  /** Tous les magasins, pour « Ajouter » */
  magasins: Magasin[]
  onEnregistrer: (prix: Prix[], expected?: Prix[]) => Promise<void>
}) {
  const initial = versBrouillon(prix)
  const [baseline] = useDraftState(draft, "baseline", prix)
  const [lignes, setLignes] = useDraftState(draft, "lignes", initial)
  const [enregistrement, setEnregistrement] = useState(false)
  const [verifier, setVerifier] = useState(false)
  const modifie = !identiques(lignes, initial)
  const libres = magasins.filter((m) => !lignes.some((l) => l.magasinId === m.id))

  const changer = (cle: string, m: Partial<Brouillon>) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...m } : l)))

  const enregistrer = async () => {
    setVerifier(true)
    if (lignes.some((l) => !l.magasinId || !l.prixDeVente)) {
      notify("error", t("Choisissez un magasin et saisissez un prix de vente pour chaque ligne."))
      return
    }
    setEnregistrement(true)
    try {
      await onEnregistrer(lignes.map((l) => ({ magasinId: l.magasinId!, magasinNom: l.magasinNom, prixDeVente: l.prixDeVente })), baseline)
      notify("success", t("Prix de vente enregistrés."))
    } catch (e) {
      notify("error", e instanceof Error ? e.message : t("L’enregistrement a échoué."))
    } finally {
      setEnregistrement(false)
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-grid-line bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <Store className="size-6" />
        </span>
        <h2 className="text-lg font-bold">{t("Prix de vente par magasin")}</h2>
        <Button
          variant="outline"
          disabled={libres.length === 0}
          title={libres.length === 0 ? t("Tous les magasins ont déjà un prix.") : undefined}
          onClick={() => setLignes((ls) => [...ls, { cle: `nouvelle-${Date.now()}`, magasinId: null, magasinNom: "", prixDeVente: null, nouvelle: true }])}
          className="ml-auto h-11 gap-2 rounded-sm border-grid-line px-4 text-[13px] font-bold text-primary"
        >
          <Plus className="size-4" />
          {t("Ajouter")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("Définissez le prix de vente de ce produit pour chaque magasin.")}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px] [&_td,&_th]:border [&_td,&_th]:border-muted-foreground/25 [&_td]:px-3 [&_td]:py-2 [&_th]:bg-background [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-center [&_th]:text-xs [&_th]:font-semibold">
          <thead>
            <tr>
              <th className="w-14">#</th>
              <th className="w-[44%]">{t("Magasin")}</th>
              <th>{t("Prix de vente (Ar)")}</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6! text-center text-muted-foreground">
                  {t("Aucun prix défini : cliquez sur « Ajouter ».")}
                </td>
              </tr>
            )}
            {lignes.map((l, i) => (
              <tr key={l.cle} className="h-16 even:bg-background/50">
                <td className="text-center tabular-nums">{i + 1}</td>
                <td className="font-bold">
                  {l.nouvelle ? (
                    <SelectAvecIcone
                      aria-label={t("Magasin de la ligne {{v0}}", { v0: i + 1 })}
                      aria-invalid={verifier && !l.magasinId}
                      placeholder={t("Choisir un magasin…")}
                      options={[...(l.magasinId ? magasins.filter((m) => m.id === l.magasinId) : []), ...libres].map((m) => ({ value: m.id, label: m.name }))}
                      valeur={l.magasinId}
                      onChange={(id) => changer(l.cle, { magasinId: id, magasinNom: magasins.find((m) => m.id === id)?.name ?? "" })}
                      className="font-normal [&_[data-slot=select-trigger]]:h-12!"
                    />
                  ) : (
                    l.magasinNom
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <ChampNombre
                      aria-label={t("Prix de vente à {{v0}}", { v0: l.magasinNom || i + 1 })}
                      aria-invalid={verifier && !l.prixDeVente}
                      placeholder="0"
                      valeur={l.prixDeVente === null ? "" : String(l.prixDeVente)}
                      onChange={(v) => changer(l.cle, { prixDeVente: v === "" ? null : Number(v.slice(0, 12)) })}
                      className="h-12 max-w-[300px] rounded-sm border-grid-line px-4 text-sm tabular-nums md:text-sm"
                    />
                    {l.nouvelle && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("Retirer la ligne {{v0}}", { v0: i + 1 })}
                        onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}
                        className="size-10 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          disabled={!modifie || enregistrement}
          onClick={() => {
            setLignes(initial)
            setVerifier(false)
          }}
          className="h-12 w-[132px] rounded-sm border-grid-line text-sm font-bold text-primary"
        >
          {t("Annuler")}
        </Button>
        <Button disabled={!modifie || enregistrement} onClick={enregistrer} className="h-12 w-[154px] rounded-sm text-sm font-bold">
          {enregistrement ? t("Enregistrement…") : t("Enregistrer")}
        </Button>
      </div>
    </section>
  )
}
