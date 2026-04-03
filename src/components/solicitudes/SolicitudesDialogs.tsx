import React from 'react';
import { CreateSolicitudDialog } from '@/components/CreateSolicitudDialog';
import { CreateSolicitudFromTemplateDialog } from '@/components/CreateSolicitudFromTemplateDialog';
import { EditSolicitudDialog } from '@/components/EditSolicitudDialog';
import { SolicitudDetailsDialog } from '@/components/SolicitudDetailsDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { StatusCommentDialog } from '@/components/StatusCommentDialog';
import { ScheduleEncounterDialog } from '@/components/ScheduleEncounterDialog';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import AssociateProjectDialog from '@/components/AssociateProjectDialog';
import { SolicitudesExport } from '@/components/SolicitudesExport';
import { ResponseTemplates } from '@/components/ResponseTemplates';
import { ApprovalAvailabilityDialog } from '@/components/ApprovalAvailabilityDialog';
import { SolicitudesBulkActions } from '@/components/SolicitudesBulkActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Solicitud {
  id: string;
  tipo: string;
  nombre_solicitante: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  fecha_creacion: string;
  fecha_actualizacion: string;
  created_by: string;
  artist_id?: string;
  ciudad?: string;
  medio?: string;
  lugar_concierto?: string;
  [key: string]: any;
}

interface SolicitudesDialogsProps {
  // Create
  showCreateDialog: boolean;
  setShowCreateDialog: (open: boolean) => void;
  showTemplateDialog: boolean;
  setShowTemplateDialog: (open: boolean) => void;
  // Edit
  showEditDialog: boolean;
  setShowEditDialog: (open: boolean) => void;
  selectedSolicitud: Solicitud | null;
  // Details
  showDetailsDialog: boolean;
  setShowDetailsDialog: (open: boolean) => void;
  selectedSolicitudForDetails: Solicitud | null;
  // Delete
  deleteDialog: { open: boolean; solicitudId: string; nombre: string };
  setDeleteDialog: (d: { open: boolean; solicitudId: string; nombre: string }) => void;
  onDelete: () => void;
  // Status
  statusDialog: { open: boolean; solicitudId: string; newStatus: 'aprobada' | 'denegada' | 'pendiente' };
  setStatusDialog: (d: any) => void;
  onConfirmStatusChange: (comment: string) => void;
  // Encounter
  encuentroDialog: { open: boolean; solicitud: Solicitud | null };
  setEncuentroDialog: (d: { open: boolean; solicitud: Solicitud | null }) => void;
  // Project
  associateDialog: { open: boolean; solicitud: Solicitud | null };
  setAssociateDialog: (d: { open: boolean; solicitud: Solicitud | null }) => void;
  createProjectForSolicitud: { open: boolean; solicitud: Solicitud | null };
  setCreateProjectForSolicitud: (d: { open: boolean; solicitud: Solicitud | null }) => void;
  // Export
  showExportDialog: boolean;
  setShowExportDialog: (open: boolean) => void;
  solicitudes: Solicitud[];
  // Templates
  showResponseTemplates: boolean;
  setShowResponseTemplates: (open: boolean) => void;
  // Availability
  availabilityDialog: {
    open: boolean;
    solicitudId: string;
    bookingId: string | null;
    bookingName: string;
    hasAvailability: boolean;
    unavailableMembers: string[];
    comment: string;
  };
  setAvailabilityDialog: (d: any) => void;
  // Bulk
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  // Callbacks
  onRefresh: () => void;
  onCelebration: () => void;
  userId?: string;
}

