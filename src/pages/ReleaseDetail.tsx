import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Image,
  Users,
  Music,
  FileText,
  Disc3,
  Album,
  MoreHorizontal,
  Trash2,
  Edit,
  FolderOpen,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRelease, useDeleteRelease, useUpdateRelease } from '@/hooks/useReleases';
import EditReleaseDialog from '@/components/releases/EditReleaseDialog';
import ReleaseTaskCenter from '@/components/releases/ReleaseTaskCenter';
import { ProjectLinkSelector } from '@/components/releases/ProjectLinkSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const TYPE_ICONS = {
  album: Album,
  ep: Disc3,
  single: Music,
};

const STATUS_COLORS = {
  planning: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/20 text-blue-600',
  released: 'bg-green-500/20 text-green-600',
  archived: 'bg-gray-500/20 text-gray-500',
};

const STATUS_LABELS = {
  planning: 'Planificando',
  in_progress: 'En Progreso',
  released: 'Publicado',
  archived: 'Archivado',
};

const SECTIONS = [
  {
    id: 'cronograma',
    title: 'Cronograma',
    description: 'Planifica y visualiza el timeline del lanzamiento',
    icon: Calendar,
    color: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-500',
  },
  {
    id: 'presupuestos',
    title: 'Presupuestos',
    description: 'Controla gastos estimados vs reales',
    icon: DollarSign,
    color: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-500',
  },
  {
    id: 'imagen-video',
    title: 'Imagen & Video',
    description: 'Galería de fotos y videoclips',
    icon: Image,
    color: 'from-pink-500/20 to-pink-500/5',
    iconColor: 'text-pink-500',
  },
  {
    id: 'creditos',
    title: 'Créditos y Autoría',
    description: 'Compositores, productores y colaboradores',
    icon: Users,
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-500',
  },
  {
    id: 'audio',
    title: 'Audio',
    description: 'Tracklist y versiones de audio',
    icon: Music,
    color: 'from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500',
  },
  {
    id: 'epf',
    title: 'EPF',
    description: 'Electronic Press Folder - documentos de prensa',
    icon: FileText,
    color: 'from-cyan-500/20 to-cyan-500/5',
    iconColor: 'text-cyan-500',
  },
];

