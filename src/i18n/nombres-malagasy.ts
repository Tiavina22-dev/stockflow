/**
 * Nombres en toutes lettres en malgache (aucune bibliothèque npm ne couvre le malgache).
 * Lecture des petites unités vers les grandes : 1 234 → « efatra amby telopolo sy roanjato sy arivo ».
 * Liaison : « ambin'ny » entre l'unité et 10, « amby » après le premier terme, puis « sy ».
 */
const UNITES = ["", "iray", "roa", "telo", "efatra", "dimy", "enina", "fito", "valo", "sivy"]
const DIZAINES = ["", "folo", "roapolo", "telopolo", "efapolo", "dimampolo", "enimpolo", "fitopolo", "valopolo", "sivifolo"]
const CENTAINES = ["", "zato", "roanjato", "telonjato", "efajato", "dimanjato", "eninjato", "fitonjato", "valonjato", "sivinjato"]

/** Termes d'un entier < 1 000 000, des unités vers les centaines de mille. */
function termesSousLeMillion(n: number): string[] {
  const chiffre = (rang: number) => Math.floor(n / 10 ** rang) % 10
  const termes: string[] = []
  if (chiffre(0)) termes.push(UNITES[chiffre(0)])
  if (chiffre(1)) termes.push(DIZAINES[chiffre(1)])
  if (chiffre(2)) termes.push(CENTAINES[chiffre(2)])
  if (chiffre(3)) termes.push(chiffre(3) === 1 ? "arivo" : `${UNITES[chiffre(3)]} arivo`)
  if (chiffre(4)) termes.push(`${UNITES[chiffre(4)]} alina`)
  if (chiffre(5)) termes.push(`${UNITES[chiffre(5)]} hetsy`)
  return termes
}

/** Entier positif en lettres. */
export function entierEnMalagasy(n: number): string {
  if (n === 0) return "aotra"
  const termes = termesSousLeMillion(n % 1_000_000)
  const millions = Math.floor(n / 1_000_000)
  if (millions) termes.push(`${entierEnMalagasy(millions)} tapitrisa`)
  if (termes.length === 1) return termes[0]
  // « iray » devient « iraika » quand il est suivi d'une liaison (21 : iraika amby roapolo)
  if (termes[0] === "iray") termes[0] = "iraika"
  const liaison = termes[1] === "folo" && n % 100 < 20 && n % 10 !== 0 ? "ambin'ny" : "amby"
  return `${termes[0]} ${liaison} ${termes.slice(1).join(" sy ")}`
}

/** Nombre (avec décimales éventuelles, « faingo ») en lettres. */
export function nombreEnMalagasy(valeur: number): string {
  const [entier, decimales] = Math.abs(valeur).toFixed(2).split(".")
  const texte = entierEnMalagasy(Number(entier))
  const centimes = Number(decimales)
  const avecDecimales = centimes ? `${texte} faingo ${entierEnMalagasy(Number(decimales.replace(/0+$/, "")))}` : texte
  return valeur < 0 ? `latsaka ${avecDecimales}` : avecDecimales
}
