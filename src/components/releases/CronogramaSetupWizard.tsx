import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Music, Disc3, Video, Package, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type ReleaseConfig } from '@/lib/releaseTimelineTemplates';

interface CronogramaSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: ReleaseConfig) => void;
  initialReleaseDate?: Date | null;
}

const SONG_OPTIONS = [1, 2, 3, 4, 5, '6+'] as const;
const SINGLES_OPTIONS = [0, 1, 2, 3] as const;

export default function CronogramaSetupWizard({
  open,
  onOpenChange,
  onGenerate,
  initialReleaseDate,
}: CronogramaSetupWizardProps) {
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(
    initialReleaseDate || undefined
  );
  const [physicalDate, setPhysicalDate] = useState<Date | undefined>(undefined);
  const [numSongs, setNumSongs] = useState<number>(1);
  const [numSingles, setNumSingles] = useState<number>(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasPhysical, setHasPhysical] = useState(false);

  const handleGenerate = () => {
    if (!releaseDate) return;

    const config: ReleaseConfig = {
      releaseDate,
      physicalDate: physicalDate || null,
      numSongs: numSongs,
      numSingles,
      hasVideo,
      hasPhysical,
    };

    onGenerate(config);
    onOpenChange(false);
  };

  const canGenerate = !!releaseDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configurar Cronograma
          </DialogTitle>
          <DialogDescription>
            Responde algunas preguntas y generaremos automáticamente las tareas 
            con fechas sugeridas basadas en estándares de la industria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Release Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Fecha de Lanzamiento Digital *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !releaseDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {releaseDate
                    ? format(releaseDate, 'PPP', { locale: es })
                    : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={releaseDate}
                  onSelect={setReleaseDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Physical Date (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Package className="w-4 h-4" />
              Fecha de Venta Física (opcional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !physicalDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {physicalDate
                    ? format(physicalDate, 'PPP', { locale: es })
                    : 'Sin fecha física'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={physicalDate}
                  onSelect={setPhysicalDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Number of Songs */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Music className="w-4 h-4 text-blue-500" />
              Número de canciones
            </Label>
            <div className="flex gap-2">
              {SONG_OPTIONS.map((option) => {
                const value = option === '6+' ? 6 : option;
                const isSelected = numSongs === value;
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNumSongs(value)}
                    className="flex-1"
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Number of Singles */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-purple-500" />
              Singles a lanzar antes del álbum
            </Label>
            <div className="flex gap-2">
              {SINGLES_OPTIONS.map((option) => {
                const isSelected = numSingles === option;
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNumSingles(option)}
                    className="flex-1"
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Video className="w-4 h-4 text-pink-500" />
                ¿Incluir videoclip?
              </Label>
              <Switch checked={hasVideo} onCheckedChange={setHasVideo} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Package className="w-4 h-4 text-yellow-500" />
                ¿Fabricación física (vinilo/CD)?
              </Label>
              <Switch checked={hasPhysical} onCheckedChange={setHasPhysical} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generar Cronograma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
