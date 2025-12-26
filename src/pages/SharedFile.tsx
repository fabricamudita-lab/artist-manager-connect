import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  FileText, 
  Image, 
  Video, 
  Music, 
  File,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface SharedFileData {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  public_expires_at: string | null;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [file, setFile] = useState<SharedFileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFile = async () => {
      if (!token) {
        setError('Enlace inválido');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('artist_files')
          .select('id, file_name, file_url, file_type, file_size, public_expires_at')
          .eq('public_token', token)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Este enlace no existe o ha sido revocado');
          } else {
            throw fetchError;
          }
          return;
        }

        // Check if expired
        if (data.public_expires_at && new Date(data.public_expires_at) < new Date()) {
          setError('Este enlace ha expirado');
          return;
        }

        setFile(data);
      } catch (err) {
        console.error('Error fetching shared file:', err);
        setError('Error al cargar el archivo');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [token]);

  const handleDownload = () => {
    if (file?.file_url) {
      window.open(file.file_url, '_blank');
    }
  };

  const handleView = () => {
    if (file?.file_url) {
      window.open(file.file_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-semibold mb-2">No se puede acceder</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!file) return null;

  const FileIcon = getFileIcon(file.file_type);
  const isImage = file.file_type?.startsWith('image/');
  const isVideo = file.file_type?.startsWith('video/');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="w-5 h-5" />
            Archivo Compartido
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Preview */}
          <div className="mb-6 rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
            {isImage ? (
              <img 
                src={file.file_url} 
                alt={file.file_name}
                className="w-full h-full object-contain"
              />
            ) : isVideo ? (
              <video 
                src={file.file_url} 
                controls
                className="w-full h-full"
              />
            ) : (
              <FileIcon className="w-16 h-16 text-muted-foreground" />
            )}
          </div>

          {/* File info */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg truncate" title={file.file_name}>
              {file.file_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.file_size)}
              {file.public_expires_at && (
                <> • Expira: {new Date(file.public_expires_at).toLocaleDateString('es-ES')}</>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleView} variant="outline" className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver
            </Button>
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>

          {/* Branding */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            Compartido vía CityZen Management
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
