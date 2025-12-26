import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Trash2, Upload, Loader2, Users, Clock, Euro, 
  FileText, Music, GripVertical, Settings2
} from 'lucide-react';
import { toast } from 'sonner';

interface BookingProduct {
  id?: string;
  name: string;
  description?: string;
  feeMin?: number;
  feeMax?: number;
  crewSize: number;
  performanceDurationMinutes?: number;
  riderUrl?: string;
  hospitalityRequirements?: string;
}

interface ArtistFormatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
}

const PRESET_FORMATS = [
  { name: 'Acústico', crewSize: 2 },
  { name: 'Dúo', crewSize: 2 },
  { name: 'Trío', crewSize: 3 },
  { name: 'Cuarteto', crewSize: 4 },
  { name: 'Quinteto', crewSize: 5 },
  { name: 'Banda Completa', crewSize: 6 },
  { name: 'Full Band + Luces', crewSize: 8 },
  { name: 'DJ Set', crewSize: 1 },
];

export function ArtistFormatsDialog({ 
  open, 
  onOpenChange, 
  artistId, 
  artistName 
}: ArtistFormatsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formats, setFormats] = useState<BookingProduct[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch existing formats
  const { data: existingFormats, isLoading } = useQuery({
    queryKey: ['booking-products', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_products')
        .select('*')
        .eq('artist_id', artistId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: open && !!artistId,
  });

  // Initialize formats from database
  useEffect(() => {
    if (existingFormats) {
      setFormats(existingFormats.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description || undefined,
        feeMin: f.fee_min || undefined,
        feeMax: f.fee_max || undefined,
        crewSize: f.crew_size || 1,
        performanceDurationMinutes: f.performance_duration_minutes || undefined,
        riderUrl: f.rider_url || undefined,
        hospitalityRequirements: f.hospitality_requirements || undefined,
      })));
    }
  }, [existingFormats]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');

      // Delete all existing formats for this artist
      await supabase
        .from('booking_products')
        .delete()
        .eq('artist_id', artistId);

      // Insert all new/updated formats
      if (formats.length > 0) {
        const { error } = await supabase.from('booking_products').insert(
          formats.map((f, idx) => ({
            artist_id: artistId,
            name: f.name,
            description: f.description || null,
            fee_min: f.feeMin || null,
            fee_max: f.feeMax || null,
            crew_size: f.crewSize,
            performance_duration_minutes: f.performanceDurationMinutes || null,
            rider_url: f.riderUrl || null,
            hospitality_requirements: f.hospitalityRequirements || null,
            sort_order: idx,
            created_by: user.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-products', artistId] });
      toast.success('Formatos guardados correctamente');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving formats:', error);
      toast.error('Error al guardar los formatos');
    },
  });

  const handleAddFormat = (preset?: { name: string; crewSize: number }) => {
    setFormats([
      ...formats,
      {
        name: preset?.name || 'Nuevo Formato',
        crewSize: preset?.crewSize || 1,
      },
    ]);
  };

  const handleRemoveFormat = (index: number) => {
    setFormats(formats.filter((_, i) => i !== index));
  };

  const handleUpdateFormat = (index: number, updates: Partial<BookingProduct>) => {
    setFormats(formats.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const handleRiderUpload = async (index: number, file: File) => {
    if (!user || !artistId) return;

    setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${artistId}/riders/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      handleUpdateFormat(index, { riderUrl: urlData.publicUrl });
      toast.success('Rider subido correctamente');
    } catch (error) {
      console.error('Error uploading rider:', error);
      toast.error('Error al subir el rider');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Filter out presets that are already added
  const availablePresets = PRESET_FORMATS.filter(
    preset => !formats.some(f => f.name.toLowerCase() === preset.name.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Formatos de Booking - {artistName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Add Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Añadir formato rápido</Label>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.map((preset) => (
                    <Badge
                      key={preset.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleAddFormat(preset)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Format Cards */}
            <div className="space-y-4">
              {formats.map((format, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={format.name}
                          onChange={(e) => handleUpdateFormat(index, { name: e.target.value })}
                          placeholder="Nombre del formato"
                          className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 w-[200px]"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFormat(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fee Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Euro className="w-4 h-4" />
                          Caché Mínimo
                        </Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={format.feeMin || ''}
                          onChange={(e) =>
                            handleUpdateFormat(index, { feeMin: parseFloat(e.target.value) || undefined })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Euro className="w-4 h-4" />
                          Caché Máximo
                        </Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={format.feeMax || ''}
                          onChange={(e) =>
                            handleUpdateFormat(index, { feeMax: parseFloat(e.target.value) || undefined })
                          }
                        />
                      </div>
                    </div>

                    {/* Crew & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4" />
                          Tamaño del Crew
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={format.crewSize}
                          onChange={(e) =>
                            handleUpdateFormat(index, { crewSize: parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          Duración (min)
                        </Label>
                        <Input
                          type="number"
                          min="15"
                          step="15"
                          placeholder="90"
                          value={format.performanceDurationMinutes || ''}
                          onChange={(e) =>
                            handleUpdateFormat(index, {
                              performanceDurationMinutes: parseInt(e.target.value) || undefined,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Rider Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm">Rider Técnico (PDF)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={uploadingIndex === index}
                          className="flex-1"
                        >
                          {uploadingIndex === index ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {format.riderUrl ? 'Cambiar Rider' : 'Subir Rider'}
                        </Button>
                        {format.riderUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={format.riderUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              Ver
                            </a>
                          </Button>
                        )}
                        <input
                          type="file"
                          ref={(el) => (fileInputRefs.current[index] = el)}
                          className="hidden"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRiderUpload(index, file);
                          }}
                        />
                      </div>
                    </div>

                    {/* Hospitality Requirements */}
                    <div className="space-y-2">
                      <Label className="text-sm">Requisitos de Hospitalidad</Label>
                      <Textarea
                        placeholder="Catering, camerino, etc."
                        value={format.hospitalityRequirements || ''}
                        onChange={(e) =>
                          handleUpdateFormat(index, { hospitalityRequirements: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formats.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sin formatos configurados</h3>
                    <p className="text-muted-foreground mb-4">
                      Añade formatos de booking para este artista
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Add Custom Format */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddFormat()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Formato Personalizado
            </Button>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Formatos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
