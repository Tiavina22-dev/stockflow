/** Hauteur d'un graphique : normale dans la carte, presque tout l'écran en plein écran. */
export function hauteurDeGraphique(pleinEcran: boolean, normale: number) {
  if (!pleinEcran) return normale
  const hauteurFenetre = typeof window === "undefined" ? 800 : window.innerHeight
  return Math.max(normale, hauteurFenetre - 190)
}
