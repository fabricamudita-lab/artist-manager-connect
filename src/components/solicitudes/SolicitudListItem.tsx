import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Clock, CheckCircle, XCircle, Phone, Archive, ArchiveRestore, Mic, Music, HelpCircle, Info, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Solicitud {
  id: string;
  tipo: string;
  nombre_solicitante: string;
  email?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  archived?: boolean;
  fecha_creacion: string;
  ciudad?: string;
  medio?: string;
  observaciones?: string;
  fecha_limite_respuesta?: string | null;
  nombre_festival?: string;
  lugar_concierto?: string;
  nombre_programa?: string;
  profiles?: { full_name: string } | null;
  project_id?: string | null;
  project?: { id: string; name: string } | null;
  decision_has_new_comment?: boolean;
  artist_id?: string;
}

const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
  entrevista: { label: 'Entrevista', icon: '🎙️', color: 'bg-green-500' },
  booking: { label: 'Booking', icon: '🎤', color: 'bg-blue-500' },
  consulta: { label: 'Consulta', icon: '💬', color: 'bg-purple-500' },
  informacion: { label: 'Información', icon: 'ℹ️', color: 'bg-orange-500' },
  licencia: { label: 'Licencia', icon: '📜', color: 'bg-teal-500' },
  otro: { label: 'Otro', icon: '📄', color: 'bg-gray-500' },
};

const statusConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  denegada: { label: 'Denegada', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const getTypeIcon = (tipo: string) => {
  const iconProps = { size: 16, className: "text-white" };
  switch (tipo) {
    case 'entrevista': return <Mic {...iconProps} />;
    case 'booking': return <Music {...iconProps} />;
    case 'consulta': return <HelpCircle {...iconProps} />;
    case 'informacion': return <Info {...iconProps} />;
    default: return <FileText {...iconProps} />;
  }
};

const getMainContent = (solicitud: Solicitud) => {
  if (solicitud.tipo === 'booking') return solicitud.nombre_festival || solicitud.lugar_concierto || 'Evento sin nombre';
  if (solicitud.tipo === 'entrevista') return solicitud.nombre_programa || solicitud.medio || 'Entrevista';
  return solicitud.nombre_solicitante;
};

interface DueChipProps {
  date?: string | null;
  estado: Solicitud['estado'];
}

function DueChip({ date, estado }: DueChipProps) {
  if (!date || estado !== 'pendiente') return null;
  
  let days: number;
  try {
    const { differenceInCalendarDays } = require('date-fns');
    days = differenceInCalendarDays(new Date(date), new Date());
  } catch { return null; }

  let text = '';
  let cls = 'text-muted-foreground';

  if (days < 0) { text = `Vencida hace ${Math.abs(days)}d`; cls = 'text-destructive font-semibold'; }
  else if (days === 0) { text = '0d'; cls = 'text-muted-foreground font-bold'; }
  else {
    text = `${days}d`;
    if (days <= 1) cls = 'text-muted-foreground font-bold';
    else if (days <= 3) cls = 'text-muted-foreground font-semibold';
    else if (days <= 7) cls = 'text-muted-foreground font-medium';
  }

  return <span className={`text-[10px] sm:text-xs ${cls} whitespace-nowrap`}>{text}</span>;
}

interface SolicitudListItemProps {
  solicitud: Solicitud;
  onOpenDetails: (solicitud: Solicitud) => void;
  onEdit: (solicitud: Solicitud) => void;
  onDelete: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onStatusChange: (id: string, newStatus: 'pendiente' | 'aprobada' | 'denegada', currentStatus?: 'pendiente' | 'aprobada' | 'denegada') => void;
  onScheduleEncounter: (solicitud: Solicitud) => void;
  onAssociateProject: (solicitud: Solicitud) => void;
  onCreateProject: (solicitud: Solicitud) => void;
}

export function SolicitudListItem({
  solicitud,
  onOpenDetails,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onStatusChange,
  onScheduleEncounter,
  onAssociateProject,
  onCreateProject,
}: SolicitudListItemProps) {
  const navigate = useNavigate();
  const typeInfo = typeConfig[solicitud.tipo] || { label: 'Otro', icon: '📄', color: 'bg-gray-500' };
  const statusInfo = statusConfig[solicitud.estado];
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className={`
        group flex items-center gap-4 p-4 cursor-pointer transition-colors border-b border-border/50 last:border-b-0
        ${solicitud.archived 
          ? 'bg-gray-50 hover:bg-gray-100' 
          : solicitud.estado === 'aprobada' ? 'bg-success/50 hover:bg-success/60' 
          : solicitud.estado === 'pendiente' ? 'bg-warning/50 hover:bg-warning/60' 
          : solicitud.estado === 'denegada' ? 'bg-destructive/50 hover:bg-destructive/60' 
          : ''
        }
      `}
      onClick={() => onOpenDetails(solicitud)}
    >
      {/* Icono/Tipo */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
          {getTypeIcon(solicitud.tipo)}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-medium truncate ${solicitud.estado === 'pendiente' ? 'text-foreground font-semibold' : 'text-foreground'}`}>
            {getMainContent(solicitud)}
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded capitalize flex-shrink-0">
            {typeInfo.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => e.stopPropagation()}>
                <span className="truncate max-w-[140px]">{solicitud.project?.name ?? 'Proyecto'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                disabled={!solicitud.project?.id && !solicitud.project_id}
                onClick={() => {
                  const pid = solicitud.project?.id ?? solicitud.project_id;
                  if (pid) navigate(`/projects/${pid}`);
                }}
              >
                Ir al proyecto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAssociateProject(solicitud)}>
                Asociar a proyecto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateProject(solicitud)}>
                Nuevo proyecto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {solicitud.decision_has_new_comment && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-primary">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              Nuevo
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {solicitud.profiles?.full_name && <span className="flex-shrink-0">👤 {solicitud.profiles.full_name}</span>}
          {solicitud.email && <span className="flex-shrink-0">📧 {solicitud.email}</span>}
          {solicitud.tipo === 'booking' && solicitud.ciudad && <span className="flex-shrink-0">📍 {solicitud.ciudad}</span>}
          {solicitud.tipo === 'entrevista' && solicitud.medio && <span className="flex-shrink-0">📺 {solicitud.medio}</span>}
          {solicitud.observaciones && <span className="truncate">💬 {solicitud.observaciones.substring(0, 40)}...</span>}
        </div>
      </div>

      {/* Estado + Fecha/Acciones */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="flex-shrink-0 min-w-[90px] flex justify-end">
          {solicitud.estado === 'pendiente' ? (
            <DueChip date={solicitud.fecha_limite_respuesta} estado={solicitud.estado} />
          ) : (
            <span className="invisible block text-[10px] sm:text-xs px-2 py-1 rounded-full border">--</span>
          )}
        </div>

        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Select
            value={solicitud.estado}
            onValueChange={(value: 'pendiente' | 'aprobada' | 'denegada') => onStatusChange(solicitud.id, value, solicitud.estado)}
          >
            <SelectTrigger
              className={`${statusInfo.color} text-xs border rounded-full h-7 px-3 [&>svg:last-child]:hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente"><div className="flex items-center gap-2"><Clock className="w-3 h-3" />Pendiente</div></SelectItem>
              <SelectItem value="aprobada"><div className="flex items-center gap-2"><CheckCircle className="w-3 h-3" />Aprobada</div></SelectItem>
              <SelectItem value="denegada"><div className="flex items-center gap-2"><XCircle className="w-3 h-3" />Denegada</div></SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-24 sm:w-32">
          <div className="absolute inset-0 flex items-center justify-end text-sm text-muted-foreground transition-opacity duration-200 group-hover:opacity-0">
            {format(new Date(solicitud.fecha_creacion), 'dd MMM', { locale: es })}
          </div>
          <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onScheduleEncounter(solicitud); }} className="h-8 w-8 p-0 hover:bg-muted">
              <Phone className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(solicitud); }} className="h-8 w-8 p-0 hover:bg-muted">
              <Edit className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(solicitud.id, getMainContent(solicitud)); }} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); solicitud.archived ? onUnarchive(solicitud.id) : onArchive(solicitud.id); }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
              title={solicitud.archived ? "Desarchivar" : "Archivar"}
            >
              {solicitud.archived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
