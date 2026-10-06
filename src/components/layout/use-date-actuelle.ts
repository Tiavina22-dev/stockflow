import { useEffect, useState } from "react"
import { formatDate } from "@/i18n"

/** Date/heure courantes rafraîchies toutes les 30 s, formatées comme dans Figma. */
export function useDateActuelle() {
  const [maintenant, setMaintenant] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setMaintenant(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return {
    maintenant,
    dateActuelle: formaterDate(maintenant),
    heureActuelle: formaterHeure(maintenant),
  }
}

// « Mer. 30 sept. »
function formaterDate(date: Date) {
  const jour = formatDate({ weekday: "short" }).format(date)
  const jourMois = formatDate({ day: "numeric", month: "short" }).format(date)
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${jourMois}`
}

// « 14:42 »
function formaterHeure(date: Date) {
  return formatDate({ hour: "2-digit", minute: "2-digit" }).format(date)
}
