import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Film, Music, Users, DollarSign, SplitSquareVertical, X } from 'lucide-react';

interface CreateSyncOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferCreated: () => void;
}

const PRODUCTION_TYPES = [
  { value: 'cine', label: 'Cine' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'serie', label: 'Serie TV' },
  { value: 'evento', label: 'Evento' },
  { value: 'videojuego', label: 'Videojuego' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'otro', label: 'Otro' },
];

const TERRITORIES = [
  { value: 'España', label: 'España' },
  { value: 'Europa', label: 'Europa' },
  { value: 'Mundo', label: 'Mundo' },
  { value: 'LATAM', label: 'Latinoamérica' },
  { value: 'USA', label: 'Estados Unidos' },
];

const MEDIA_OPTIONS = [
  'TV', 'Internet', 'Cine', 'RRSS', 'Radio', 'OOH', 'Streaming'
];

const USAGE_TYPES = [
  { value: 'background', label: 'Background / Incidental' },
  { value: 'featured', label: 'Featured / Destacada' },
  { value: 'main_title', label: 'Main Title / Cabecera' },
  { value: 'end_credits', label: 'End Credits / Créditos finales' },
  { value: 'trailer', label: 'Trailer / Promo' },
  { value: 'promo', label: 'Promocional' },
];

