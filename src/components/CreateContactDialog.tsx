import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ContactTagsInput } from './ContactTagsInput';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated: () => void;
}

const CATEGORIES = [
  { value: 'artistas', label: 'Artistas' },
  { value: 'tecnicos', label: 'Técnicos' },
  { value: 'contables', label: 'Contables' },
  { value: 'prensa', label: 'Prensa' },
  { value: 'general', label: 'General' },
];

const DEFAULT_FIELD_CONFIG = {
  stage_name: true,
  legal_name: true,
  email: true,
  phone: true,
  address: false,
  bank_info: false,
  iban: false,
  clothing_size: false,
  shoe_size: false,
  allergies: false,
  special_needs: false,
  contract_url: false,
  preferred_hours: false,
  company: true,
  role: true,
  notes: true,
};

const FIELD_LABELS = {
  stage_name: 'Nombre artístico',
  legal_name: 'Nombre legal',
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  bank_info: 'Banco',
  iban: 'IBAN',
  clothing_size: 'Talla de ropa',
  shoe_size: 'Talla de calzado',
  allergies: 'Alergias',
  special_needs: 'Necesidades especiales',
  contract_url: 'Contrato (URL)',
  preferred_hours: 'Horarios preferidos',
  company: 'Empresa',
  role: 'Rol',
  notes: 'Notas',
};

export function CreateContactDialog({ open, onOpenChange, onContactCreated }: CreateContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG);
  const [tags, setTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    stage_name: '',
    legal_name: '',
    email: '',
    phone: '',
    address: '',
    bank_info: '',
    iban: '',
    clothing_size: '',
    shoe_size: '',
    allergies: '',
    special_needs: '',
    contract_url: '',
    preferred_hours: '',
    company: '',
    role: '',
    city: '',
    country: '',
    category: 'general',
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
      const { error } = await supabase
        .from('contacts')
        .insert({
          ...formData,
          tags: tags,
          field_config: fieldConfig,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Contacto creado correctamente",
      });

      onContactCreated();
      setTags([]);
      setFormData({
        name: '',
        stage_name: '',
        legal_name: '',
        email: '',
        phone: '',
        address: '',
        bank_info: '',
        iban: '',
        clothing_size: '',
        shoe_size: '',
        allergies: '',
        special_needs: '',
        contract_url: '',
        preferred_hours: '',
        company: '',
        role: '',
        city: '',
        country: '',
        category: 'general',
        notes: '',
      });
      setFieldConfig(DEFAULT_FIELD_CONFIG);
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el contacto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFieldConfig = (field: string, enabled: boolean) => {
    setFieldConfig(prev => ({ ...prev, [field]: enabled }));
  };

  const renderField = (field: keyof typeof formData, type: 'input' | 'textarea' = 'input') => {
    if (!fieldConfig[field as keyof typeof fieldConfig]) return null;

    const Component = type === 'textarea' ? Textarea : Input;
    
    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field}>{FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</Label>
        <Component
          id={field}
          value={formData[field]}
          onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={`Introduce ${FIELD_LABELS[field as keyof typeof FIELD_LABELS].toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Contacto</DialogTitle>
          <DialogDescription>
            Configura los campos que quieres mostrar para este contacto
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Campos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(FIELD_LABELS).map(([field, label]) => (
                <div key={field} className="flex items-center justify-between">
                  <Label htmlFor={`config-${field}`} className="text-sm">
                    {label}
                  </Label>
                  <Switch
                    id={`config-${field}`}
                    checked={fieldConfig[field as keyof typeof fieldConfig]}
                    onCheckedChange={(checked) => updateFieldConfig(field, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Form Panel */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info - Always Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre principal del contacto"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderField('role')}
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('stage_name')}
                {renderField('legal_name')}
                {renderField('email')}
                {renderField('phone')}
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="País"
                  />
                </div>
              </div>

              {renderField('address', 'textarea')}
              {renderField('company')}

              {/* Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('bank_info')}
                {renderField('iban')}
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('clothing_size')}
                {renderField('shoe_size')}
              </div>

              {renderField('allergies', 'textarea')}
              {renderField('special_needs', 'textarea')}
              {renderField('contract_url')}
              {renderField('preferred_hours', 'textarea')}
              {renderField('notes', 'textarea')}

              {/* Tags Section */}
              <div className="pt-4 border-t">
                <ContactTagsInput
                  value={tags}
                  onChange={setTags}
                  label="Etiquetas"
                  placeholder="Añadir etiqueta... #prensa #paris"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear Contacto"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}