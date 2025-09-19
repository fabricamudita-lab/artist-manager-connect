import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  Link, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText,
  Plus,
  X
} from 'lucide-react';

interface MediaSelectorProps {
  onClose: () => void;
  onSelect: (media: any) => void;
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  onClose,
  onSelect
}) => {
  const [activeTab, setActiveTab] = useState('photos');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  
  // Form states
  const [photoData, setPhotoData] = useState({
    titulo: '',
    url: '',
    descargable: true,
    file: null as File | null
  });

  const [videoData, setVideoData] = useState({
    titulo: '',
    tipo: 'youtube' as 'youtube' | 'vimeo' | 'archivo',
    url: '',
    video_id: '',
    privado: false,
    file: null as File | null
  });

  const [audioData, setAudioData] = useState({
    titulo: '',
    url: '',
    file: null as File | null
  });

  const [documentData, setDocumentData] = useState({
    titulo: '',
    tipo: '',
    url: '',
    file: null as File | null
  });

  const handleFileUpload = (file: File, type: string) => {
    // This would upload to Supabase Storage and return the URL
    // For now, just create a placeholder URL
    const url = URL.createObjectURL(file);
    
    switch (type) {
      case 'photo':
        setPhotoData(prev => ({ ...prev, file, url }));
        break;
      case 'video':
        setVideoData(prev => ({ ...prev, file, url }));
        break;
      case 'audio':
        setAudioData(prev => ({ ...prev, file, url }));
        break;
      case 'document':
        setDocumentData(prev => ({ ...prev, file, url }));
        break;
    }
  };

  const extractVideoId = (url: string, platform: 'youtube' | 'vimeo') => {
    if (platform === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : '';
    } else if (platform === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  const handleSubmit = () => {
    let mediaData;
    
    switch (activeTab) {
      case 'photos':
        mediaData = {
          type: 'photo',
          ...photoData,
          orden: 0
        };
        break;
      case 'videos':
        const videoId = videoData.tipo !== 'archivo' ? 
          extractVideoId(videoData.url, videoData.tipo) : 
          undefined;
        mediaData = {
          type: 'video',
          ...videoData,
          video_id: videoId,
          orden: 0
        };
        break;
      case 'audios':
        mediaData = {
          type: 'audio',
          ...audioData,
          orden: 0
        };
        break;
      case 'documents':
        mediaData = {
          type: 'document',
          ...documentData,
          orden: 0
        };
        break;
    }
    
    onSelect(mediaData);
  };

  const renderPhotoForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Método de carga</Label>
        <Tabs value={uploadType} onValueChange={(value: 'file' | 'url') => setUploadType(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Subir archivo</TabsTrigger>
            <TabsTrigger value="url">Desde URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra una imagen aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'photo');
                }}
                className="hidden"
                id="photo-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar imagen
                </label>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-url">URL de la imagen</Label>
              <Input
                id="photo-url"
                value={photoData.url}
                onChange={(e) => setPhotoData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo-title">Título (opcional)</Label>
        <Input
          id="photo-title"
          value={photoData.titulo}
          onChange={(e) => setPhotoData(prev => ({ ...prev, titulo: e.target.value }))}
          placeholder="Descripción de la foto"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="photo-downloadable">Permitir descarga</Label>
        <Switch
          id="photo-downloadable"
          checked={photoData.descargable}
          onCheckedChange={(checked) => setPhotoData(prev => ({ ...prev, descargable: checked }))}
        />
      </div>

      {photoData.url && (
        <Card>
          <CardContent className="p-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={photoData.url} 
                alt="Vista previa"
                className="w-full h-full object-cover"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderVideoForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de video</Label>
        <Select
          value={videoData.tipo}
          onValueChange={(value: 'youtube' | 'vimeo' | 'archivo') => setVideoData(prev => ({ ...prev, tipo: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="vimeo">Vimeo</SelectItem>
            <SelectItem value="archivo">Archivo subido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-title">Título *</Label>
        <Input
          id="video-title"
          value={videoData.titulo}
          onChange={(e) => setVideoData(prev => ({ ...prev, titulo: e.target.value }))}
          placeholder="Título del video"
          required
        />
      </div>

      {videoData.tipo === 'archivo' ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            Arrastra un video aquí o haz clic para seleccionar
          </p>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'video');
            }}
            className="hidden"
            id="video-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="video-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Seleccionar video
            </label>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="video-url">URL de {videoData.tipo}</Label>
          <Input
            id="video-url"
            value={videoData.url}
            onChange={(e) => setVideoData(prev => ({ ...prev, url: e.target.value }))}
            placeholder={
              videoData.tipo === 'youtube' 
                ? 'https://www.youtube.com/watch?v=...' 
                : 'https://vimeo.com/...'
            }
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="video-private">Video privado</Label>
          <p className="text-xs text-muted-foreground">Solo visible en el backend</p>
        </div>
        <Switch
          id="video-private"
          checked={videoData.privado}
          onCheckedChange={(checked) => setVideoData(prev => ({ ...prev, privado: checked }))}
        />
      </div>
    </div>
  );

  const renderAudioForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="audio-title">Título *</Label>
        <Input
          id="audio-title"
          value={audioData.titulo}
          onChange={(e) => setAudioData(prev => ({ ...prev, titulo: e.target.value }))}
          placeholder="Título del track"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Método de carga</Label>
        <Tabs value={uploadType} onValueChange={(value: 'file' | 'url') => setUploadType(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">Desde URL/Embed</TabsTrigger>
            <TabsTrigger value="file">Subir archivo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audio-url">URL del audio</Label>
              <Input
                id="audio-url"
                value={audioData.url}
                onChange={(e) => setAudioData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://soundcloud.com/... o Spotify embed"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra un archivo de audio aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'audio');
                }}
                className="hidden"
                id="audio-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar audio
                </label>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  const renderDocumentForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="doc-title">Título *</Label>
        <Input
          id="doc-title"
          value={documentData.titulo}
          onChange={(e) => setDocumentData(prev => ({ ...prev, titulo: e.target.value }))}
          placeholder="Nombre del documento"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-type">Tipo de documento</Label>
        <Select
          value={documentData.tipo}
          onValueChange={(value) => setDocumentData(prev => ({ ...prev, tipo: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rider">Rider técnico</SelectItem>
            <SelectItem value="stage_plot">Stage plot</SelectItem>
            <SelectItem value="press_quotes">Press quotes</SelectItem>
            <SelectItem value="discografia">Discografía</SelectItem>
            <SelectItem value="biography">Biografía completa</SelectItem>
            <SelectItem value="otros">Otros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Método de carga</Label>
        <Tabs value={uploadType} onValueChange={(value: 'file' | 'url') => setUploadType(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Subir archivo</TabsTrigger>
            <TabsTrigger value="url">Desde URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra un documento aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'document');
                }}
                className="hidden"
                id="doc-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="doc-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar documento
                </label>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-url">URL del documento</Label>
              <Input
                id="doc-url"
                value={documentData.url}
                onChange={(e) => setDocumentData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://ejemplo.com/documento.pdf"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir material multimedia</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="audios" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos">
            {renderPhotoForm()}
          </TabsContent>

          <TabsContent value="videos">
            {renderVideoForm()}
          </TabsContent>

          <TabsContent value="audios">
            {renderAudioForm()}
          </TabsContent>

          <TabsContent value="documents">
            {renderDocumentForm()}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir material
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};