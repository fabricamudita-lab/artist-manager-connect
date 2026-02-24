import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Image, Video, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRelease, useReleaseAssets } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useRef } from 'react';
import { useAlertHighlight } from '@/hooks/useAlertHighlight';

export default function ReleaseImagenVideo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: assets, isLoading: loadingAssets } = useReleaseAssets(id);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const { alertId, highlightElement } = useAlertHighlight();
  const uploadBtnRef = useRef<HTMLButtonElement>(null);
  const uploadBtnEmptyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (alertId === 'media-empty') {
      setTimeout(() => {
        if (uploadBtnRef.current) highlightElement(uploadBtnRef.current);
        if (uploadBtnEmptyRef.current) highlightElement(uploadBtnEmptyRef.current);
      }, 400);
    }
  }, [alertId, highlightElement]);

  const filteredAssets = assets?.filter((a) => filter === 'all' || a.type === filter) || [];

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Imagen & Video</h1>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="image">
              <Image className="w-4 h-4 mr-1" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="w-4 h-4 mr-1" />
              Videos
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" ref={uploadBtnRef}>
          <Plus className="mr-2 h-4 w-4" />
          Subir
        </Button>
      </div>

      {loadingAssets ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : filteredAssets.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group cursor-pointer">
              <div className="aspect-square relative bg-muted">
                {asset.type === 'image' ? (
                  <img
                    src={asset.file_url}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-sm font-medium">{asset.title}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Image className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin contenido visual</h3>
          <p className="text-muted-foreground mb-4">
            Sube fotos de sesiones y videoclips
          </p>
          <Button ref={uploadBtnEmptyRef}>
            <Plus className="mr-2 h-4 w-4" />
            Subir Archivos
          </Button>
        </Card>
      )}
    </div>
  );
}
