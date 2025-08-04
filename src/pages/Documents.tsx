import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Download, Eye, Filter, File, Image, Music, Video, ExternalLink, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArtistSelector } from '@/components/ArtistSelector';

interface Document {
  id: string;
  title: string;
  category: string;
  file_type: string;
  file_size: number;
  file_url: string;
  artist_id: string;
  uploaded_by: string;
  created_at: string;
}

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

export default function Documents() {
  usePageTitle('Documentos');
  const { profile } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [newDocument, setNewDocument] = useState({
    title: '',
    category: '',
    artist_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (profile) {
      // Initialize with current user selected
      setSelectedArtists([profile.id]);
      fetchArtists();
    }
  }, [profile]);

  useEffect(() => {
    if (profile && selectedArtists.length > 0) {
      fetchDocuments();
    }
  }, [selectedArtists]);

  const fetchArtists = async () => {
    try {
      const { data: artistsData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      setArtists(artistsData || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Fetch documents filtered by selected artists
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .in('artist_id', selectedArtists)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDocument.title || !newDocument.category || !newDocument.file) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos y selecciona un archivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, newDocument.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title: newDocument.title,
          category: newDocument.category,
          file_type: newDocument.file.type,
          file_size: newDocument.file.size,
          file_url: publicUrl,
          artist_id: profile?.active_role === 'management' ? newDocument.artist_id : profile?.id,
          uploaded_by: profile?.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Documento subido correctamente.",
      });

      setNewDocument({
        title: '',
        category: '',
        artist_id: '',
        file: null,
      });
      setShowUploadForm(false);
      fetchDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el documento.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'contract': return 'bg-blue-500';
      case 'rider': return 'bg-green-500';
      case 'setlist': return 'bg-purple-500';
      case 'press': return 'bg-orange-500';
      case 'legal': return 'bg-red-500';
      case 'financial': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="p-6">Cargando documentos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gestión de Documentos</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Artist Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtrar por Artistas
            </CardTitle>
            <CardDescription>
              Selecciona los artistas cuyos documentos quieres ver
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArtistSelector
              selectedArtists={selectedArtists}
              onSelectionChange={setSelectedArtists}
              placeholder="Seleccionar artistas para mostrar sus documentos..."
              showSelfOption={true}
            />
          </CardContent>
        </Card>

        {/* Material de Artistas - Drive Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Material de Artistas
            </CardTitle>
            <CardDescription>
              Accede a las carpetas de Drive donde cada artista tiene su material profesional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Cada artista tiene una carpeta dedicada con fotos, videos, biografías, logos y material promocional.
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('https://drive.google.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Acceder a Carpetas de Drive
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subir Documento</CardTitle>
          <CardDescription>
            Sube contratos, riders, setlists y documentos importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Subir Nuevo Documento</DialogTitle>
                <DialogDescription>
                  Sube contratos, riders, setlists y otros documentos importantes
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newDocument.title}
                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                    placeholder="Nombre del documento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={newDocument.category}
                    onValueChange={(value) => setNewDocument({ ...newDocument, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">Contratos</SelectItem>
                      <SelectItem value="rider">Riders Técnicos</SelectItem>
                      <SelectItem value="setlist">Setlists</SelectItem>
                      <SelectItem value="press">Material de Prensa</SelectItem>
                      <SelectItem value="legal">Documentos Legales</SelectItem>
                      <SelectItem value="financial">Documentos Financieros</SelectItem>
                      <SelectItem value="other">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {profile?.active_role === 'management' && (
                  <div className="space-y-2">
                    <Label htmlFor="artist">Artista</Label>
                    <Select
                      value={newDocument.artist_id}
                      onValueChange={(value) => setNewDocument({ ...newDocument, artist_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un artista" />
                      </SelectTrigger>
                      <SelectContent>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="file">Archivo *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.mp4,.mov"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos soportados: PDF, DOC, DOCX, TXT, JPG, PNG, MP3, WAV, MP4, MOV
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Subiendo...' : 'Subir Documento'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowUploadForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
            <p className="text-muted-foreground mb-4">
              Sube tu primer documento para empezar a organizar tu biblioteca
            </p>
            <Button onClick={() => setShowUploadForm(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Subir Documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(document.file_type)}
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{document.title}</CardTitle>
                      <CardDescription>
                        {artists.find(a => a.id === document.artist_id)?.full_name || 'Artista'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getCategoryColor(document.category)}>
                    {document.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Tamaño: {formatFileSize(document.file_size)}</p>
                  <p>Subido: {format(new Date(document.created_at), 'PPP', { locale: es })}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={document.file_url} download>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}