import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** En-tête de board du kit (pastille, titre, description, version). */
export function KitBoardHeader({
  eyebrow,
  title,
  description,
  version,
  updatedAt,
}: {
  eyebrow: string
  title: string
  description: string
  version: string
  updatedAt: string
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-[760px] flex-col gap-2">
        <span className="w-fit rounded-full bg-accent px-2.5 py-1.5 text-[10px] leading-none font-bold text-primary uppercase">
          {eyebrow}
        </span>
        <h1 className="text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-end gap-1 text-xs">
        <p className="font-bold">{version}</p>
        <p className="text-muted-foreground">{updatedAt}</p>
      </div>
    </header>
  )
}

/** Famille de composants numérotée (« 05 Carte KPI »). */
export function KitFamily({
  index,
  title,
  description,
  children,
  className,
}: {
  index: string
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-primary">
          {index}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

/** Carte blanche avec titre et description (Tableau, Modal, Tabs…). */
export function KitCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-card", className)}>
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

/** Libellé de variante au-dessus d’un exemple (Default, Focus…). */
export function VariantLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold">{children}</p>
}
