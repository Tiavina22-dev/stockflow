import type { ReactElement } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { t, tr } from "@/i18n"

type ConfirmContent = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

/** Panneau de confirmation du kit (en-tête 56 px, corps, deux actions 48 px). */
export function ConfirmPanel({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
  className,
}: ConfirmContent & {
  onConfirm?: () => void
  onCancel?: () => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-col rounded-[12px] border bg-surface", className)}>
      <div className="flex h-14 items-center justify-between border-b px-5">
        <p className="text-sm font-bold">{tr(title)}</p>
        <Button
          variant="outline"
          aria-label={t("Fermer")}
          onClick={onCancel}
          className="h-8 rounded-md px-3 text-xs"
        >
          ×
        </Button>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <p className="text-[13px] leading-normal">{tr(message)}</p>
        <div className="flex gap-3">
          <Button variant="outline" size="xl" onClick={onCancel} className="flex-1 text-xs">
            {tr(cancelLabel)}
          </Button>
          <Button size="xl" onClick={onConfirm} className="flex-1 text-xs">
            {tr(confirmLabel)}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Vraie fenêtre modale (shadcn Dialog) habillée comme le panneau du kit. */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
}: ConfirmContent & {
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onConfirm?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-[12px] border bg-surface p-0 ring-0 shadow-card sm:max-w-[560px]"
      >
        <div className="flex h-14 items-center justify-between border-b px-5">
          <DialogTitle className="text-sm font-bold">{tr(title)}</DialogTitle>
          <DialogClose
            render={<Button variant="outline" className="h-8 rounded-md px-3 text-xs" />}
            aria-label={t("Fermer")}
          >
            ×
          </DialogClose>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <DialogDescription className="text-[13px] leading-normal text-foreground">
            {tr(message)}
          </DialogDescription>
          <div className="flex gap-3">
            <DialogClose render={<Button variant="outline" size="xl" className="flex-1 text-xs" />}>
              {tr(cancelLabel)}
            </DialogClose>
            <DialogClose
              render={<Button size="xl" className="flex-1 text-xs" />}
              onClick={onConfirm}
            >
              {tr(confirmLabel)}
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
