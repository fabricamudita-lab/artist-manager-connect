import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { User, Music, Globe, Edit, Save, X, MessageCircle, Instagram } from 'lucide-react';

interface ArtistData {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  genre: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  tiktok_url: string | null;
  company_name: string | null;
  legal_name: string | null;
  tax_id: string | null;
  brand_color: string | null;
  created_at: string;
}

interface ArtistInfoDialogProps {
  artistId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatOpen?: (artistId: string) => void;
}

export function ArtistInfoDialog({ artistId, open, onOpenChange, onChatOpen }: ArtistInfoDialogProps) {
  const { profile: currentProfile } = useAuth();
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    stage_name: '',
    description: '',
    genre: '',
    instagram_url: '',
    spotify_url: '',
    tiktok_url: '',
    company_name: '',
    legal_name: '',
    tax_id: '',
  });

  useEffect(() => {
    if (open && artistId) {
      fetchArtist();
    }
  }, [open, artistId]);

  const fetchArtist = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setArtistData(null);
        return;
      }

      setArtistData(data);
      setFormData({
        name: data.name || '',
        stage_name: data.stage_name || '',
        description: data.description || '',
        genre: data.genre || '',
        instagram_url: data.instagram_url || '',
        spotify_url: data.spotify_url || '',
        tiktok_url: data.tiktok_url || '',
        company_name: data.company_name || '',
        legal_name: data.legal_name || '',
        tax_id: data.tax_id || '',
      });
    } catch (error) {
      console.error('Error fetching artist:', error);
      toast({ title: "Error", description: "No se pudo cargar la información del artista.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artistId) return;
    try {
      const { error } = await supabase
        .from('artists')
        .update({
          name: formData.name,
          stage_name: formData.stage_name || null,
          description: formData.description || null,
          genre: formData.genre || null,
          instagram_url: formData.instagram_url || null,
          spotify_url: formData.spotify_url || null,
          tiktok_url: formData.tiktok_url || null,
          company_name: formData.company_name || null,
          legal_name: formData.legal_name || null,
          tax_id: formData.tax_id || null,
        })
        .eq('id', artistId);

      if (error) throw error;
      toast({ title: "Éxito", description: "Información del artista actualizada." });
      setEditing(false);
      fetchArtist();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la información.", variant: "destructive" });
    }
  };

  const canEdit = currentProfile?.active_role === 'management';

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-center py-8">Cargando información del artista...</div></DialogContent>
      </Dialog>
    );
  }

  if (!artistData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-center py-8">No se encontró información del artista.</div></DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ficha del Artista
          </DialogTitle>
          <DialogDescription>Información detallada del artista</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artistData.avatar_url || ''} />
                    <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{artistData.name}</CardTitle>
                    {artistData.stage_name && (
                      <p className="text-sm text-muted-foreground">{artistData.stage_name}</p>
                    )}
                    {artistData.genre && <Badge variant="secondary">{artistData.genre}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {onChatOpen && (
                    <Button variant="outline" size="sm" onClick={() => onChatOpen(artistData.id)}>
                      <MessageCircle className="h-4 w-4 mr-2" />Chatear
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                      {editing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Info general */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Music className="h-5 w-5" />Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  {editing ? (
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  ) : (
                    <Input value={artistData.name} disabled />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nombre artístico</Label>
                  {editing ? (
                    <Input value={formData.stage_name} onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })} placeholder="Nombre artístico" />
                  ) : (
                    <Input value={artistData.stage_name || 'No especificado'} disabled />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Género musical</Label>
                {editing ? (
                  <Input value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} placeholder="Género musical" />
                ) : (
                  <Input value={artistData.genre || 'No especificado'} disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label>Descripción / Bio</Label>
                {editing ? (
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Biografía del artista" rows={3} />
                ) : (
                  <Textarea value={artistData.description || 'Sin descripción'} disabled rows={3} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Redes sociales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Redes Sociales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" />Instagram</Label>
                {editing ? (
                  <Input value={formData.instagram_url} onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })} placeholder="https://instagram.com/..." />
                ) : (
                  <Input value={artistData.instagram_url || 'No especificado'} disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label>Spotify</Label>
                {editing ? (
                  <Input value={formData.spotify_url} onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })} placeholder="https://open.spotify.com/..." />
                ) : (
                  <Input value={artistData.spotify_url || 'No especificado'} disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label>TikTok</Label>
                {editing ? (
                  <Input value={formData.tiktok_url} onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })} placeholder="https://tiktok.com/..." />
                ) : (
                  <Input value={artistData.tiktok_url || 'No especificado'} disabled />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Datos fiscales (solo management) */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Datos Fiscales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    {editing ? (
                      <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Nombre de empresa" />
                    ) : (
                      <Input value={artistData.company_name || 'No especificado'} disabled />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre legal</Label>
                    {editing ? (
                      <Input value={formData.legal_name} onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })} placeholder="Nombre legal" />
                    ) : (
                      <Input value={artistData.legal_name || 'No especificado'} disabled />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>CIF / NIF</Label>
                  {editing ? (
                    <Input value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} placeholder="CIF o NIF" />
                  ) : (
                    <Input value={artistData.tax_id || 'No especificado'} disabled />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones */}
          {editing && (
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Guardar Cambios</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
