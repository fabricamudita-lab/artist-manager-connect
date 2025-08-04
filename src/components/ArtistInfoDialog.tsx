import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { User, Phone, Mail, MapPin, Users, FileText, MessageCircle, Edit, Save, X } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  team_contacts: string | null;
  internal_notes: string | null;
  avatar_url: string | null;
  roles: ('artist' | 'management')[];
  active_role: 'artist' | 'management';
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
  const [artistProfile, setArtistProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergency_contact: '',
    team_contacts: '',
    internal_notes: '',
  });

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
        .from('profiles')
        .select('*')
        .eq('id', artistId)
        .single();

      if (error) throw error;

      setArtistProfile(data);
      setFormData({
        phone: data.phone || '',
        address: data.address || '',
        emergency_contact: data.emergency_contact || '',
        team_contacts: data.team_contacts || '',
        internal_notes: data.internal_notes || '',
      });
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del artista.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artistId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: formData.phone || null,
          address: formData.address || null,
          emergency_contact: formData.emergency_contact || null,
          team_contacts: formData.team_contacts || null,
          internal_notes: formData.internal_notes || null,
        })
        .eq('id', artistId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Información del artista actualizada correctamente.",
      });

      setEditing(false);
      fetchArtistProfile();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del artista.",
        variant: "destructive",
      });
    }
  };

  const canEdit = currentProfile?.active_role === 'management';

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">Cargando información del artista...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!artistProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">No se pudo cargar la información del artista.</div>
        </DialogContent>
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
          <DialogDescription>
            Información detallada para la gestión de giras
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={artistProfile.avatar_url || ''} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{artistProfile.full_name}</CardTitle>
                    <CardDescription>{artistProfile.email}</CardDescription>
                    <div className="flex gap-2 mt-2">
                      {artistProfile.roles.map((role) => (
                        <Badge key={role} variant={role === artistProfile.active_role ? 'default' : 'secondary'}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onChatOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onChatOpen(artistProfile.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chatear
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editing ? setEditing(false) : setEditing(true)}
                    >
                      {editing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input value={artistProfile.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </Label>
                  {editing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Número de teléfono"
                    />
                  ) : (
                    <Input value={artistProfile.phone || 'No especificado'} disabled />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </Label>
                {editing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dirección completa"
                  />
                ) : (
                  <Input value={artistProfile.address || 'No especificada'} disabled />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contactos de Emergencia y Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contacto de Emergencia</Label>
                {editing ? (
                  <Input
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    placeholder="Nombre y teléfono de contacto de emergencia"
                  />
                ) : (
                  <Input value={artistProfile.emergency_contact || 'No especificado'} disabled />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Contactos del Equipo</Label>
                {editing ? (
                  <Textarea
                    value={formData.team_contacts}
                    onChange={(e) => setFormData({ ...formData, team_contacts: e.target.value })}
                    placeholder="Manager, agente, técnico, etc. (separar con líneas)"
                    rows={3}
                  />
                ) : (
                  <Textarea 
                    value={artistProfile.team_contacts || 'No especificados'} 
                    disabled 
                    rows={3}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas Internas
                </CardTitle>
                <CardDescription>
                  Información confidencial para uso interno del equipo de management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  {editing ? (
                    <Textarea
                      value={formData.internal_notes}
                      onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                      placeholder="Preferencias, requisitos especiales, historial, etc."
                      rows={4}
                    />
                  ) : (
                    <Textarea 
                      value={artistProfile.internal_notes || 'Sin notas'} 
                      disabled 
                      rows={4}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}