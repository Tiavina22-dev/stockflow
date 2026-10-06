import { toCardinal } from "n2words/fr-FR"

import { langueActive } from "@/i18n"
import { nombreEnMalagasy } from "@/i18n/nombres-malagasy"

/**
 * Formats d'affichage des montants en ariary (Ar), seule devise du logiciel.
 * Les données restent des nombres bruts : l'UI formate (voir AGENTS.md §3).
 */
const montant = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const ariary = { format: (valeur: number) => `${montant.format(valeur)} Ar` }

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 })
const signe = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, signDisplay: "exceptZero" })

/** Axes de graphiques : « 1,2 M Ar », « 450 k Ar ». */
export const ariaryCompact = { format: (valeur: number) => `${compact.format(valeur)} Ar` }

/** Écarts : « +1 250 Ar », « −300 Ar ». */
export const ariarySigne = { format: (valeur: number) => `${signe.format(valeur)} Ar` }

/**
 * Montant en toutes lettres : français avec n2words, malgache avec `nombreEnMalagasy`,
 * ex. 455000 → « Quatre cent cinquante-cinq mille ariary ».
 */
export function montantEnLettres(valeur: number): string {
  const lettres =
    langueActive() === "mg"
      ? `${nombreEnMalagasy(valeur)} ariary`
      : `${valeur < 0 ? "moins " : ""}${toCardinal(Math.round(Math.abs(valeur) * 100) / 100)} ariary`
  return lettres.charAt(0).toUpperCase() + lettres.slice(1)
}
