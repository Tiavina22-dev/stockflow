import { toast } from "sonner"

import { ToastBanner, type ToastTone } from "@/components/feedback/toast-banner"

/** Affiche un toast aux couleurs du kit via sonner (le <Toaster /> est monté dans App). */
export function notify(tone: ToastTone, message: string) {
  toast.custom(() => (
    <ToastBanner tone={tone} message={message} className="w-[356px] py-3 shadow-card" />
  ))
}