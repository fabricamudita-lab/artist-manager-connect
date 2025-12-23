import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, UserCheck, Building, Mail, Shield } from 'lucide-react';

interface AddTeamContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded: () => void;
}

const TEAM_CATEGORIES = [
  { value: 'banda', label: 'Banda', icon: Users },
  { value: 'artistico', label: 'Equipo Artístico', icon: Users },
  { value: 'tecnico', label: 'Equipo Técnico', icon: UserCheck },
  { value: 'management', label: 'Management', icon: Building },
  { value: 'comunicacion', label: 'Comunicación', icon: Mail },
  { value: 'legal', label: 'Legal', icon: Shield },
  { value: 'otro', label: 'Otros', icon: Users },
];

export function AddTeamContactDialog({ open, onOpenChange, onContactAdded }: AddTeamContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basico');
  const [formData, setFormData] = useState({
    // Datos básicos
    name: '',
    stage_name: '',
    legal_name: '',
    role: '',
    team_category: 'banda',
    // Contacto
    email: '',
    phone: '',
    preferred_hours: '',
    // Dirección
    address: '',
    city: '',
    country: '',
    // Datos personales
    clothing_size: '',
    shoe_size: '',
    allergies: '',
    special_needs: '',
    // Financiero
    iban: '',
    bank_info: '',
    // Notas
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create a contact with is_team_member flag
      const { error } = await supabase
        .from('contacts')
        .insert({
          name: formData.name.trim(),
          stage_name: formData.stage_name || null,
          legal_name: formData.legal_name || null,
          role: formData.role || null,
          category: formData.team_category,
          email: formData.email || null,
          phone: formData.phone || null,
          preferred_hours: formData.preferred_hours || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
          clothing_size: formData.clothing_size || null,
          shoe_size: formData.shoe_size || null,
          allergies: formData.allergies || null,
          special_needs: formData.special_needs || null,
          iban: formData.iban || null,
          bank_info: formData.bank_info || null,
          notes: formData.notes || null,
          created_by: user.id,
          field_config: {
            is_team_member: true,
            team_category: formData.team_category,
          },
        });

      if (error) throw error;

      toast({
        title: "Miembro añadido",
        description: `${formData.name} se ha añadido al equipo`,
      });

      // Reset form
      setFormData({
        name: '',
        stage_name: '',
        legal_name: '',
        role: '',
        team_category: 'banda',
        email: '',
        phone: '',
        preferred_hours: '',
        address: '',
        city: '',
        country: '',
        clothing_size: '',
        shoe_size: '',
        allergies: '',
        special_needs: '',
        iban: '',
        bank_info: '',
        notes: '',
      });
      setActiveTab('basico');
      onContactAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el miembro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Miembro al Equipo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="contacto">Contacto</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="financiero">Financiero</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Nombre y apellidos"
                  />
                </div>
                <div>
                  <Label htmlFor="stage_name">Nombre artístico</Label>
                  <Input
                    id="stage_name"
                    value={formData.stage_name}
                    onChange={(e) => updateField('stage_name', e.target.value)}
                    placeholder="Nombre de escenario"
                  />
                </div>
                <div>
                  <Label htmlFor="legal_name">Nombre legal/fiscal</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => updateField('legal_name', e.target.value)}
                    placeholder="Para contratos y facturas"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol / Instrumento</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    placeholder="Ej: Batería, Manager, Fotógrafo..."
                  />
                </div>
                <div>
                  <Label htmlFor="team_category">Categoría</Label>
                  <Select value={formData.team_category} onValueChange={(value) => updateField('team_category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacto" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="preferred_hours">Horario preferido de contacto</Label>
                  <Input
                    id="preferred_hours"
                    value={formData.preferred_hours}
                    onChange={(e) => updateField('preferred_hours', e.target.value)}
                    placeholder="Ej: Lunes a viernes 10:00-14:00"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Calle, número, piso..."
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Información útil para tours, riders y logística
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clothing_size">Talla de ropa</Label>
                  <Input
                    id="clothing_size"
                    value={formData.clothing_size}
                    onChange={(e) => updateField('clothing_size', e.target.value)}
                    placeholder="Ej: M, L, XL..."
                  />
                </div>
                <div>
                  <Label htmlFor="shoe_size">Talla de calzado</Label>
                  <Input
                    id="shoe_size"
                    value={formData.shoe_size}
                    onChange={(e) => updateField('shoe_size', e.target.value)}
                    placeholder="Ej: 42"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="allergies">Alergias alimentarias/médicas</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => updateField('allergies', e.target.value)}
                    placeholder="Alergias a alimentos, medicamentos..."
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="special_needs">Necesidades especiales</Label>
                  <Textarea
                    id="special_needs"
                    value={formData.special_needs}
                    onChange={(e) => updateField('special_needs', e.target.value)}
                    placeholder="Requisitos de accesibilidad, dieta especial, etc."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financiero" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Datos para pagos y facturación
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => updateField('iban', e.target.value)}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_info">Información bancaria adicional</Label>
                  <Textarea
                    id="bank_info"
                    value={formData.bank_info}
                    onChange={(e) => updateField('bank_info', e.target.value)}
                    placeholder="Titular de la cuenta, banco, SWIFT/BIC para transferencias internacionales..."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notas" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Notas privadas sobre este miembro del equipo..."
                  rows={6}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Añadiendo...' : 'Añadir al Equipo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
