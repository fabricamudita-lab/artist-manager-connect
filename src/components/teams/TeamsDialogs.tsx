import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { InviteTeamMemberDialog } from '@/components/InviteTeamMemberDialog';
import { AddTeamContactDialog } from '@/components/AddTeamContactDialog';
import { TeamMemberActivityDialog } from '@/components/TeamMemberActivityDialog';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { EditContactDialog } from '@/components/EditContactDialog';
import { ContactProfileSheet } from '@/components/ContactProfileSheet';
import { TeamManagerSheet } from '@/components/TeamManagerSheet';
import { CategoryManagerSheet } from '@/components/CategoryManagerSheet';
import { ContactDashboardDialog } from '@/components/ContactDashboardDialog';
import { ArtistInfoDialog } from '@/components/ArtistInfoDialog';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';

interface TeamsDialogsProps {
  // Invite
  workspaceId: string | null;
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (open: boolean) => void;
  onMemberInvited: () => void;
  // Add contact
  addContactDialogOpen: boolean;
  setAddContactDialogOpen: (open: boolean) => void;
  onContactAdded: () => void;
  customCategories: Array<{ value: string; label: string; icon: any; isCustom: boolean }>;
  onAddCustomCategory: (cat: { value: string; label: string }) => void;
  selectedArtistId: string;
  // Edit contact
  editingContact: any;
  setEditingContact: (c: any) => void;
  onContactUpdated: () => void;
  // Activity
  activityMember: any;
  setActivityMember: (m: any) => void;
  // Contact profile
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;
  contactRefreshTrigger: number;
  onEditContact: (contactId: string) => void;
  onProfileSheetClose: () => void;
  // Create/Edit team
  createTeamDialogOpen: boolean;
  setCreateTeamDialogOpen: (open: boolean) => void;
  onTeamCreated: () => void;
  editTeamDialogOpen: boolean;
  setEditTeamDialogOpen: (open: boolean) => void;
  editingTeamId: string | null;
  setEditingTeamId: (id: string | null) => void;
  editingTeamData?: { name: string; stage_name?: string | null; description?: string | null };
  onTeamEdited: () => void;
  // Team Manager
  teamManagerOpen: boolean;
  setTeamManagerOpen: (open: boolean) => void;
  teams: Array<{ id: string; name: string; stageName?: string | null; avatarUrl?: string | null; memberCount: number; description?: string | null }>;
  onCreateNewTeam: () => void;
  onEditTeam: (teamId: string) => void;
  onDuplicateTeam: (teamId: string) => void;
  onDeleteTeam: (teamId: string) => void;
  onReorderTeams: (orderedIds: string[]) => void;
  // Category Manager
  categoryManagerOpen: boolean;
  setCategoryManagerOpen: (open: boolean) => void;
  categoryCounts: Map<string, number>;
  onCreateCategory: (name: string) => void;
  onRenameCategory: (value: string, newLabel: string) => void;
  onDeleteCategory: (value: string) => void;
  onReorderCategories: (orderedValues: string[]) => void;
  // Dashboard
  dashboardOpen: boolean;
  setDashboardOpen: (open: boolean) => void;
  dashboardProfiles: any[];
  restoredProfiles: any[] | null;
  setRestoredProfiles: (p: any[] | null) => void;
  // Artist info
  artistInfoDialog: { open: boolean; artistId: string | null };
  setArtistInfoDialog: (d: { open: boolean; artistId: string | null }) => void;
  // Functional role
  editingMemberRole: { memberId: string; userId: string; name: string; currentRole?: string; mirrorContactId?: string } | null;
  setEditingMemberRole: (m: any) => void;
  newFunctionalRole: string;
  setNewFunctionalRole: (r: string) => void;
  onUpdateFunctionalRole: () => void;
}

