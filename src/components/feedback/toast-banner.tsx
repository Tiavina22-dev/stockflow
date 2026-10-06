import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

export type ToastTone = "success" | "warning" | "error"

const tones: Record<ToastTone, { label: string; banner: string; pill: string }> = {
  success: { label: "Succès", banner: "bg-success-muted", pill: "bg-success-accent text-success" },
  warning: { label: "Attention", banner: "bg-warning-muted", pill: "bg-warning-accent text-warning" },
  error: { label: "Erreur", banner: "bg-danger-muted", pill: "bg-danger-accent text-danger" },
}

type ToastBannerProps = {
  tone: ToastTone
  message: string
  className?: string
}

export function ToastBanner({ tone, message, className }: ToastBannerProps) {
  const { label, banner, pill } = tones[tone]
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex min-h-6 items-center gap-3 rounded-lg px-4 py-0.5", banner, className)}
    >
      <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", pill)}>
        {tr(label)}
      </span>
      <p className="flex-1 text-[13px]">{tr(message)}</p>
    </div>
  )
}
