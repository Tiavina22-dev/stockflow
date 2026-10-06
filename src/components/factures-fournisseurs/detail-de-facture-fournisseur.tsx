import type { ReactNode } from "react"
import { Eye, FileText, Package, Paperclip, Pencil, Tag, type LucideIcon } from "lucide-react"

import { dateDeFacture, TON_PAR_STATUT_DE_FACTURE } from "@/components/factures-fournisseurs/liste-des-factures-fournisseurs"
import { ariary } from "@/components/donnees/montants"
import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { Button } from "@/components/ui/button"
import { t, tr } from "@/i18n"
import type { DetailDeFactureFournisseur as Detail } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : panneau « Détails de la facture » de `factures_fournisseurs` (node 238:25345). */
export function DetailDeFactureFournisseur({
  facture,
  onModifier,
  onValider,
  validationEnCours = false,
  prixAVerifier = 0,
  onPrixAVerifier,
}: {
  facture: Detail
  onModifier: () => void
  /** Absent : bouton « Valider » masqué */
  onValider?: () => void
  validationEnCours?: boolean
  /** Nombre de nouveaux prix détectés en attente ; 0 = bouton masqué */
  prixAVerifier?: number
  onPrixAVerifier?: () => void
}) {
  const total = facture.lignes.reduce((s, l) => s + l.quantite * l.prixFournisseur, 0)

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-grid-line bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <Pictogramme icone={FileText} />
        <h2 className="text-lg font-bold">{t("Détails de la facture")}</h2>
        <div className="ml-auto flex gap-3">
          {prixAVerifier > 0 && onPrixAVerifier && (
            <Button variant="outline" onClick={onPrixAVerifier} className="h-11 gap-2 rounded-sm border-caution/50 bg-caution-muted px-5 text-[13px] font-bold text-caution hover:bg-caution-muted/70">
              <Tag className="size-4" />
              {t("Prix à vérifier")}
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-caution px-1.5 text-[11px] text-white tabular-nums">{prixAVerifier}</span>
            </Button>
          )}
          <Button variant="outline" onClick={onModifier} className="h-11 gap-2 rounded-sm border-grid-line px-5 text-[13px] font-bold text-primary">
            <Pencil className="size-4" />
            {t("Voir / Modifier")}
          </Button>
          {onValider && (
            <Button onClick={onValider} disabled={validationEnCours} className="h-11 rounded-sm px-5 text-[13px] font-bold">
              {validationEnCours ? t("Validation…") : t("Valider")}
            </Button>
          )}
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">{t("Informations et produits de la facture sélectionnée.")}</p>

      {/* informations_de_facture */}
      <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-3 lg:grid-cols-5 [&>div]:flex [&>div]:flex-col [&>div]:gap-1.5 [&>div]:px-4 lg:[&>div:not(:last-child)]:border-r lg:[&>div]:border-grid-line">
        <Information terme="N° facture">{facture.numero}</Information>
        <Information terme="Fournisseur">{facture.fournisseurNom}</Information>
        <Information terme="Date">{dateDeFacture(facture.date)}</Information>
        <Information terme="Référence">{facture.reference || "—"}</Information>
        <div>
          <dt className="text-xs text-muted-foreground">{t("Statut")}</dt>
          <dd>
            <PastilleEtat ton={TON_PAR_STATUT_DE_FACTURE[facture.statut]} libelle={tr(facture.statut)} className="h-[26px] text-xs font-bold" />
          </dd>
        </div>
      </dl>

      {/* contenu_de_facture */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Bloc icone={Package} titre="Produits de la facture">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px] [&_td,&_th]:border [&_td,&_th]:border-muted-foreground/25 [&_th]:bg-background [&_th]:px-3 [&_th]:py-2 [&_th]:text-center [&_th]:text-xs [&_th]:font-semibold [&_td]:px-3 [&_td]:py-2">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>{t("Produit")}</th>
                  <th>{t("Référence")}</th>
                  <th>{t("Qté")}</th>
                  <th>{t("Prix fournisseur (Ar)")}</th>
                  <th>{t("Total (Ar)")}</th>
                </tr>
              </thead>
              <tbody>
                {facture.lignes.map((l, i) => (
                  <tr key={l.id}>
                    <td className="text-center tabular-nums">{i + 1}</td>
                    <td className="font-semibold">{l.produitNom}</td>
                    <td>{l.reference}</td>
                    <td className="text-right tabular-nums">{nombre.format(l.quantite)}</td>
                    <td className="text-right tabular-nums">{nombre.format(l.prixFournisseur)}</td>
                    <td className="text-right tabular-nums">{nombre.format(l.quantite * l.prixFournisseur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-baseline justify-end gap-5 font-bold">
            <span className="text-base">{t("Total")}</span>
            <span className="text-xl tabular-nums">{ariary.format(total)}</span>
          </p>
        </Bloc>

        <Bloc icone={Paperclip} titre="Facture jointe">
          {facture.pieceJointe ? (
            <div className="flex gap-3">
              <img
                src={facture.pieceJointe.apercuUrl ?? facture.pieceJointe.url}
                alt=""
                className="h-[172px] w-[144px] shrink-0 rounded-sm border border-grid-line bg-background object-cover"
              />
              <div className="flex min-w-0 flex-col gap-2">
                <p className="truncate text-[13px] font-bold" title={facture.pieceJointe.nom}>
                  {facture.pieceJointe.nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {facture.pieceJointe.type} • {nombre.format(facture.pieceJointe.tailleKo)} Ko
                </p>
                <Button variant="outline" render={<a href={facture.pieceJointe.url} target="_blank" rel="noreferrer" />} className="h-11 w-fit gap-2 rounded-sm border-grid-line px-5 text-[13px] font-bold text-primary">
                  <Eye className="size-4" />
                  {t("Voir")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-sm border border-dashed border-grid-line py-5 text-center text-[13px] text-muted-foreground">{t("Aucun fichier joint.")}</p>
          )}
        </Bloc>
      </div>
    </section>
  )
}

function Pictogramme({ icone: Icone }: { icone: LucideIcon }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
      <Icone className="size-6" />
    </span>
  )
}

function Information({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{t(terme)}</dt>
      <dd className="truncate text-base font-bold">{children}</dd>
    </div>
  )
}

function Bloc({ icone, titre, children }: { icone: LucideIcon; titre: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-grid-line p-3">
      <div className="flex items-center gap-3">
        <Pictogramme icone={icone} />
        <h3 className="text-lg font-bold">{tr(titre)}</h3>
      </div>
      {children}
    </div>
  )
}
