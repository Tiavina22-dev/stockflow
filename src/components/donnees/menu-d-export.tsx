import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { FormatDExport } from "@/types"
import { t } from "@/i18n"

/** Bouton « Exporter » + choix du format (Rapports, Historique). */
export function MenuDExport({
  onExporter,
  variante = "default",
  className,
}: {
  onExporter: (format: FormatDExport) => void
  /** `outline` : bouton blanc (Figma `historique_des_operations`) */
  variante?: "default" | "outline"
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={variante}
            className={cn("h-10 gap-2 rounded-sm px-3.5 text-[13px]", variante === "default" ? "font-semibold" : "border-grid-line font-normal", className)}
          />
        }
      >
        <Download className="size-4" />
        {t("Exporter")}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onExporter("pdf")}>
          <FileText /> {t("Document PDF")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExporter("excel")}>
          <FileSpreadsheet /> {t("Classeur Excel")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExporter("csv")}>
          <FileSpreadsheet /> {t("Fichier CSV")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
