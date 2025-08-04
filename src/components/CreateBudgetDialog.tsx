import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Music, Mic, Megaphone, Video, Package } from 'lucide-react';

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const budgetTypes = [
  { value: 'concierto', label: 'Actuación / Concierto', icon: Mic },
  { value: 'produccion_musical', label: 'Producción Musical', icon: Music },
  { value: 'campana_promocional', label: 'Campaña Promocional', icon: Megaphone },
  { value: 'videoclip', label: 'Videoclip', icon: Video },
  { value: 'otros', label: 'Otros', icon: Package },
];

export default function CreateBudgetDialog({ open, onOpenChange, onSuccess }: CreateBudgetDialogProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    venue: '',
    budget_status: 'nacional' as 'nacional' | 'internacional',
    show_status: 'pendiente' as 'confirmado' | 'pendiente' | 'cancelado',
    internal_notes: '',
    artist_id: '',
  });
  const [loading, setLoading] = useState(false);

  const handleTypeSelection = (type: string) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedType || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Por favor, completa los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .insert({
          type: selectedType as 'concierto' | 'produccion_musical' | 'campana_promocional' | 'videoclip' | 'otros',
          name: formData.name,
          city: formData.city,
          country: formData.country,
          venue: formData.venue,
          budget_status: formData.budget_status,
          show_status: formData.show_status,
          internal_notes: formData.internal_notes,
          artist_id: formData.artist_id || null,
          created_by: profile?.user_id
        });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Presupuesto creado correctamente"
      });

      // Reset form
      setStep(1);
      setSelectedType('');
      setFormData({
        name: '',
        city: '',
        country: '',
        venue: '',
        budget_status: 'nacional',
        show_status: 'pendiente',
        internal_notes: '',
        artist_id: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType('');
    setFormData({
      name: '',
      city: '',
      country: '',
      venue: '',
      budget_status: 'nacional',
      show_status: 'pendiente',
      internal_notes: '',
      artist_id: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Seleccionar Tipo de Presupuesto' : 'Detalles del Presupuesto'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Elige el tipo de presupuesto que deseas crear:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleTypeSelection(type.value)}
                  >
                    <CardHeader className="text-center pb-4">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <CardTitle className="text-lg">{type.label}</CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
              {(() => {
                const selectedTypeObj = budgetTypes.find(t => t.value === selectedType);
                if (selectedTypeObj) {
                  const Icon = selectedTypeObj.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="font-medium">{selectedTypeObj.label}</span>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nombre del evento *</Label>
                <Input
                  id="name"
                  placeholder="Ej. 12.07.2025 – Barcelona – Festival Alma"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Barcelona"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  placeholder="España"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="venue">Lugar / Ciclo / Festival</Label>
                <Input
                  id="venue"
                  placeholder="Festival Alma - Escenario Principal"
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="budget_status">Estado del presupuesto</Label>
                <Select value={formData.budget_status} onValueChange={(value) => handleInputChange('budget_status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="show_status">Estado del show</Label>
                <Select value={formData.show_status} onValueChange={(value) => handleInputChange('show_status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="internal_notes">Notas internas</Label>
                <Textarea
                  id="internal_notes"
                  placeholder="Notas adicionales sobre el presupuesto..."
                  value={formData.internal_notes}
                  onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Creando...' : 'Crear Presupuesto'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}