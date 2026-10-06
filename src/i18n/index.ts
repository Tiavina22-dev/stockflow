import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import mg from "./mg.json"

/**
 * Traduction de l'interface (i18next). Le texte français sert de clé :
 * `t("Nouvelle vente")` → « Nouvelle vente » en français, « Varotra vaovao » en malgache (voir `mg.json`).
 * Une phrase absente de `mg.json` reste affichée en français.
 */
export type Langue = "fr" | "mg"

export const LANGUES: { value: Langue; libelle: string; description: string; intl: string }[] = [
  { value: "fr", libelle: "Français", description: "Interface en français", intl: "fr-FR" },
  { value: "mg", libelle: "Malagasy", description: "Interface amin'ny teny malagasy", intl: "mg-MG" },
]

const CLE_STOCKAGE = "stockflow.langue"

function langueEnregistree(): Langue {
  try {
    const l = localStorage.getItem(CLE_STOCKAGE)
    if (l === "fr" || l === "mg") return l
  } catch {
    /* stockage indisponible : français */
  }
  return "fr"
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: {} }, mg: { translation: mg } },
  lng: langueEnregistree(),
  fallbackLng: "fr",
  // Clés = phrases françaises : « . » et « : » ne sont pas des séparateurs
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})
document.documentElement.lang = i18n.language

/** Traduit une phrase française (avec `{{variables}}` éventuelles). */
export const t = (texte: string, valeurs?: Record<string, unknown>): string => (texte ? i18n.t(texte, valeurs) : texte)

export const langueActive = (): Langue => (i18n.language === "mg" ? "mg" : "fr")

/** Locale `Intl` de la langue active (dates : « Asabotsy 3 Oktobra 2026 »). */
export const localeIntl = () => LANGUES.find((l) => l.value === langueActive())!.intl

export function changerLangue(langue: Langue) {
  try {
    localStorage.setItem(CLE_STOCKAGE, langue)
  } catch {
    /* ignoré */
  }
  document.documentElement.lang = langue
  void i18n.changeLanguage(langue)
  // Recharge pour que les formats préparés au démarrage (dates, listes) suivent la nouvelle langue
  window.location.reload()
}

export default i18n

/**
 * Traduit une valeur venant d'une variable (libellé d'option, titre de colonne…) si c'est une phrase connue ;
 * tout le reste (noms de produits, nombres, éléments React) est rendu tel quel.
 */
export function tr<T>(valeur: T): T {
  return (typeof valeur === "string" && valeur ? i18n.t(valeur) : valeur) as T
}

const MOIS_MG = ["Janoary", "Febroary", "Martsa", "Aprily", "Mey", "Jona", "Jolay", "Aogositra", "Septambra", "Oktobra", "Novambra", "Desambra"]
const MOIS_COURTS_MG = ["Jan.", "Feb.", "Mar.", "Apr.", "Mey", "Jon.", "Jol.", "Aog.", "Sep.", "Okt.", "Nov.", "Des."]
const JOURS_MG = ["Alahady", "Alatsinainy", "Talata", "Alarobia", "Alakamisy", "Zoma", "Asabotsy"]
const JOURS_COURTS_MG = ["Alah.", "Alats.", "Tal.", "Alar.", "Alak.", "Zom.", "Asab."]

/**
 * Formateur de dates dans la langue active. Les navigateurs n'embarquent pas les noms malgaches
 * (repli silencieux sur une autre langue) : en malgache, jours et mois sont remplacés à partir des parties françaises.
 */
export function formatDate(options: Intl.DateTimeFormatOptions) {
  const fr = new Intl.DateTimeFormat("fr-FR", options)
  return {
    format(date: Date | number) {
      if (langueActive() !== "mg") return fr.format(date)
      const d = new Date(date)
      return fr
        .formatToParts(d)
        .map((p) => {
          if (p.type === "weekday") return (options.weekday === "long" ? JOURS_MG : JOURS_COURTS_MG)[d.getDay()]
          if (p.type === "month" && options.month !== "numeric" && options.month !== "2-digit") return (options.month === "long" ? MOIS_MG : MOIS_COURTS_MG)[d.getMonth()]
          if (p.type === "literal") return p.value.replace(/^ à /, " amin'ny ")
          return p.value
        })
        .join("")
    },
  }
}
