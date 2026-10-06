import { Badge } from "@/components/ui/badge"
import type { Status } from "@/types"

const variantByStatus = {
  Validé: "success",
  "En attente": "warning",
  "Stock faible": "warning",
  Faible: "warning",
  Annulé: "danger",
  Rupture: "danger",
} as const satisfies Record<Status, "success" | "warning" | "danger">

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant={variantByStatus[status]} className={className}>
      {status}
    </Badge>
  )
}
