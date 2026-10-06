/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #13).
 * Aucune logique : recherche, filtres et pagination ne sont PAS appliqués.
 *   useResumeDesUtilisateurs()                    → AsyncState<ResumeDesUtilisateurs>
 *   useUtilisateurs(filtres)                      → AsyncState<Paginated<LigneDUtilisateur>>
 *   useUtilisateur(id)                            → AsyncState<UtilisateurSaisi>   (sans mot de passe)
 *   useEnregistrerUtilisateur()                   → (u: UtilisateurSaisi) => Promise<void>
 *   useChangerStatutUtilisateur()                 → (id, statut) => Promise<void>
 *   useReinitialiserMotDePasse()                  → (id) => Promise<void>
 */
import { PERMISSIONS_PAR_ROLE } from "@/components/utilisateurs/roles-et-permissions"
import type { AsyncState, FiltresDesUtilisateurs, LigneDUtilisateur, Paginated, ResumeDesUtilisateurs, UtilisateurSaisi } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })
const il = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const utilisateurs: LigneDUtilisateur[] = [
  { id: "u1", nom: "Chloé Martin", email: "chloe.martin@stockflow.fr", role: "Responsable", magasinNom: "Paris · République", statut: "Actif", derniereActivite: il(4), resumePermissions: "Ventes, Stock, Produits, Rapports" },
  { id: "u2", nom: "Hugo Bernard", email: "hugo.bernard@stockflow.fr", role: "Vendeur", magasinNom: "Paris · République", statut: "Actif", derniereActivite: il(38), resumePermissions: "Ventes, Stock (lecture)" },
  { id: "u3", nom: "Inès Petit", email: "ines.petit@stockflow.fr", role: "Gestionnaire de stock", magasinNom: "Lyon · Part-Dieu", statut: "Actif", derniereActivite: il(125), resumePermissions: "Stock, Produits" },
  { id: "u4", nom: "Karim Diallo", email: "karim.diallo@stockflow.fr", role: "Vendeur", magasinNom: "Marseille · Vieux-Port", statut: "Inactif", derniereActivite: il(60 * 24 * 12), resumePermissions: "Ventes" },
  { id: "u5", nom: "Léa Rakoto", email: "lea.rakoto@stockflow.fr", role: "Assistant vente", magasinNom: "Paris · Bastille", statut: "Actif", derniereActivite: il(60 * 5), resumePermissions: "Ventes (création)" },
  { id: "u6", nom: "Marc Lefèvre", email: "marc.lefevre@stockflow.fr", role: "Administrateur", magasinNom: "Tous les magasins", statut: "Actif", derniereActivite: null, resumePermissions: "Toutes" },
]

export function useResumeDesUtilisateursProvisoire(): AsyncState<ResumeDesUtilisateurs> {
  return pret({
    utilisateursActifs: 5,
    utilisateursActifsDetail: "+1 ce mois-ci",
    administrateurs: 1,
    administrateursDetail: "Accès complet",
    magasinsCouverts: 4,
    magasinsCouvertsDetail: "Sur 4 magasins",
    comptesInactifs: 1,
    comptesInactifsDetail: "À vérifier",
  })
}

export function useUtilisateursProvisoires(filtres: FiltresDesUtilisateurs): AsyncState<Paginated<LigneDUtilisateur>> {
  return pret({ items: utilisateurs.slice(0, filtres.pageSize), total: utilisateurs.length, page: filtres.page, pageSize: filtres.pageSize })
}

export function utilisateurSaisiProvisoire(id: string): UtilisateurSaisi | undefined {
  const u = utilisateurs.find((x) => x.id === id)
  if (!u) return undefined
  return {
    utilisateurId: u.id,
    nomComplet: u.nom,
    email: u.email,
    telephone: "",
    identifiant: u.email.split("@")[0],
    role: u.role,
    magasinId: u.magasinNom === "Tous les magasins" ? null : "paris-republique",
    motDePasse: "",
    statut: u.statut,
    permissions: structuredClone(PERMISSIONS_PAR_ROLE[u.role]),
    photo: null,
    photoUrl: u.photoUrl,
  }
}

export function enregistrerUtilisateurProvisoire(_u: UtilisateurSaisi): Promise<void> {
  return Promise.resolve()
}
