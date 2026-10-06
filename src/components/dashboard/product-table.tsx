import { t, tr } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { useState } from "react"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ProductRow } from "@/types"

type ProductTableProps = {
  rows: ProductRow[]
  pageSize?: number
  onView?: (row: ProductRow) => void
  className?: string
}


// Séparateurs verticaux entre colonnes (sauf la dernière)
const cellDivider = "border-r border-grid-line last:border-r-0"

export function ProductTable({ rows, pageSize = 3, onView, className }: ProductTableProps) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const start = current * pageSize
  const visible = rows.slice(start, start + pageSize)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              {[
                ["Produit", "w-[136px]"],
                ["Qté", "w-[92px]"],
                ["Valeur", "w-[92px]"],
                ["Statut", "w-[122px]"],
                ["Action", ""],
              ].map(([label, width]) => (
                <TableHead
                  key={label}
                  className={cn(
                    "h-auto px-4 py-0 text-[10px] font-bold text-muted-foreground uppercase",
                    width,
                    cellDivider
                  )}
                >
                  {tr(label)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id}>
                <TableCell className={cn("px-4 py-0", cellDivider)}>{row.name}</TableCell>
                <TableCell className={cn("px-4 py-0 tabular-nums", cellDivider)}>{row.quantity}</TableCell>
                <TableCell className={cn("px-4 py-0 tabular-nums", cellDivider)}>
                  {ariary.format(row.value)}
                </TableCell>
                <TableCell className={cn("px-4 py-0", cellDivider)}>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="px-4 py-0">
                  <Button
                    variant="outline"
                    className="h-8 rounded-md px-3 text-xs"
                    onClick={() => onView?.(row)}
                  >
                    {t("Voir")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {rows.length === 0
            ? t("0 ligne")
            : t("{{v0}}–{{v1}} sur {{v2}} lignes", { v0: start + 1, v1: start + visible.length, v2: rows.length })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            {t("Préc.")}
          </Button>
          <Button size="md" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
            {t("Suiv.")}
          </Button>
        </div>
      </div>
    </div>
  )
}
