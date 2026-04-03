import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  Users, 
  ExternalLink,
  Instagram,
  Music,
  Calendar,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ArtistData {
  id: string;
  name: string;
  stage_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  description: string | null;
  genre: string | null;
  notes: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  tiktok_url: string | null;
}

interface ArtistProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string | null;
}

export function ArtistProfileDialog({ open, onOpenChange, artistId }: ArtistProfileDialogProps) {
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && artistId) {
      fetchArtistProfile();
    }
  }, [open, artistId]);

  const fetchArtistProfile = async () => {
    if (!artistId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, email, phone, address, avatar_url, description, genre, notes, instagram_url, spotify_url, tiktok_url')
        .eq('id', artistId)
        .single();

      if (error) throw error;
      setArtist(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del artista.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName = artist?.stage_name || artist?.name || 'Artista';

  const startWhatsAppChat = () => {
    if (!artist?.phone) {
      toast({
        title: "Error",
        description: "Este artista no tiene número de teléfono configurado",
        variant: "destructive",
      });
      return;
    }
    
    const phone = artist.phone.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(`Hola ${displayName}, te escribo desde la plataforma MOODITA.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const startEmailChat = () => {
    if (!artist?.email) return;
    
    const subject = encodeURIComponent('Comunicación desde MOODITA');
    const body = encodeURIComponent(`Hola ${displayName},\n\nTe escribo desde nuestra plataforma de gestión artística MOODITA.\n\nSaludos cordiales.`);
    window.open(`mailto:${artist.email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-modal max-w-2xl">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando perfil del artista...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!artist) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-modal max-w-2xl">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p>No se pudo cargar el perfil del artista.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair flex items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            Ficha del Artista
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header del Artista */}
          <Card className="card-professional">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={artist.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-playfair font-bold">{displayName}</h3>
                    {artist.genre && (
                      <Badge variant="outline" className="mt-2">
                        {artist.genre}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => window.open(`/chat?artist=${artist.id}`, '_blank')}
                      className="btn-primary"
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat Interno
                    </Button>
                    
                    <Button 
                      onClick={startWhatsAppChat}
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      disabled={!artist.phone}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                    
                    <Button 
                      onClick={startEmailChat}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    
                    <Button 
                      onClick={() => window.open(`/calendar?artist=${artist.id}`, '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver Calendario
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información de Contacto */}
            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{artist.email}</span>
                </div>
                
                {artist.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{artist.phone}</span>
                  </div>
                )}
                
                {artist.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{artist.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Descripción */}
            {artist.description && (
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Descripción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{artist.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Notas Internas */}
            {artist.notes && (
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Notas Internas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap text-muted-foreground">{artist.notes}</pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enlaces Rápidos */}
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/documents?artist=${artist.id}`, '_blank')}
                  className="hover-lift"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Documentos
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/budgets?artist=${artist.id}`, '_blank')}
                  className="hover-lift"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Presupuestos
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/solicitudes?artist=${artist.id}`, '_blank')}
                  className="hover-lift"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Solicitudes
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hover-lift"
                  disabled
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  Redes Sociales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}