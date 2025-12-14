import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Disc3, Music, Album } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReleases, useCreateRelease } from '@/hooks/useReleases';
import CreateReleaseDialog from '@/components/releases/CreateReleaseDialog';

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

export default function Releases() {
  const navigate = useNavigate();
  const { data: releases, isLoading } = useReleases();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discografía</h1>
          <p className="text-muted-foreground">Gestiona tus lanzamientos</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lanzamiento
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : releases && releases.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {releases.map((release) => {
            const TypeIcon = TYPE_ICONS[release.type] || Disc3;
            return (
              <Card
                key={release.id}
                className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-lg"
                onClick={() => navigate(`/releases/${release.id}`)}
              >
                <div className="aspect-square relative bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  {release.cover_image_url ? (
                    <img
                      src={release.cover_image_url}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative">
                      {/* CD/Vinyl visual */}
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-background to-muted border-4 border-muted-foreground/20 flex items-center justify-center shadow-inner">
                        <div className="w-10 h-10 rounded-full bg-muted-foreground/30" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                      </div>
                      <TypeIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 right-2 ${STATUS_COLORS[release.status]}`}
                  >
                    {STATUS_LABELS[release.status]}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {release.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <TypeIcon className="w-3.5 h-3.5" />
                    <span className="capitalize">{release.type}</span>
                    {release.release_date && (
                      <>
                        <span>•</span>
                        <span>
                          {format(new Date(release.release_date), 'MMM yyyy', { locale: es })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Disc3 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin lanzamientos</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primer álbum, EP o single
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Lanzamiento
          </Button>
        </Card>
      )}

      <CreateReleaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
