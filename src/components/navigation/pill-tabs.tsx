import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

export type PillTab = { value: string; label: string; content: ReactNode }

type PillTabsProps = {
  tabs: PillTab[]
  defaultValue?: string
  className?: string
}

/** Onglets du kit : boutons 44 px, l’onglet actif est plein (bleu). */
export function PillTabs({ tabs, defaultValue = tabs[0]?.value, className }: PillTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className={cn("gap-4", className)}>
      <TabsList className="flex-wrap gap-2 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-11 flex-none rounded-lg border-input bg-card px-4 text-[13px] font-normal text-foreground hover:bg-muted/60 data-active:border-primary data-active:bg-primary data-active:font-bold data-active:text-primary-foreground group-data-[variant=default]/tabs-list:data-active:shadow-none"
          >
            {tr(tab.label)}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="flex flex-col gap-3 rounded-lg border bg-surface p-4"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
