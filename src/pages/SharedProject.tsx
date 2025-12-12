import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Folder, FileText, Image, Calculator, Map, Download, ExternalLink, File, FileImage, FileVideo, FileAudio, Lock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectFile {
  id: string;
  folder_type: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface SharedProjectData {
  id: string;
  name: string;
  description: string | null;
  public_share_expires_at: string | null;
}

const PROJECT_FOLDERS = [
  { id: 'presupuestos', name: 'Presupuestos', icon: Calculator },
  { id: 'hojas_de_ruta', name: 'Hojas de Ruta', icon: Map },
  { id: 'fotos', name: 'Fotos', icon: Image },
  { id: 'legal', name: 'Legal', icon: FileText },
  { id: 'otros', name: 'Otros', icon: Folder },
];

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<SharedProjectData | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedProject = async () => {
      if (!token) {
        setError('Token no válido');
        setLoading(false);
        return;
      }

      try {
        // Fetch project by share token
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, description, public_share_enabled, public_share_token, public_share_expires_at')
          .eq('public_share_token', token)
          .eq('public_share_enabled', true)
          .single();

        if (projectError || !projectData) {
          setError('Proyecto no encontrado o enlace no válido');
          setLoading(false);
          return;
        }

        // Check if link has expired
        if (projectData.public_share_expires_at) {
          const expiresAt = new Date(projectData.public_share_expires_at);
          if (expiresAt < new Date()) {
            setError('Este enlace ha expirado');
            setLoading(false);
            return;
          }
        }

        setProject(projectData);

        // Fetch files for this project
        const { data: filesData, error: filesError } = await supabase
          .from('project_files')
          .select('id, folder_type, file_name, file_url, file_type, file_size, created_at')
          .eq('project_id', projectData.id)
          .order('folder_type')
          .order('created_at', { ascending: false });

        if (!filesError && filesData) {
          setFiles(filesData);
        }
      } catch (e) {
        console.error('Error fetching shared project:', e);
        setError('Error al cargar el proyecto');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedProject();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              {error.includes('expirado') ? (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              ) : (
                <Lock className="w-8 h-8 text-destructive" />
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  const filesByFolder = files.reduce((acc, file) => {
    if (!acc[file.folder_type]) {
      acc[file.folder_type] = [];
    }
    acc[file.folder_type].push(file);
    return acc;
  }, {} as Record<string, ProjectFile[]>);

  // Folder grid view
  if (!currentFolder) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{project.description}</p>
            )}
            <Badge variant="secondary">
              {files.length} archivo{files.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Folders grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PROJECT_FOLDERS.map((folder) => {
              const FolderIcon = folder.icon;
              const folderFiles = filesByFolder[folder.id] || [];

              return (
                <Card
                  key={folder.id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30"
                  onClick={() => setCurrentFolder(folder.id)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <FolderIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">{folder.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {folderFiles.length} archivo{folderFiles.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Folder contents view
  const currentFolderInfo = PROJECT_FOLDERS.find((f) => f.id === currentFolder);
  const currentFolderFiles = filesByFolder[currentFolder] || [];
  const CurrentFolderIcon = currentFolderInfo?.icon || Folder;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolder(null)}
          >
            ← Volver
          </Button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <CurrentFolderIcon className="w-4 h-4 text-primary" />
            <span className="font-medium">{currentFolderInfo?.name}</span>
          </div>
        </div>

        {/* File list */}
        {currentFolderFiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Esta carpeta está vacía</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentFolderFiles.map((file) => {
              const FileIcon = getFileIcon(file.file_type);

              return (
                <Card key={file.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{file.file_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {format(new Date(file.created_at), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.file_url} download={file.file_name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
