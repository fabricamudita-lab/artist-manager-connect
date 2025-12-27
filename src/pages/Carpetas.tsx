import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArtistFiles, ARTIST_FOLDER_CATEGORIES, ArtistFile } from '@/hooks/useArtistFiles';
import { useArtistSubfolders, DEFAULT_SUBFOLDERS } from '@/hooks/useArtistSubfolders';
import { FileExplorer } from '@/components/drive/FileExplorer';
import { ConciertosView } from '@/components/drive/ConciertosView';
import { usePublicFileSharing } from '@/hooks/usePublicFileSharing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  Plus,
  FolderPlus,
  Link as LinkIcon,
  Pencil,
  FolderInput,
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

// All categories support infinite nested folders now
const CATEGORIES_WITH_FOLDERS = ARTIST_FOLDER_CATEGORIES.map(c => c.id);

export default function Carpetas() {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Now we track folder by ID for proper nesting
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  // Track if we're viewing a storage_nodes folder directly (e.g., booking folders)
  const [storageNodeFolderId, setStorageNodeFolderId] = useState<string | null>(null);
  const [storageNodeArtistId, setStorageNodeArtistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ArtistFile | null>(null);
  const [fileToRename, setFileToRename] = useState<ArtistFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
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

  // Handle URL params for deep linking
  useEffect(() => {
    const artistId = searchParams.get('artist');
    const category = searchParams.get('category');
    const folderId = searchParams.get('folder');

    // If we have a folder ID but no artist/category, it's a direct storage_node link
    if (folderId && !artistId && !category) {
      // Look up the storage_node to get the artist_id
      supabase
        .from('storage_nodes')
        .select('id, artist_id')
        .eq('id', folderId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setStorageNodeFolderId(data.id);
            setStorageNodeArtistId(data.artist_id);
          }
        });
      return;
    }

    // Reset storage node view if we have explicit artist/category
    setStorageNodeFolderId(null);
    setStorageNodeArtistId(null);

    if (artistId && artists.length > 0) {
      const artist = artists.find(a => a.id === artistId);
      if (artist) {
        setSelectedArtist(artist);
        if (category) {
          setSelectedCategory(category);
          if (folderId) {
            setCurrentFolderId(folderId);
          }
        }
      }
    }
  }, [searchParams, artists]);

  // Get files for selected artist and category
  const {
    files,
    fileCounts,
    isLoading: filesLoading,
    uploadFiles,
    deleteFile,
    renameFile,
    moveFile,
    isUploading,
    isDeleting,
  } = useArtistFiles(selectedArtist?.id || null, selectedCategory || undefined);

  // Get subfolders for current category
  const {
    subfolders,
    isLoading: subfoldersLoading,
    getSubfoldersForParent,
    getFolderById,
    getBreadcrumbPath,
    ensureDefaultSubfolders,
    createSubfolder,
    deleteSubfolder,
    isCreating: isCreatingFolder,
  } = useArtistSubfolders(selectedArtist?.id || null, selectedCategory || undefined);

  // Public sharing hook
  const { generateShareLink, isGenerating } = usePublicFileSharing();

  // Get current folder info and child folders
  const currentFolder = currentFolderId ? getFolderById(currentFolderId) : null;
  const childFolders = getSubfoldersForParent(currentFolderId);
  const breadcrumbPath = getBreadcrumbPath(currentFolderId);

  // Ensure default subfolders exist when entering a category
  useEffect(() => {
    if (selectedArtist && selectedCategory) {
      ensureDefaultSubfolders({ artistId: selectedArtist.id, category: selectedCategory });
    }
  }, [selectedArtist, selectedCategory, ensureDefaultSubfolders]);

  // Filter files by search and current folder
  // We use the folder ID path to match files (stored as subcategory with folder names)
  const currentFolderPath = currentFolder 
    ? breadcrumbPath.map(f => f.name).join('/') + (breadcrumbPath.length > 0 ? '' : currentFolder.name)
    : null;
  
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    // Match files in current folder (subcategory stores the folder path or folder ID)
    const matchesFolder = currentFolderId 
      ? file.subcategory === currentFolderId || file.subcategory === currentFolderPath
      : !file.subcategory; // Show root files when no folder selected
    return matchesSearch && matchesFolder;
  });

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
      await uploadFiles(droppedFiles, selectedArtist.id, selectedCategory, currentFolderId || undefined);
    }
  }, [selectedArtist, selectedCategory, currentFolderId, uploadFiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedArtist || !selectedCategory || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      await uploadFiles(selectedFiles, selectedArtist.id, selectedCategory, currentFolderId || undefined);
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

  const handleCreateFolder = () => {
    if (!selectedArtist || !selectedCategory || !newFolderName.trim()) return;

    createSubfolder({
      artistId: selectedArtist.id,
      category: selectedCategory,
      name: newFolderName.trim(),
      parentId: currentFolderId,
    });

    setNewFolderName('');
    setShowCreateFolderDialog(false);
  };

  const handleShareFile = (file: ArtistFile) => {
    generateShareLink({ fileId: file.id, expiresInDays: 30 });
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
          const hasFolders = subfolders.filter(sf => sf.parent_id === null).length > 0;

          return (
            <Card
              key={category.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => {
                setSelectedCategory(category.id);
                setCurrentFolderId(null);
              }}
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


  // Render Level 3: Folders + Files
  const renderFilesView = () => {
    const currentCategoryObj = ARTIST_FOLDER_CATEGORIES.find(c => c.id === selectedCategory);

    // For "conciertos" category, use ConciertosView with custom HISTORIAL logic
    if (selectedCategory === 'conciertos' && selectedArtist) {
      return (
        <ConciertosView
          artistId={selectedArtist.id}
          artistName={selectedArtist.stage_name || selectedArtist.name}
          onBack={() => setSelectedCategory(null)}
        />
      );
    }

    // Build breadcrumb text
    const breadcrumbText = breadcrumbPath.length > 0 
      ? `${currentCategoryObj?.name} / ${breadcrumbPath.map(f => f.name).join(' / ')}`
      : currentCategoryObj?.name;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (currentFolderId) {
                  // Go up one level
                  const parentId = currentFolder?.parent_id || null;
                  setCurrentFolderId(parentId);
                } else {
                  setSelectedCategory(null);
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {currentFolder?.name || currentCategoryObj?.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {selectedArtist?.stage_name || selectedArtist?.name}
                {currentFolderId && ` / ${breadcrumbText}`}
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

            <Button variant="outline" onClick={() => setShowCreateFolderDialog(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Nueva Carpeta
            </Button>

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

        {/* Folders */}
        {childFolders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Carpetas</h3>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {childFolders.map((folder) => (
                  <Card
                    key={folder.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{folder.name}</p>
                        {folder.is_default && (
                          <p className="text-xs text-muted-foreground">Por defecto</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {childFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Folder className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {folder.is_default ? 'Carpeta por defecto' : 'Carpeta'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

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
              const canShare = selectedCategory === 'audiovisuales';

              return (
                <Card key={file.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="relative aspect-square rounded-lg bg-muted mb-2 flex items-center justify-center overflow-hidden">
                      {isImage && file.file_url !== 'placeholder' ? (
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
                            {file.file_url !== 'placeholder' && (
                              <>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Abrir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Descargar
                                </DropdownMenuItem>
                              </>
                            )}
                            {canShare && file.file_url !== 'placeholder' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleShareFile(file)}>
                                  <LinkIcon className="w-4 h-4 mr-2" />
                                  Compartir Enlace
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setFileToRename(file);
                                setNewFileName(file.file_name);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Renombrar
                            </DropdownMenuItem>
                            {subfolders.length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderInput className="w-4 h-4 mr-2" />
                                  Mover a...
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {!currentFolderId && (
                                    <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                      Raíz (actual)
                                    </DropdownMenuItem>
                                  )}
                                  {currentFolderId && (
                                    <DropdownMenuItem
                                      onClick={() => moveFile({ fileId: file.id, subcategory: null })}
                                    >
                                      <Folder className="w-4 h-4 mr-2" />
                                      Raíz
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {subfolders.map((sf) => (
                                    <DropdownMenuItem
                                      key={sf.id}
                                      disabled={sf.id === currentFolderId}
                                      onClick={() => moveFile({ fileId: file.id, subcategory: sf.id })}
                                    >
                                      <Folder className="w-4 h-4 mr-2" />
                                      {sf.name}
                                      {sf.id === currentFolderId && ' (actual)'}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                            <DropdownMenuSeparator />
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
                      {file.file_url === 'placeholder' ? (
                        <span className="text-warning">Pendiente</span>
                      ) : (
                        formatFileSize(file.file_size)
                      )}
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
                  const canShare = selectedCategory === 'audiovisuales';

                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.file_url === 'placeholder' ? (
                            <span className="text-warning">Pendiente de subir</span>
                          ) : (
                            <>
                              {formatFileSize(file.file_size)} •{' '}
                              {format(new Date(file.created_at), 'dd MMM yyyy', { locale: es })}
                            </>
                          )}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.file_url !== 'placeholder' && (
                            <>
                              <DropdownMenuItem onClick={() => handleDownload(file)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(file)}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar
                              </DropdownMenuItem>
                            </>
                          )}
                          {canShare && file.file_url !== 'placeholder' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleShareFile(file)}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Compartir Enlace
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToRename(file);
                              setNewFileName(file.file_name);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Renombrar
                          </DropdownMenuItem>
                          {subfolders.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <FolderInput className="w-4 h-4 mr-2" />
                                Mover a...
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {!currentFolderId && (
                                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                    Raíz (actual)
                                  </DropdownMenuItem>
                                )}
                                {currentFolderId && (
                                  <DropdownMenuItem
                                    onClick={() => moveFile({ fileId: file.id, subcategory: null })}
                                  >
                                    <Folder className="w-4 h-4 mr-2" />
                                    Raíz
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {subfolders.map((sf) => (
                                  <DropdownMenuItem
                                    key={sf.id}
                                    disabled={sf.id === currentFolderId}
                                    onClick={() => moveFile({ fileId: file.id, subcategory: sf.id })}
                                  >
                                    <Folder className="w-4 h-4 mr-2" />
                                    {sf.name}
                                    {sf.id === currentFolderId && ' (actual)'}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuSeparator />
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
    // If viewing a storage_node folder directly (e.g., from booking)
    if (storageNodeFolderId && storageNodeArtistId) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setStorageNodeFolderId(null);
                setStorageNodeArtistId(null);
                // Navigate back to base carpetas
                window.history.pushState({}, '', '/carpetas');
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Archivos del Evento</h1>
              <p className="text-muted-foreground">Navega por los archivos vinculados</p>
            </div>
          </div>
          <FileExplorer
            artistId={storageNodeArtistId}
            initialFolderId={storageNodeFolderId}
            showBreadcrumbs={true}
          />
        </div>
      );
    }

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

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Carpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Introduce un nombre para la carpeta
                {currentFolder && ` dentro de "${currentFolder.name}"`}
              </p>
              <Input
                placeholder="Nombre de la carpeta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={!!fileToRename} onOpenChange={(open) => !open && setFileToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar archivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">Nombre del archivo</Label>
              <Input
                id="file-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFileName.trim() && fileToRename) {
                    renameFile({ fileId: fileToRename.id, newName: newFileName.trim() });
                    setFileToRename(null);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToRename(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (fileToRename && newFileName.trim()) {
                  renameFile({ fileId: fileToRename.id, newName: newFileName.trim() });
                  setFileToRename(null);
                }
              }}
              disabled={!newFileName.trim()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
