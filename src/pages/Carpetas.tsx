import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArtistFiles, ARTIST_FOLDER_CATEGORIES, ArtistFile } from '@/hooks/useArtistFiles';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Upload,
  MoreVertical,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  File,
  Download,
  Trash2,
  ExternalLink,
  Search,
  Grid3X3,
  List,
  User,
  Palette,
  Share2,
  Calculator,
  Megaphone,
  ShoppingBag,
  Disc,
  Newspaper,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Icon mapping for categories
const getCategoryIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    Video: Video,
    Music: Music,
    FileText: FileText,
    Palette: Palette,
    Share2: Share2,
    Calculator: Calculator,
    Image: Image,
    Megaphone: Megaphone,
    ShoppingBag: ShoppingBag,
    Disc: Disc,
    User: User,
    Newspaper: Newspaper,
  };
  return icons[iconName] || Folder;
};

// Get file icon based on type
const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

// Format file size
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  workspace_id: string;
}

export default function Carpetas() {
  const { profile, user } = useAuth();
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ArtistFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManagement = profile?.active_role === 'management';

  // Fetch artists
  const { data: artists = [], isLoading: artistsLoading } = useQuery({
    queryKey: ['artists-for-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, workspace_id')
        .order('name');

      if (error) throw error;
      return data as Artist[];
    },
  });

  // Get files for selected artist and category
  const {
    files,
    fileCounts,
    isLoading: filesLoading,
    uploadFiles,
    deleteFile,
    isUploading,
    isDeleting,
  } = useArtistFiles(selectedArtist?.id || null, selectedCategory || undefined);

  // Filter files by search
  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedArtist || !selectedCategory) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles, selectedArtist.id, selectedCategory);
    }
  }, [selectedArtist, selectedCategory, uploadFiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedArtist || !selectedCategory || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      await uploadFiles(selectedFiles, selectedArtist.id, selectedCategory);
    }
    e.target.value = '';
  };

  const handleDownload = (file: ArtistFile) => {
    window.open(file.file_url, '_blank');
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  // Render Level 1: Artist Selection
  const renderArtistSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Carpetas</h1>
          <p className="text-muted-foreground">Biblioteca Maestra de Archivos por Artista</p>
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
              onClick={() => setSelectedArtist(artist)}
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

  // Render Level 2: Category Folders
  const renderCategoryFolders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedArtist(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {selectedArtist?.stage_name || selectedArtist?.name}
            </h1>
            <p className="text-muted-foreground">Categorías de Archivos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {ARTIST_FOLDER_CATEGORIES.map((category) => {
          const IconComponent = getCategoryIcon(category.icon);
          const count = fileCounts[category.id] || 0;

          return (
            <Card
              key={category.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                  <IconComponent className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium text-sm truncate w-full">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {count} {count === 1 ? 'archivo' : 'archivos'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Render Level 3: Files in Category
  const renderFilesView = () => {
    const currentCategory = ARTIST_FOLDER_CATEGORIES.find(c => c.id === selectedCategory);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCategory(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentCategory?.name}</h1>
              <p className="text-muted-foreground">
                {selectedArtist?.stage_name || selectedArtist?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Subiendo...' : 'Subir'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Arrastra archivos aquí o haz clic en "Subir"
          </p>
        </div>

        {/* Files */}
        {filesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Carpeta vacía</h3>
              <p className="text-sm text-muted-foreground">
                Sube archivos para comenzar a organizar esta categoría.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.file_type);
              const isImage = file.file_type?.startsWith('image/');

              return (
                <Card key={file.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="relative aspect-square rounded-lg bg-muted mb-2 flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img
                          src={file.file_url}
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="w-12 h-12 text-muted-foreground" />
                      )}

                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setFileToDelete(file)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <p className="text-xs font-medium truncate" title={file.file_name}>
                      {file.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.file_type);

                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} •{' '}
                          {format(new Date(file.created_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setFileToDelete(file)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Main content based on navigation level
  const renderContent = () => {
    if (!selectedArtist) {
      return renderArtistSelection();
    }
    if (!selectedCategory) {
      return renderCategoryFolders();
    }
    return renderFilesView();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {renderContent()}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo "{fileToDelete?.file_name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
