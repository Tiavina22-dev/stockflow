import { useState, type ReactNode } from "react"
import { Calculator, ClipboardList, FileText, Scale, ShoppingCart, Trash2, Upload, type LucideIcon } from "lucide-react"

import { montantDeSynthese } from "@/components/cahier/liste-des-cahiers"
import { PastilleEtat, type TonPastille } from "@/components/donnees/pastille-etat"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { formatDate, t, tr } from "@/i18n"
import { cn } from "@/lib/utils"
import type { DetailDuCahier as Detail, StatutDeCahier } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const jour = formatDate({ day: "2-digit", month: "2-digit", year: "numeric" })

export const TON_PAR_STATUT_DE_CAHIER: Record<StatutDeCahier, TonPastille> = { Validé: "succes", Brouillon: "neutre", Annulé: "danger" }

/** Figma : panneau « Détail du cahier » de `depenses_et_versements_consultables` (node 238:26224). */
export function DetailDuCahier({ cahier, onSupprimerDepense }: { cahier: Detail; onSupprimerDepense?: (depenseId: string) => void }) {
  const [apercu, setApercu] = useState<Detail["justificatifs"][number] | null>(null)
  const reste = cahier.totalVentes - cahier.depenses

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-grid-line bg-card p-5 shadow-card">
      {/* en_tete_du_cahier */}
      <div className="flex items-center gap-4">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <FileText className="size-7" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="flex flex-wrap items-center gap-3 text-xl font-bold">
            {t("Détail du cahier")} <span className="text-primary">{cahier.numero}</span>
            <PastilleEtat ton={TON_PAR_STATUT_DE_CAHIER[cahier.statut]} libelle={tr(cahier.statut)} className="h-[26px] text-xs font-bold" />
          </h2>
          <p className="text-sm text-muted-foreground">
            {jour.format(new Date(`${cahier.date}T12:00:00`))} • {cahier.magasinNom} • {t("Saisi par {{v0}}", { v0: cahier.saisiPar })}
          </p>
        </div>
      </div>

      {/* synthese_et_informations */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3 sm:grid-cols-3">
          <Synthese icone={ShoppingCart} fond="bg-accent" couleur="text-primary" libelle="Total ventes" valeur={montantDeSynthese(cahier.totalVentes)} />
          <Synthese icone={ClipboardList} fond="bg-danger-muted" couleur="text-destructive" libelle="Dépenses" valeur={montantDeSynthese(cahier.depenses)} />
          <Synthese icone={Calculator} fond="bg-success-muted" couleur="text-success" libelle="Reste (ventes - dépenses)" valeur={montantDeSynthese(reste)} />
          <Synthese icone={Upload} fond="bg-accent" couleur="text-primary" libelle="Versement" valeur={montantDeSynthese(cahier.versement)} className="sm:col-span-2" />
          <Synthese
            icone={Scale}
            fond={cahier.ecart !== null && cahier.ecart < 0 ? "bg-danger-muted" : "bg-success-muted"}
            couleur={cahier.ecart !== null && cahier.ecart < 0 ? "text-destructive" : "text-success"}
            libelle="Écart"
            valeur={cahier.ecart === null ? "—" : `${cahier.ecart > 0 ? "+" : ""}${montantDeSynthese(cahier.ecart)}`}
          />
        </div>

        {/* informations_du_cahier */}
        <div className="flex flex-col gap-3 rounded-lg border border-grid-line p-4">
          <h3 className="text-base font-bold">{t("Informations du cahier")}</h3>
          <dl className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-2.5 text-[13px]">
            <dt className="text-muted-foreground">{t("N° de cahier")}</dt>
            <dd>{cahier.identifiant}</dd>
            <dt className="text-muted-foreground">{t("Magasin")}</dt>
            <dd>{cahier.magasinNom}</dd>
            <dt className="text-muted-foreground">{t("Statut")}</dt>
            <dd>
              <PastilleEtat ton={TON_PAR_STATUT_DE_CAHIER[cahier.statut]} libelle={tr(cahier.statut)} className="h-[26px] text-xs font-bold" />
            </dd>
          </dl>
        </div>
      </div>

      {/* depenses_et_justificatifs */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.67fr)_minmax(0,1fr)]">
        <Bloc icone={ClipboardList} titre="Dépenses du jour" compteur={t("({{v0}} lignes)", { v0: cahier.depensesDuJour.length })}>
          {cahier.depensesDuJour.length === 0 ? (
            <p className="rounded-sm border border-dashed border-grid-line py-5 text-center text-[13px] text-muted-foreground">{t("Aucune dépense pour cette journée.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px] [&_td,&_th]:border [&_td,&_th]:border-muted-foreground/25 [&_th]:bg-background [&_th]:px-3 [&_th]:py-2 [&_th]:text-center [&_th]:text-xs [&_th]:font-semibold [&_td]:px-3 [&_td]:py-2">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>{t("Libellé")}</th>
                    <th>{t("Montant (Ar)")}</th>
                    <th>{t("Note")}</th>
                    {onSupprimerDepense && <th className="w-20">{t("Actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {cahier.depensesDuJour.map((d, i) => (
                    <tr key={d.id}>
                      <td className="text-center tabular-nums">{i + 1}</td>
                      <td className="font-semibold">{tr(d.libelle)}</td>
                      <td className="tabular-nums">{nombre.format(d.montant)}</td>
                      <td className="text-muted-foreground">{d.note || "—"}</td>
                      {onSupprimerDepense && (
                        <td className="text-center">
                          <Button variant="ghost" size="icon-sm" aria-label={t("Supprimer la dépense {{v0}}", { v0: tr(d.libelle) })} onClick={() => onSupprimerDepense(d.id)} className="text-destructive hover:bg-danger-muted">
                            <Trash2 />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="flex gap-6 text-[13px]">
            <span className="text-muted-foreground">{t("Total dépenses")}</span>
            <span className="font-bold text-primary tabular-nums">{montantDeSynthese(cahier.depenses)}</span>
          </p>
        </Bloc>

        <Bloc icone={FileText} titre="Justificatifs" compteur={t("({{v0}} fichiers)", { v0: cahier.justificatifs.length })}>
          {cahier.justificatifs.length === 0 ? (
            <p className="rounded-sm border border-dashed border-grid-line py-5 text-center text-[13px] text-muted-foreground">{t("Aucun justificatif joint.")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {cahier.justificatifs.map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => setApercu(j)} className="group flex w-full flex-col gap-1.5 text-left" aria-label={t("Agrandir {{v0}}", { v0: j.nom })}>
                    <img src={j.url} alt="" className="aspect-[248/132] w-full rounded-sm border border-grid-line bg-background object-cover transition group-hover:brightness-95" />
                    <span className="truncate text-xs text-muted-foreground">{j.nom}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Bloc>
      </div>

      <Dialog open={apercu !== null} onOpenChange={(o) => !o && setApercu(null)}>
        <DialogContent className="max-w-[min(96vw,1100px)] p-3 sm:max-w-[min(96vw,1100px)]">
          <DialogTitle className="truncate pr-8 text-sm">{apercu?.nom}</DialogTitle>
          {apercu && <img src={apercu.url} alt={apercu.nom} className="max-h-[80svh] w-full rounded-sm object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Synthese({ icone: Icone, fond, couleur, libelle, valeur, className }: { icone: LucideIcon; fond: string; couleur: string; libelle: string; valeur: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-sm border border-grid-line p-3", className)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-sm", fond, couleur)}>
        <Icone className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[13px] text-muted-foreground">{tr(libelle)}</span>
        <span className={cn("truncate text-xl font-bold tabular-nums", couleur)}>{valeur}</span>
      </span>
    </div>
  )
}

function Bloc({ icone: Icone, titre, compteur, children }: { icone: LucideIcon; titre: string; compteur: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-grid-line p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <Icone className="size-5" />
        </span>
        <h3 className="text-lg font-bold">{tr(titre)}</h3>
        <span className="text-[13px] text-muted-foreground">{compteur}</span>
      </div>
      {children}
    </div>
  )
}
