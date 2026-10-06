import type { TonPastille } from "@/components/donnees/pastille-etat"
import type { StatutDeVente } from "@/types"

/** Couleur de la pastille pour chaque statut de vente (liste, détail, cahier). */
export const TON_PAR_STATUT_DE_VENTE: Record<StatutDeVente, TonPastille> = {
  Validée: "succes",
  "En attente": "alerte",
  Annulée: "danger",
}
