import { useState, type ReactNode } from "react"
import { ChevronDown, PackageCheck } from "lucide-react"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { ProductTable } from "@/components/dashboard/product-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ConfirmDialog, ConfirmPanel } from "@/components/feedback/confirm-dialog"
import { EmptyState } from "@/components/feedback/empty-state"
import { ToastBanner, type ToastTone } from "@/components/feedback/toast-banner"
import { StoreSelect } from "@/components/forms/store-select"
import { KitBoardHeader, KitCard, KitFamily, VariantLabel } from "@/components/kit/kit-layout"
import { PillTabs } from "@/components/navigation/pill-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"
import type { ProductRow, Status } from "@/types"

const series = [10, 12, 11, 15, 17, 16, 20, 23, 22, 26]
const stores = [
  { id: "paris", name: "Paris · République" },
  { id: "lyon", name: "Lyon · Part-Dieu" },
  { id: "bordeaux", name: "Bordeaux · Saint-Jean" },
]
const statuses: Status[] = ["Validé", "En attente", "Annulé", "Stock faible", "Rupture"]

const products: ProductRow[] = [
  { id: "1", name: "Café noir 250g", quantity: 128, value: 1280, status: "Validé" },
  { id: "2", name: "Thé vert 100g", quantity: 42, value: 420, status: "Faible" },
  { id: "3", name: "Sucre bio 500g", quantity: 0, value: 0, status: "Rupture" },
  { id: "4", name: "Chocolat noir 70%", quantity: 64, value: 512, status: "Validé" },
  { id: "5", name: "Miel de fleurs", quantity: 12, value: 168, status: "Faible" },
  { id: "6", name: "Riz basmati 1kg", quantity: 90, value: 315, status: "Validé" },
  { id: "7", name: "Huile d’olive 75cl", quantity: 38, value: 494, status: "Validé" },
  { id: "8", name: "Pâtes complètes", quantity: 0, value: 0, status: "Rupture" },
  { id: "9", name: "Farine T65", quantity: 75, value: 97, status: "Validé" },
  { id: "10", name: "Lentilles vertes", quantity: 8, value: 26, status: "Faible" },
  { id: "11", name: "Sel de Guérande", quantity: 54, value: 162, status: "Validé" },
  { id: "12", name: "Confiture fraise", quantity: 33, value: 132, status: "Validé" },
]

const toasts: { tone: ToastTone; message: string }[] = [
  { tone: "success", message: "Le produit a bien été ajouté." },
  { tone: "warning", message: "Vérifiez le stock avant l’envoi." },
  { tone: "error", message: "L’opération a échoué." },
]

