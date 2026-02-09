import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ContactTagsInput } from './ContactTagsInput';
import { FIELD_PRESETS, detectPreset, getAllPresets, saveCustomPreset } from '@/lib/fieldConfigPresets';
import { Save } from 'lucide-react';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated: () => void;
}


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
  const [fieldConfig, setFieldConfig] = useState<Record<string, boolean>>(DEFAULT_FIELD_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState(() => detectPreset(DEFAULT_FIELD_CONFIG));
  const [allPresets, setAllPresets] = useState(() => getAllPresets());
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
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
      // Check for duplicate email if provided
      if (formData.email.trim()) {
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('email', formData.email.trim())
          .limit(1);

        if (existingContacts && existingContacts.length > 0) {
          toast({
            title: "Contacto duplicado",
            description: `Ya existe un contacto con este email: ${existingContacts[0].name}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

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
    const next = { ...fieldConfig, [field]: enabled };
    setFieldConfig(next);
    setSelectedPreset(detectPreset(next));
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey === 'custom') return;
    const all = getAllPresets();
    const preset = all[presetKey];
    if (preset) {
      setFieldConfig(preset.config);
      setSelectedPreset(presetKey);
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const key = saveCustomPreset(newPresetName.trim(), fieldConfig);
    setAllPresets(getAllPresets());
    setSelectedPreset(key);
    setSavingPreset(false);
    setNewPresetName("");
    toast({ title: "Plantilla guardada", description: `"${newPresetName.trim()}" se ha guardado correctamente.` });
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
              <div className="space-y-1.5">
                <Label className="text-sm">Plantilla</Label>
                <Select value={selectedPreset} onValueChange={applyPreset}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(allPresets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {savingPreset ? (
                  <div className="flex gap-1.5 mt-1.5">
                    <Input
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Nombre de la plantilla"
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSavePreset} disabled={!newPresetName.trim()}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start text-xs text-muted-foreground mt-1"
                    onClick={() => setSavingPreset(true)}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Guardar como plantilla
                  </Button>
                )}
              </div>
              <Separator className="my-2" />
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