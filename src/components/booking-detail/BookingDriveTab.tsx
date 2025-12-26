import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileExplorer } from '@/components/drive/FileExplorer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BookingDriveTabProps {
  bookingId: string;
  artistId?: string | null;
  folderUrl?: string | null;
}

export function BookingDriveTab({ bookingId, artistId, folderUrl }: BookingDriveTabProps) {
  const [linkedFolderId, setLinkedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLinkedFolder = async () => {
      if (!bookingId) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to find a folder linked to this booking via metadata
        const { data, error } = await supabase
          .from('storage_nodes')
          .select('id')
          .contains('metadata', { booking_id: bookingId })
          .eq('node_type', 'folder')
          .limit(1)
          .single();

        if (!error && data) {
          setLinkedFolderId(data.id);
        } else if (folderUrl) {
          // Parse folder ID from URL if available
          const urlParams = new URLSearchParams(folderUrl.split('?')[1] || '');
          const folderId = urlParams.get('folder');
          if (folderId) {
            setLinkedFolderId(folderId);
          }
        }
      } catch (err) {
        console.error('Error fetching linked folder:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkedFolder();
  }, [bookingId, folderUrl]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!linkedFolderId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold mb-2">Sin carpeta vinculada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cuando el evento se confirme, se creará automáticamente una carpeta con la estructura de archivos.
          </p>
          {artistId && (
            <Button variant="outline" asChild>
              <Link to={`/carpetas?artist=${artistId}`}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir al Drive del Artista
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Archivos del Evento</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/carpetas?folder=${linkedFolderId}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir en Drive
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <FileExplorer
          artistId={artistId || null}
          initialFolderId={linkedFolderId}
          bookingId={bookingId}
          showBreadcrumbs={false}
          compact
        />
      </CardContent>
    </Card>
  );
}