export function SolicitudesDialogs({
  showCreateDialog, setShowCreateDialog,
  showTemplateDialog, setShowTemplateDialog,
  showEditDialog, setShowEditDialog, selectedSolicitud,
  showDetailsDialog, setShowDetailsDialog, selectedSolicitudForDetails,
  deleteDialog, setDeleteDialog, onDelete,
  statusDialog, setStatusDialog, onConfirmStatusChange,
  encuentroDialog, setEncuentroDialog,
  associateDialog, setAssociateDialog,
  createProjectForSolicitud, setCreateProjectForSolicitud,
  showExportDialog, setShowExportDialog, solicitudes,
  showResponseTemplates, setShowResponseTemplates,
  availabilityDialog, setAvailabilityDialog,
  selectedIds, setSelectedIds,
  onRefresh, onCelebration, userId,
}: SolicitudesDialogsProps) {
  return (
    <>
      <CreateSolicitudDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSolicitudCreated={onRefresh} />
      <CreateSolicitudFromTemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} onSuccess={onRefresh} />

      {selectedSolicitud && (
        <EditSolicitudDialog solicitud={selectedSolicitud as any} open={showEditDialog} onOpenChange={setShowEditDialog} onSolicitudUpdated={onRefresh} />
      )}

      <SolicitudDetailsDialog solicitudId={selectedSolicitudForDetails?.id || null} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} onUpdate={onRefresh} />

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="¿Eliminar solicitud?"
        description={`¿Estás seguro de que quieres eliminar la solicitud "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={onDelete}
        variant="destructive"
      />

      <StatusCommentDialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog((prev: any) => ({ ...prev, open }))} status={statusDialog.newStatus} onSubmit={onConfirmStatusChange} />

      <ScheduleEncounterDialog
        open={encuentroDialog.open}
        onOpenChange={(open) => setEncuentroDialog({ open, solicitud: open ? encuentroDialog.solicitud : null })}
        solicitud={encuentroDialog.solicitud ? {
          id: encuentroDialog.solicitud.id,
          artist_id: encuentroDialog.solicitud.artist_id,
          tipo: encuentroDialog.solicitud.tipo,
          nombre_solicitante: encuentroDialog.solicitud.nombre_solicitante,
          ciudad: encuentroDialog.solicitud.ciudad,
          medio: encuentroDialog.solicitud.medio,
          lugar_concierto: encuentroDialog.solicitud.lugar_concierto,
        } : null}
        onCreated={onRefresh}
      />

      <AssociateProjectDialog
        open={associateDialog.open}
        onOpenChange={(open) => setAssociateDialog({ open, solicitud: open ? associateDialog.solicitud : null })}
        solicitudId={associateDialog.solicitud?.id || null}
        artistId={associateDialog.solicitud?.artist_id || null}
        onLinked={onRefresh}
      />

      <CreateProjectDialog
        open={createProjectForSolicitud.open}
        onOpenChange={(open) => setCreateProjectForSolicitud({ open, solicitud: open ? createProjectForSolicitud.solicitud : null })}
        onSuccess={onRefresh}
        defaultArtistId={createProjectForSolicitud.solicitud?.artist_id}
        onCreated={async (projectId: string) => {
          const solicitudId = createProjectForSolicitud.solicitud?.id;
          if (!solicitudId) return;
          const { error } = await supabase.from('solicitudes').update({ project_id: projectId }).eq('id', solicitudId);
          if (error) {
            toast({ title: 'Error', description: 'No se pudo asociar la solicitud al nuevo proyecto', variant: 'destructive' });
          } else {
            toast({ title: 'Proyecto asociado', description: 'Proyecto creado y asociado a la solicitud.' });
            onRefresh();
          }
        }}
      />

      <SolicitudesExport open={showExportDialog} onOpenChange={setShowExportDialog} solicitudes={solicitudes} />

      <ResponseTemplates
        open={showResponseTemplates}
        onOpenChange={setShowResponseTemplates}
        onSelectTemplate={(content) => {
          navigator.clipboard.writeText(content);
          toast({ title: 'Plantilla copiada', description: 'El contenido se ha copiado al portapapeles' });
        }}
      />

      <ApprovalAvailabilityDialog
        open={availabilityDialog.open}
        onOpenChange={(open) => setAvailabilityDialog((prev: any) => ({ ...prev, open }))}
        solicitudId={availabilityDialog.solicitudId}
        bookingId={availabilityDialog.bookingId}
        bookingName={availabilityDialog.bookingName}
        hasAvailability={availabilityDialog.hasAvailability}
        unavailableMembers={availabilityDialog.unavailableMembers}
        onApproved={() => { onRefresh(); onCelebration(); }}
        comment={availabilityDialog.comment}
        userId={userId}
      />

      <SolicitudesBulkActions selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} onUpdate={onRefresh} />
    </>
  );
}
