import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t, tr } from "@/i18n"
import { useState } from "react"
import { AtSign, Mail, Phone, ShieldCheck, Store as StoreIcon, UserPlus, UserRound, X } from "lucide-react"

import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { ChampAvecIcone, ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { ChampMotDePasse } from "@/components/forms/champ-mot-de-passe"
import { SelectAvecIcone, type OptionAvecIcone } from "@/components/forms/select-avec-icone"
import { ZoneDePhoto } from "@/components/forms/zone-de-photo"
import { MODULES_DE_PERMISSION, PERMISSIONS_PAR_ROLE, ROLES } from "@/components/utilisateurs/roles-et-permissions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ActionDePermission, ModuleDePermission, RoleUtilisateur, Store, StatutUtilisateur, UtilisateurSaisi } from "@/types"

const TOUS_LES_MAGASINS = "__tous__"

const optionsStatut: OptionAvecIcone<StatutUtilisateur>[] = [
  { value: "Actif", label: "Actif", rendu: <PastilleEtat libelle={t("Actif")} ton="succes" className="h-auto bg-transparent px-0 text-[13px] text-foreground" /> },
  { value: "Inactif", label: "Inactif", rendu: <PastilleEtat libelle={t("Inactif")} ton="danger" className="h-auto bg-transparent px-0 text-[13px] text-foreground" /> },
]

const vide = (role: RoleUtilisateur): UtilisateurSaisi => ({
  nomComplet: "",
  email: "",
  telephone: "",
  identifiant: "",
  role,
  magasinId: null,
  motDePasse: "",
  statut: "Actif",
  permissions: structuredClone(PERMISSIONS_PAR_ROLE[role]),
  photo: null,
})

type UtilisateurFenetreProps = {
  draft?: LocalDraft
  open: boolean
  onOpenChange: (open: boolean) => void
  magasins: Store[]
  /** Mode modification : utilisateur prérempli */
  utilisateurAModifier?: UtilisateurSaisi
  onSoumettre: (utilisateur: UtilisateurSaisi) => void
}

/** Figma : `nouvel_utilisateur` (node 90:2727) — création et modification d'un utilisateur. */
export function UtilisateurFenetre({ open, onOpenChange, ...props }: UtilisateurFenetreProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-lg p-0 shadow-card ring-0 sm:max-w-[800px]">
        {open && <Formulaire key={props.utilisateurAModifier?.utilisateurId ?? "nouvel"} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

type Erreurs = Partial<Record<"nomComplet" | "email" | "identifiant" | "motDePasse" | "confirmation", string>>

function Formulaire({ draft, magasins, utilisateurAModifier, onSoumettre }: Omit<UtilisateurFenetreProps, "open" | "onOpenChange">) {
  const enModification = utilisateurAModifier !== undefined
  const [profil, setU] = useDraftState<UtilisateurSaisi>(draft, "u", () => utilisateurAModifier ?? vide("Vendeur"))
  const [motDePasse, setMotDePasse] = useState("")
  const u = { ...profil, motDePasse }
  const [confirmation, setConfirmation] = useState("")
  const [erreurs, setErreurs] = useState<Erreurs>({})

  const modifier = <K extends keyof UtilisateurSaisi>(champ: K, valeur: UtilisateurSaisi[K]) => {
    if (champ === "motDePasse") setMotDePasse(String(valeur))
    else setU((actuel) => ({ ...actuel, [champ]: valeur }))
    setErreurs((e) => ({ ...e, [champ]: undefined }))
  }
  const changerRole = (role: RoleUtilisateur) =>
    // Le rôle propose ses permissions par défaut (modifiables ensuite)
    setU((actuel) => ({ ...actuel, role, permissions: structuredClone(PERMISSIONS_PAR_ROLE[role]) }))
  const basculerPermission = (module: ModuleDePermission, action: ActionDePermission, coche: boolean) =>
    setU((actuel) => {
      const actions = actuel.permissions[module].filter((a) => a !== action)
      return { ...actuel, permissions: { ...actuel.permissions, [module]: coche ? [...actions, action] : actions } }
    })

  const soumettre = () => {
    const e: Erreurs = {}
    if (!u.nomComplet.trim()) e.nomComplet = "Le nom est obligatoire."
    if (u.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim())) e.email = "Adresse e-mail invalide."
    if (!u.identifiant.trim()) e.identifiant = "L’identifiant est obligatoire."
    if (!enModification || u.motDePasse) {
      if (u.motDePasse.length < 12) e.motDePasse = "12 caractères minimum."
      else if (u.motDePasse !== confirmation) e.confirmation = "Les mots de passe ne correspondent pas."
    }
    setErreurs(e)
    if (Object.keys(e).length > 0) return
    onSoumettre({ ...u, nomComplet: u.nomComplet.trim(), email: u.email.trim(), identifiant: u.identifiant.trim(), telephone: u.telephone.trim() })
  }

  return (
    <div className="flex max-h-[calc(100svh-2rem)] flex-col">
      {/* en_tete */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-grid-line px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
            <UserPlus className="size-6" />
          </span>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl font-bold">{enModification ? t("Modifier l’utilisateur") : t("Nouvel utilisateur")}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {enModification ? t("Mettez à jour ses informations et son accès.") : t("Ajoutez un membre et définissez son accès.")}
            </DialogDescription>
          </div>
        </div>
        <DialogClose render={<Button variant="outline" aria-label={t("Fermer")} className="size-8 rounded-sm border-grid-line p-0" />}>
          <X className="size-4" />
        </DialogClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
        {/* identite */}
        <div className="grid gap-4 md:grid-cols-[150px_1fr_1fr]">
          <div className="flex flex-col gap-1.5 md:row-span-4">
            <span className="text-[13px] font-semibold">{t("Photo de profil")}</span>
            <ZoneDePhoto variante="profil" fichier={u.photo} photoUrl={u.photoUrl} onChange={(f) => modifier("photo", f)} />
          </div>
          <ChampDeFormulaire id="u-nom" libelle={t("Nom complet")} obligatoire erreur={erreurs.nomComplet}>
            <ChampAvecIcone id="u-nom" icone={UserRound} value={u.nomComplet} onChange={(e) => modifier("nomComplet", e.target.value)} placeholder={t("Ex : Chloé Martin")} aria-invalid={!!erreurs.nomComplet} autoComplete="name" />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-email" libelle={t("Email")} obligatoire erreur={erreurs.email}>
            <ChampAvecIcone id="u-email" icone={Mail} type="email" value={u.email} onChange={(e) => modifier("email", e.target.value)} placeholder={t("nom@entreprise.com")} aria-invalid={!!erreurs.email} autoComplete="email" />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-telephone" libelle={t("Téléphone (optionnel)")}>
            <ChampAvecIcone id="u-telephone" icone={Phone} type="tel" value={u.telephone} onChange={(e) => modifier("telephone", e.target.value)} placeholder="+33 6 12 34 56 78" autoComplete="tel" />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-identifiant" libelle={t("Identifiant")} obligatoire erreur={erreurs.identifiant}>
            <ChampAvecIcone id="u-identifiant" icone={AtSign} value={u.identifiant} onChange={(e) => modifier("identifiant", e.target.value)} placeholder={t("Ex : chloe.martin")} aria-invalid={!!erreurs.identifiant} autoComplete="username" />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-role" libelle={t("Rôle")} obligatoire>
            <SelectAvecIcone id="u-role" icone={ShieldCheck} options={ROLES.map((r) => ({ value: r, label: r }))} valeur={u.role} onChange={changerRole} />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-magasin" libelle={t("Magasin")}>
            <SelectAvecIcone
              id="u-magasin"
              icone={StoreIcon}
              options={[{ value: TOUS_LES_MAGASINS, label: "Tous les magasins" }, ...magasins.map((m) => ({ value: m.id, label: m.name }))]}
              valeur={u.magasinId ?? TOUS_LES_MAGASINS}
              onChange={(v) => modifier("magasinId", v === TOUS_LES_MAGASINS ? null : v)}
            />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-mdp" libelle={enModification ? t("Nouveau mot de passe") : t("Mot de passe")} obligatoire={!enModification} erreur={erreurs.motDePasse}>
            <ChampMotDePasse id="u-mdp" value={u.motDePasse} onChange={(e) => modifier("motDePasse", e.target.value)} placeholder={enModification ? t("Laisser vide pour ne pas changer") : t("12 caractères minimum")} aria-invalid={!!erreurs.motDePasse} />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="u-confirmation" libelle={t("Confirmer le mot de passe")} obligatoire={!enModification} erreur={erreurs.confirmation}>
            <ChampMotDePasse
              id="u-confirmation"
              value={confirmation}
              onChange={(e) => {
                setConfirmation(e.target.value)
                setErreurs((er) => ({ ...er, confirmation: undefined }))
              }}
              placeholder={t("Retapez le mot de passe")}
              aria-invalid={!!erreurs.confirmation}
            />
          </ChampDeFormulaire>
        </div>

        <ChampDeFormulaire id="u-statut" libelle={t("Statut")} className="md:w-[calc(50%-8px)]">
          <SelectAvecIcone id="u-statut" icone={ShieldCheck} iconeSimple options={optionsStatut} valeur={u.statut} onChange={(v) => modifier("statut", v)} />
        </ChampDeFormulaire>

        {/* permissions */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-base font-bold">{t("Permissions")}</legend>
          <p className="text-xs text-muted-foreground">{t("Sélectionnez les permissions à accorder à cet utilisateur.")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES_DE_PERMISSION.map(({ module, libelle, icone: Icone, actions }) => (
              <div key={module} className="flex flex-col gap-2.5 rounded-lg border border-grid-line p-3">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="flex size-7 items-center justify-center rounded-sm bg-accent text-primary">
                    <Icone className="size-4" />
                  </span>
                  {tr(libelle)}
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  {actions.map(({ action, libelle: libelleAction }) => {
                    const id = `perm-${module}-${action}`
                    return (
                      <label key={action} htmlFor={id} className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <Checkbox
                          id={id}
                          checked={u.permissions[module].includes(action)}
                          onCheckedChange={(coche) => basculerPermission(module, action, coche === true)}
                        />
                        {libelleAction}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      {/* actions */}
      <div className="flex h-[72px] shrink-0 items-center justify-end gap-3 border-t border-grid-line px-6">
        <DialogClose render={<Button variant="outline" className="h-10 w-[104px] rounded-sm border-grid-line text-[13px] font-semibold" />}>{t("Annuler")}</DialogClose>
        <Button onClick={soumettre} className="h-10 gap-2 rounded-sm px-5 text-[13px] font-semibold">
          <UserPlus className="size-4" />
          {enModification ? t("Enregistrer les modifications") : t("Enregistrer l’utilisateur")}
        </Button>
      </div>
    </div>
  )
}
