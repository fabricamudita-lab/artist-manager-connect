import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { FileExplorer } from '@/components/drive/FileExplorer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ArrowLeft } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  workspace_id: string;
}

export default function Drive() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const initialFolderId = searchParams.get('folder');

  // Fetch artists
  const { data: artists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ['artists-for-drive'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, workspace_id')
        .order('name');

      if (error) throw error;
      return data as Artist[];
    },
  });

  // Handle URL params for deep linking
  useEffect(() => {
    const artistId = searchParams.get('artist');

    if (artistId && artists.length > 0) {
      const artist = artists.find(a => a.id === artistId);
      if (artist) {
        setSelectedArtist(artist);
      }
    }
  }, [searchParams, artists]);

  // Update URL when artist changes
  const handleArtistSelect = (artist: Artist) => {
    setSelectedArtist(artist);
    setSearchParams({ artist: artist.id });
  };

  const handleBack = () => {
    setSelectedArtist(null);
    setSearchParams({});
  };

  // Render Artist Selection
  const renderArtistSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drive</h1>
          <p className="text-muted-foreground">Biblioteca de archivos por artista</p>
        </div>
      </div>

      {artistsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : artists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No hay artistas</h3>
            <p className="text-sm text-muted-foreground">
              Crea un artista para comenzar a organizar tus archivos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {artists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => handleArtistSelect(artist)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold truncate w-full">
                  {artist.stage_name || artist.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {artist.stage_name ? artist.name : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Render File Explorer
  const renderFileExplorer = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {selectedArtist?.stage_name || selectedArtist?.name}
          </h1>
          <p className="text-muted-foreground">Drive de archivos</p>
        </div>
      </div>

      <FileExplorer
        artistId={selectedArtist?.id || null}
        initialFolderId={initialFolderId}
        showBreadcrumbs
      />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container-moodita section-spacing">
        {selectedArtist ? renderFileExplorer() : renderArtistSelection()}
      </div>
    </DashboardLayout>
  );
}