export function CreateSyncOfferDialog({ open, onOpenChange, onOfferCreated }: CreateSyncOfferDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('project');
  
  // Project Details
  const [productionTitle, setProductionTitle] = useState('');
  const [productionType, setProductionType] = useState('');
  const [productionCompany, setProductionCompany] = useState('');
  const [director, setDirector] = useState('');
  const [territory, setTerritory] = useState('España');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [durationYears, setDurationYears] = useState(1);

  // Music Usage
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [usageType, setUsageType] = useState('');
  const [usageDuration, setUsageDuration] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');

  // Contact Info
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterCompany, setRequesterCompany] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');

  // Financial
  const [totalBudget, setTotalBudget] = useState('');
  const [musicBudget, setMusicBudget] = useState('');
  const [syncFee, setSyncFee] = useState('');

  // Splits
  const [masterPercentage, setMasterPercentage] = useState(50);
  const [masterHolder, setMasterHolder] = useState('');
  const [publishingHolder, setPublishingHolder] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  const toggleMedia = (media: string) => {
    setSelectedMedia(prev => 
      prev.includes(media) 
        ? prev.filter(m => m !== media)
        : [...prev, media]
    );
  };

  const handleSubmit = async () => {
    if (!productionTitle || !productionType || !songTitle) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el título de producción, tipo y canción.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const syncFeeValue = syncFee ? parseFloat(syncFee) : null;
      const masterFee = syncFeeValue ? (syncFeeValue * masterPercentage) / 100 : null;
      const publishingFee = syncFeeValue ? (syncFeeValue * (100 - masterPercentage)) / 100 : null;

      const { error } = await supabase.from('sync_offers').insert({
        production_title: productionTitle,
        production_type: productionType,
        production_company: productionCompany || null,
        director: director || null,
        territory,
        media: selectedMedia,
        duration_years: durationYears,
        song_title: songTitle,
        song_artist: songArtist || null,
        usage_type: usageType || null,
        usage_duration: usageDuration || null,
        scene_description: sceneDescription || null,
        requester_name: requesterName || null,
        requester_email: requesterEmail || null,
        requester_company: requesterCompany || null,
        requester_phone: requesterPhone || null,
        total_budget: totalBudget ? parseFloat(totalBudget) : null,
        music_budget: musicBudget ? parseFloat(musicBudget) : null,
        sync_fee: syncFeeValue,
        master_fee: masterFee,
        publishing_fee: publishingFee,
        master_percentage: masterPercentage,
        publishing_percentage: 100 - masterPercentage,
        master_holder: masterHolder || null,
        publishing_holder: publishingHolder || null,
        notes: notes || null,
        phase: 'solicitud',
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Oferta creada",
        description: "La oferta de sincronización se ha creado correctamente.",
      });

      onOfferCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating sync offer:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la oferta de sincronización.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductionTitle('');
    setProductionType('');
    setProductionCompany('');
    setDirector('');
    setTerritory('España');
    setSelectedMedia([]);
    setDurationYears(1);
    setSongTitle('');
    setSongArtist('');
    setUsageType('');
    setUsageDuration('');
    setSceneDescription('');
    setRequesterName('');
    setRequesterEmail('');
    setRequesterCompany('');
    setRequesterPhone('');
    setTotalBudget('');
    setMusicBudget('');
    setSyncFee('');
    setMasterPercentage(50);
    setMasterHolder('');
    setPublishingHolder('');
    setNotes('');
    setActiveTab('project');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Nueva Oferta de Sincronización
          </DialogTitle>
          <DialogDescription>
            Registra una nueva solicitud de licencia para cine, publicidad o TV.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="project" className="flex items-center gap-1 text-xs">
              <Film className="h-3 w-3" />
              Producción
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-1 text-xs">
              <Music className="h-3 w-3" />
              Música
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              Contacto
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              Financiero
            </TabsTrigger>
            <TabsTrigger value="splits" className="flex items-center gap-1 text-xs">
              <SplitSquareVertical className="h-3 w-3" />
              Splits
            </TabsTrigger>
          </TabsList>

          {/* Project Details Tab */}
          <TabsContent value="project" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="production-title">Título de la Producción *</Label>
                <Input
                  id="production-title"
                  value={productionTitle}
                  onChange={(e) => setProductionTitle(e.target.value)}
                  placeholder="Ej: La Casa de Papel - Temporada 5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Producción *</Label>
                  <Select value={productionType} onValueChange={setProductionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Territorio</Label>
                  <Select value={territory} onValueChange={setTerritory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar territorio" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERRITORIES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="production-company">Productora</Label>
                  <Input
                    id="production-company"
                    value={productionCompany}
                    onChange={(e) => setProductionCompany(e.target.value)}
                    placeholder="Ej: Netflix, Atresmedia..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="director">Director</Label>
                  <Input
                    id="director"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="Nombre del director"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Medios</Label>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_OPTIONS.map((media) => (
                    <Badge
                      key={media}
                      variant={selectedMedia.includes(media) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => toggleMedia(media)}
                    >
                      {media}
                      {selectedMedia.includes(media) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duración de la Licencia: {durationYears} {durationYears === 1 ? 'año' : 'años'}</Label>
                <Slider
                  value={[durationYears]}
                  onValueChange={(v) => setDurationYears(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </TabsContent>

          {/* Music Usage Tab */}
          <TabsContent value="music" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="song-title">Título de la Canción *</Label>
                <Input
                  id="song-title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Nombre de la obra requerida"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="song-artist">Artista</Label>
                <Input
                  id="song-artist"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  placeholder="Intérprete o banda"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Uso</Label>
                  <Select value={usageType} onValueChange={setUsageType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar uso" />
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usage-duration">Duración del Uso</Label>
                  <Input
                    id="usage-duration"
                    value={usageDuration}
                    onChange={(e) => setUsageDuration(e.target.value)}
                    placeholder="Ej: 30s, 1:20, Full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scene-description">Descripción de la Escena</Label>
                <Textarea
                  id="scene-description"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="Describe brevemente cómo se usará la música en la producción..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester-name">Nombre del Solicitante</Label>
                  <Input
                    id="requester-name"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requester-company">Empresa</Label>
                  <Input
                    id="requester-company"
                    value={requesterCompany}
                    onChange={(e) => setRequesterCompany(e.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester-email">Email</Label>
                  <Input
                    id="requester-email"
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requester-phone">Teléfono</Label>
                  <Input
                    id="requester-phone"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total-budget">Presupuesto Total (€)</Label>
                  <Input
                    id="total-budget"
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="music-budget">Presupuesto Música (€)</Label>
                  <Input
                    id="music-budget"
                    type="number"
                    value={musicBudget}
                    onChange={(e) => setMusicBudget(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-fee">Sync Fee Propuesto (€)</Label>
                <Input
                  id="sync-fee"
                  type="number"
                  value={syncFee}
                  onChange={(e) => setSyncFee(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  Este es el precio total por la licencia de sincronización.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la negociación..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Splits Tab */}
          <TabsContent value="splits" className="space-y-4 mt-4">
            <div className="grid gap-6">
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Master (Sello)</p>
                    <p className="text-sm text-muted-foreground">Propietario de la grabación</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{masterPercentage}%</span>
                </div>
                
                <Slider
                  value={[masterPercentage]}
                  onValueChange={(v) => setMasterPercentage(v[0])}
                  min={0}
                  max={100}
                  step={5}
                />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Publishing (Editorial)</p>
                    <p className="text-sm text-muted-foreground">Propietario de la composición</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{100 - masterPercentage}%</span>
                </div>
              </div>

              {syncFee && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Master Fee</p>
                    <p className="text-xl font-bold">€{((parseFloat(syncFee) * masterPercentage) / 100).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Publishing Fee</p>
                    <p className="text-xl font-bold">€{((parseFloat(syncFee) * (100 - masterPercentage)) / 100).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="master-holder">Titular del Master</Label>
                  <Input
                    id="master-holder"
                    value={masterHolder}
                    onChange={(e) => setMasterHolder(e.target.value)}
                    placeholder="Nombre del sello / distribuidor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publishing-holder">Titular del Publishing</Label>
                  <Input
                    id="publishing-holder"
                    value={publishingHolder}
                    onChange={(e) => setPublishingHolder(e.target.value)}
                    placeholder="Editorial / Autor"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Oferta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}