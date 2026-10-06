import type { ReactNode } from "react"
import { Boxes, Plus, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

type EmptyStateProps = {
  title: string
  description: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  /** Remplace le bouton par défaut (ex. plusieurs actions). */
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Boxes,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-[12px] border bg-surface p-6",
        className
      )}
    >
      <div className="flex w-full max-w-[320px] flex-col items-center gap-4 text-center">
        <div className="flex size-[72px] items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="size-8" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-base font-bold">{tr(title)}</p>
          <p className="text-[13px] leading-normal text-muted-foreground">{tr(description)}</p>
        </div>
        {action ??
          (actionLabel && (
            <Button size="xl" onClick={onAction} className="w-full text-xs">
              <Plus className="size-[18px]" />
              {tr(actionLabel)}
            </Button>
          ))}
      </div>
    </div>
  )
}