export function AdvancedKitPage() {
  const [store, setStore] = useState<string | null>(stores[0].id)
  const [focusValue, setFocusValue] = useState("Café noir 250g")
  const [errorValue, setErrorValue] = useState("SKU inconnu")
  const [viewed, setViewed] = useState<ProductRow | null>(null)

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 p-6 lg:p-12">
      <KitBoardHeader
        eyebrow="UI Kit · Avancé"
        title="Composants avancés"
        description="Variantes, états et composants métier complémentaires du kit."
        version="Version 1.0"
        updatedAt="30 septembre 2026"
      />

      <KitFamily index="05" title="Carte KPI" description="Indicateurs métier avec variantes de tendance et de contenu.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2">
          <Kpi value="12 840 Ar" trend={2.1} series={series} />
          <Kpi value="18 920 Ar" trend={12.8} series={series} />
          <Kpi value="9 450 Ar" trend={-4.2} series={series} tone="warning" />
          <Kpi value="6 120 Ar" trend={-18.4} series={series} tone="danger" />
          <Kpi value="128 450 Ar" trend={8.4} series={series} />
          <Kpi value="128 450 Ar" trend={8.4} />
        </div>
      </KitFamily>

      <KitFamily index="06" title="Boutons" description="Actions primaires, secondaires, de danger et désactivées.">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Button size="xl">Primary</Button>
          <Button size="xl" variant="outline">Secondary</Button>
          <Button size="xl" variant="destructive">Danger</Button>
          <Button size="xl" disabled>Disabled</Button>
        </div>
      </KitFamily>

      <KitFamily index="07" title="Inputs" description="États de saisie pour les champs de formulaire.">
        <div className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Default" htmlFor="in-default">
            <Input id="in-default" placeholder="Nom, SKU ou code-barres" />
          </Field>
          <Field label="Focus" htmlFor="in-focus">
            <Input
              id="in-focus"
              value={focusValue}
              onChange={(e) => setFocusValue(e.target.value)}
              className="border-primary ring-3 ring-ring/15"
            />
          </Field>
          <Field label="Error" htmlFor="in-error">
            <Input
              id="in-error"
              value={errorValue}
              onChange={(e) => setErrorValue(e.target.value)}
              aria-invalid
              aria-describedby="in-error-msg"
            />
            <p id="in-error-msg" className="text-[10px] text-destructive">
              Vérifiez le code-barres.
            </p>
          </Field>
          <Field label="Disabled" htmlFor="in-disabled">
            <Input id="in-disabled" placeholder="Lecture seule" disabled />
          </Field>
        </div>
      </KitFamily>

      <KitFamily index="08" title="Select" description="Sélecteurs fermés, ouverts et désactivés.">
        <div className="grid items-start gap-2 md:grid-cols-3 xl:w-3/4">
          <Field label="Default">
            <StoreSelect stores={stores} value={store} onValueChange={setStore} />
          </Field>
          <Field label="Open">
            {/* Aperçu statique de l’état ouvert ; le vrai menu s’ouvre au clic dans « Default ». */}
            <div className="flex h-[52px] items-center justify-between rounded-lg border border-primary bg-card px-4 text-sm">
              {stores[0].name}
              <ChevronDown className="size-3.5 text-primary" />
            </div>
            <ul className="overflow-hidden rounded-lg border bg-card text-sm shadow-card">
              {stores.map((s) => (
                <li key={s.id} className="flex h-11 items-center px-4">{s.name}</li>
              ))}
            </ul>
          </Field>
          <Field label="Disabled">
            <StoreSelect stores={stores} value={null} placeholder="Magasin bloqué" disabled />
          </Field>
        </div>
      </KitFamily>

      <KitFamily index="09" title="Badges" description="Étiquettes de statut pour les lignes de données.">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </KitFamily>

      <KitFamily index="10" title="Composants essentiels" description="Tableau, modal, onglets, toast et empty state.">
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <KitCard title="Tableau" description="Vue de liste avec colonnes, actions et pagination.">
            <ProductTable rows={products} onView={setViewed} />
          </KitCard>

          <KitCard title="Modal / fenêtre" description="Fenêtre contextuelle pour confirmer une action.">
            <ConfirmPanel
              title="Confirmer le transfert"
              message="Voulez-vous confirmer le transfert de 12 unités vers le magasin de Lyon ?"
              onConfirm={() => notify("success", "Transfert confirmé.")}
              onCancel={() => notify("warning", "Transfert annulé.")}
            />
          </KitCard>

          <KitCard title="Tabs / onglets" description="Navigation entre vues dans un même contexte.">
            <PillTabs
              tabs={[
                { value: "overview", label: "Vue d’ensemble", content: <TabSummary view="Vue d’ensemble" /> },
                { value: "inventories", label: "Inventaires", content: <TabSummary view="Inventaires" /> },
                { value: "history", label: "Historique", content: <TabSummary view="Historique" /> },
              ]}
            />
          </KitCard>

          <KitCard title="Toast / notification" description="Feedback rapide pour les actions utilisateur.">
            <div className="flex flex-col gap-3">
              {toasts.map((t) => (
                <button
                  key={t.tone}
                  type="button"
                  onClick={() => notify(t.tone, t.message)}
                  className="rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  title="Afficher ce toast"
                >
                  <ToastBanner tone={t.tone} message={t.message} />
                </button>
              ))}
            </div>
          </KitCard>
        </div>

        <KitCard title="Empty state" description="Écran vide avec appel à l’action pour démarrer.">
          <EmptyState
            title="Aucun produit trouvé"
            description="Ajoutez votre premier produit pour commencer à gérer votre stock."
            actionLabel="Ajouter un produit"
            onAction={() => notify("success", "Le produit a bien été ajouté.")}
          />
        </KitCard>
      </KitFamily>

      <ConfirmDialog
        open={viewed !== null}
        onOpenChange={(open) => !open && setViewed(null)}
        title="Confirmer le transfert"
        message={`Voulez-vous transférer « ${viewed?.name ?? ""} » vers le magasin de Lyon ?`}
        onConfirm={() => notify("success", "Transfert confirmé.")}
      />
    </div>
  )
}

function Kpi(props: { value: string; trend: number; series?: number[]; tone?: "warning" | "danger" }) {
  return (
    <KpiCard
      size="compact"
      icon={PackageCheck}
      title="Valeur du stock"
      subtitle="Tous les produits · aujourd’hui"
      trendLabel="vs. mois dernier"
      {...props}
    />
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor}>
          <VariantLabel>{label}</VariantLabel>
        </label>
      ) : (
        <VariantLabel>{label}</VariantLabel>
      )}
      {children}
    </div>
  )
}

function TabSummary({ view }: { view: string }) {
  return (
    <>
      <p className="text-[13px] leading-normal">Vue active : {view}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="success">12 produits</Badge>
        <Badge variant="warning">2 faibles</Badge>
        <Badge variant="danger">1 rupture</Badge>
      </div>
    </>
  )
}