export default function ReleaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading } = useRelease(id);
  const deleteRelease = useDeleteRelease();
  const updateRelease = useUpdateRelease();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLinkProjectDialog, setShowLinkProjectDialog] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Project link state
  const [projectOption, setProjectOption] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const handleDelete = async () => {
    if (!id || !confirm('¿Estás seguro de eliminar este lanzamiento?')) return;
    await deleteRelease.mutateAsync(id);
    navigate('/releases');
  };

  const handleSectionClick = (sectionId: string, alertId?: string) => {
    const url = `/releases/${id}/${sectionId}${alertId ? `?alert=${alertId}` : ''}`;
    navigate(url);
  };

  const handleLinkProject = async () => {
    if (!id || !user?.id) return;

    let projectId: string | null = null;

    if (projectOption === 'existing' && selectedProjectId) {
      projectId = selectedProjectId;
    } else if (projectOption === 'new' && newProjectName.trim()) {
      try {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            name: newProjectName.trim(),
            description: newProjectDescription.trim() || null,
            artist_id: release?.artist_id || null,
            created_by: user.id,
            status: 'en_curso',
          } as any)
          .select('id')
          .single();

        if (error) throw error;
        projectId = newProject.id;
        toast.success('Proyecto creado');
      } catch {
        toast.error('Error al crear el proyecto');
        return;
      }
    }

    // Update release with project_id
    try {
      await supabase
        .from('releases')
        .update({ project_id: projectId })
        .eq('id', id);

      queryClient.invalidateQueries({ queryKey: ['release', id] });
      toast.success(projectId ? 'Proyecto vinculado' : 'Proyecto desvinculado');
      setShowLinkProjectDialog(false);
      setProjectOption('none');
      setSelectedProjectId(null);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch {
      toast.error('Error al vincular proyecto');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lanzamiento no encontrado</p>
        <Button variant="link" onClick={() => navigate('/releases')}>
          Volver a la discografía
        </Button>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[release.type] || Disc3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/releases')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden">
              {release.cover_image_url ? (
                <img
                  src={release.cover_image_url}
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <TypeIcon className="w-8 h-8 text-muted-foreground/50" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{release.title}</h1>
                <Badge className={STATUS_COLORS[release.status]}>
                  {STATUS_LABELS[release.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                <TypeIcon className="w-4 h-4" />
                <span className="capitalize">{release.type}</span>
                {release.release_date && (
                  <>
                    <span>•</span>
                    <span>
                      {format(new Date(release.release_date), 'PPP', { locale: es })}
                    </span>
                  </>
                )}
                {release.release_artists && release.release_artists.length > 0 ? (() => {
                    const mainArtists = release.release_artists.filter(ra => ra.role !== 'featuring');
                    const featArtists = release.release_artists.filter(ra => ra.role === 'featuring');
                    return (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {mainArtists.map((ra, idx) => (
                            <span key={ra.artist_id} className="inline-flex items-center">
                              {idx > 0 && <span className="mx-0.5 text-muted-foreground">,</span>}
                              <Link 
                                to={`/artistas/${ra.artist?.id || ra.artist_id}`}
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={ra.artist?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {(ra.artist?.name || '?').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{ra.artist?.name}</span>
                              </Link>
                            </span>
                          ))}
                          {featArtists.length > 0 && (
                            <>
                              <span className="text-muted-foreground italic mx-1">feat.</span>
                              {featArtists.map((ra, idx) => (
                                <span key={ra.artist_id} className="inline-flex items-center">
                                  {idx > 0 && <span className="mx-0.5 text-muted-foreground">,</span>}
                                  <Link 
                                    to={`/artistas/${ra.artist?.id || ra.artist_id}`}
                                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={ra.artist?.avatar_url || undefined} />
                                      <AvatarFallback className="text-[10px]">
                                        {(ra.artist?.name || '?').charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{ra.artist?.name}</span>
                                  </Link>
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </>
                    );
                  })() : release.artist ? (
                  <>
                    <span>•</span>
                    <Link 
                      to={`/artistas/${release.artist.id}`}
                      className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={release.artist.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {release.artist.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{release.artist.name}</span>
                    </Link>
                  </>
                ) : null}
              </div>

              {/* Project badge */}
              <div className="mt-2">
                {release.project_id && release.project ? (
                  <Link
                    to={`/projects/${release.project.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Proyecto: {release.project.name}
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowLinkProjectDialog(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-muted-foreground/30"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Vincular a proyecto
                  </button>
                )}
              </div>

              {release.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  {release.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((section) => (
          <Card
            key={section.id}
            className={`group cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-md overflow-hidden relative bg-gradient-to-br ${section.color}`}
            onClick={() => handleSectionClick(section.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background/80 ${section.iconColor}`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ReleaseTaskCenter releaseId={id!} onNavigate={handleSectionClick} />

      <EditReleaseDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        release={release}
      />

      {/* Link Project Dialog */}
      <Dialog open={showLinkProjectDialog} onOpenChange={setShowLinkProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a proyecto</DialogTitle>
          </DialogHeader>
          <ProjectLinkSelector
            selectedOption={projectOption}
            onOptionChange={setProjectOption}
            selectedProjectId={selectedProjectId}
            onProjectIdChange={setSelectedProjectId}
            newProjectName={newProjectName}
            onNewProjectNameChange={setNewProjectName}
            newProjectDescription={newProjectDescription}
            onNewProjectDescriptionChange={setNewProjectDescription}
            artistId={release?.artist_id}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowLinkProjectDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleLinkProject}
              disabled={
                (projectOption === 'existing' && !selectedProjectId) ||
                (projectOption === 'new' && !newProjectName.trim())
              }
            >
              Vincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
