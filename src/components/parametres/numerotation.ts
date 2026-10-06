import type { FormatDeNumero } from "@/types"

/** AAAA = année, MM = mois, N = chiffre du compteur. */
export const FORMATS_DE_NUMERO: { value: FormatDeNumero; label: string }[] = [
  { value: "AAAA-NNNNN", label: "AAAA-NNNNN" },
  { value: "AAAAMM-NNNN", label: "AAAAMM-NNNN" },
  { value: "NNNNNN", label: "NNNNNN (compteur seul)" },
]

/** Aperçu affiché sous les champs, ex. « VTE-2026-00125 » (affichage seulement : la logique attribue les numéros). */
export function apercuDuNumero(prefixe: string, format: FormatDeNumero, prochain: number, date = new Date()) {
  const annee = String(date.getFullYear())
  const mois = String(date.getMonth() + 1).padStart(2, "0")
  const compteur = (chiffres: number) => String(Math.max(0, prochain)).padStart(chiffres, "0")
  const corps = format === "AAAA-NNNNN" ? `${annee}-${compteur(5)}` : format === "AAAAMM-NNNN" ? `${annee}${mois}-${compteur(4)}` : compteur(6)
  return prefixe.trim() ? `${prefixe.trim()}-${corps}` : corps
}
