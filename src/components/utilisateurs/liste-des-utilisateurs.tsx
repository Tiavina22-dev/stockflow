import { ActionsDeLigne } from "@/components/donnees/actions-de-ligne"
import { TableauDeDonnees, type ColonneDeTableau } from "@/components/donnees/tableau-de-donnees"
import { BadgeDeRole } from "@/components/utilisateurs/roles-et-permissions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { LigneDUtilisateur } from "@/types"
import { t, tr, formatDate } from "@/i18n"

const dateHeure = formatDate({ dateStyle: "short", timeStyle: "short" })

/** Initiales pour l'avatar (« Chloé Martin » → « CM »). */
export function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("")
}

type ListeDesUtilisateursProps = {
  lignes: LigneDUtilisateur[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onConsulter?: (u: LigneDUtilisateur) => void
  onModifier?: (u: LigneDUtilisateur) => void
  onChangerStatut?: (u: LigneDUtilisateur) => void
  onReinitialiserMotDePasse?: (u: LigneDUtilisateur) => void
  enChargement?: boolean
  erreur?: string | null
}

/** Figma : calque `liste_des_utilisateurs` — colonnes sur le tableau commun. */
export function ListeDesUtilisateurs({ onConsulter, onModifier, onChangerStatut, onReinitialiserMotDePasse, ...props }: ListeDesUtilisateursProps) {
  const colonnes: ColonneDeTableau<LigneDUtilisateur>[] = [
    {
      id: "utilisateur",
      libelle: "Utilisateur",
      largeur: 260,
      min: 160,
      cellule: (u) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-8 after:hidden">
            {u.photoUrl && <AvatarImage src={u.photoUrl} alt="" />}
            <AvatarFallback className="bg-accent text-[11px] font-semibold text-primary">{initiales(u.nom)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold">{u.nom}</span>
            <span className="truncate text-[11px] text-muted-foreground">{u.email}</span>
          </span>
        </span>
      ),
    },
    { id: "role", libelle: "Rôle", largeur: 170, min: 155, cellule: (u) => <BadgeDeRole role={u.role} /> },
    { id: "magasin", libelle: "Magasin", largeur: 180, min: 110, cellule: (u) => <span className="block truncate text-[13px]" title={tr(u.magasinNom)}>{tr(u.magasinNom)}</span> },
    {
      id: "statut",
      libelle: "Statut",
      largeur: 110,
      min: 90,
      cellule: (u) => (
        <span className={cn("flex items-center gap-1.5 text-[13px]", u.statut === "Actif" ? "text-success" : "text-destructive")}>
          <span className={cn("size-[7px] rounded-full", u.statut === "Actif" ? "bg-success" : "bg-destructive")} aria-hidden />
          {tr(u.statut)}
        </span>
      ),
    },
    {
      id: "activite",
      libelle: "Dernière activité",
      largeur: 160,
      min: 110,
      cellule: (u) => (
        <span className="text-xs text-muted-foreground tabular-nums">{u.derniereActivite ? dateHeure.format(new Date(u.derniereActivite)) : t("Jamais connecté")}</span>
      ),
    },
    { id: "permissions", libelle: "Permissions", largeur: 190, min: 110, cellule: (u) => <span className="block truncate text-xs text-muted-foreground" title={u.resumePermissions}>{u.resumePermissions}</span> },
    {
      id: "actions",
      libelle: "Actions",
      largeur: null,
      min: 128,
      alignement: "droite",
      cellule: (u) => (
        <ActionsDeLigne
          nom={u.nom}
          onConsulter={() => onConsulter?.(u)}
          onModifier={() => onModifier?.(u)}
          actions={[
            { libelle: "Réinitialiser le mot de passe", onClick: () => onReinitialiserMotDePasse?.(u) },
            { libelle: u.statut === "Actif" ? "Désactiver le compte" : "Réactiver le compte", onClick: () => onChangerStatut?.(u), danger: u.statut === "Actif" },
          ]}
        />
      ),
    },
  ]

  return (
    <TableauDeDonnees
      titre={t("Liste des utilisateurs")}
      colonnes={colonnes}
      cleDeLigne={(u) => u.id}
      libelleElements="utilisateurs"
      cleLargeurs="liste-des-utilisateurs"
      vide={{ titre: "Aucun utilisateur trouvé", description: "Modifiez la recherche ou les filtres." }}
      {...props}
    />
  )
}