export function TeamsDialogs(props: TeamsDialogsProps) {
  return (
    <>
      <ContactDashboardDialog
        open={props.dashboardOpen}
        onOpenChange={(open) => {
          props.setDashboardOpen(open);
          if (!open) props.setRestoredProfiles(null);
        }}
        profiles={props.restoredProfiles || props.dashboardProfiles}
      />

      {props.workspaceId && (
        <InviteTeamMemberDialog
          open={props.inviteDialogOpen}
          onOpenChange={props.setInviteDialogOpen}
          workspaceId={props.workspaceId}
          onMemberInvited={props.onMemberInvited}
        />
      )}

      <AddTeamContactDialog
        open={props.addContactDialogOpen}
        onOpenChange={props.setAddContactDialogOpen}
        onContactAdded={props.onContactAdded}
        customCategories={props.customCategories}
        onAddCustomCategory={props.onAddCustomCategory}
        defaultArtistId={props.selectedArtistId !== 'all' ? props.selectedArtistId : undefined}
      />

      {props.editingContact && (
        <EditContactDialog
          open={!!props.editingContact}
          onOpenChange={(open) => !open && props.setEditingContact(null)}
          contact={props.editingContact}
          customCategories={props.customCategories}
          onContactUpdated={props.onContactUpdated}
        />
      )}

      <TeamMemberActivityDialog
        open={!!props.activityMember}
        onOpenChange={(open) => !open && props.setActivityMember(null)}
        member={props.activityMember}
      />

      <ContactProfileSheet
        open={!!props.selectedContactId}
        onOpenChange={(open) => {
          if (!open) props.onProfileSheetClose();
        }}
        contactId={props.selectedContactId || ''}
        refreshTrigger={props.contactRefreshTrigger}
        onEdit={props.onEditContact}
      />

      <CreateTeamDialog
        open={props.createTeamDialogOpen}
        onOpenChange={props.setCreateTeamDialogOpen}
        onSuccess={props.onTeamCreated}
      />

      <EditTeamDialog
        open={props.editTeamDialogOpen}
        onOpenChange={props.setEditTeamDialogOpen}
        teamId={props.editingTeamId}
        initialData={props.editingTeamData}
        onSuccess={props.onTeamEdited}
      />

      <TeamManagerSheet
        open={props.teamManagerOpen}
        onOpenChange={props.setTeamManagerOpen}
        teams={props.teams}
        onCreateNew={props.onCreateNewTeam}
        onEdit={props.onEditTeam}
        onDuplicate={props.onDuplicateTeam}
        onDelete={props.onDeleteTeam}
        onReorder={props.onReorderTeams}
      />

      <CategoryManagerSheet
        open={props.categoryManagerOpen}
        onOpenChange={props.setCategoryManagerOpen}
        systemCategories={TEAM_CATEGORIES}
        customCategories={props.customCategories}
        categoryCounts={props.categoryCounts}
        onCreateNew={props.onCreateCategory}
        onRename={props.onRenameCategory}
        onDelete={props.onDeleteCategory}
        onReorder={props.onReorderCategories}
      />

      <ArtistInfoDialog
        artistId={props.artistInfoDialog.artistId}
        open={props.artistInfoDialog.open}
        onOpenChange={(open) => props.setArtistInfoDialog({ open, artistId: open ? props.artistInfoDialog.artistId : null })}
      />

      <Dialog open={!!props.editingMemberRole} onOpenChange={(open) => !open && props.setEditingMemberRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar rol funcional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Define el rol funcional para <strong>{props.editingMemberRole?.name}</strong>. Este rol se mostrará en lugar del rol de workspace y se usará al añadir a presupuestos.
            </p>
            <div className="space-y-2">
              <Label>Rol funcional</Label>
              <Input
                value={props.newFunctionalRole}
                onChange={(e) => props.setNewFunctionalRole(e.target.value)}
                placeholder="Ej: Business Manager, Director Artístico, Booker..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setEditingMemberRole(null)}>Cancelar</Button>
            <Button onClick={props.onUpdateFunctionalRole} disabled={!props.newFunctionalRole.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
