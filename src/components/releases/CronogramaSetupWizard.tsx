import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, Music, Disc3, Video, Package, Sparkles,
  ChevronRight, ChevronLeft, Building2, Globe, Megaphone,
  StickyNote, Check,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { type ReleaseConfig, type SingleConfig } from '@/lib/releaseTimelineTemplates';

// ── Types ──

export interface TrackOption {
  id: string;
  title: string;
  track_number: number;
  isrc: string | null;
}

interface SingleRow {
  trackId?: string;
  name: string;
  date?: Date;
}

interface CronogramaSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: ReleaseConfig) => void;
  initialReleaseDate?: Date | null;
  initialNumSongs?: number;
  tracks?: TrackOption[];
}

// ── Constants ──

const SONG_OPTIONS = [1, 2, 3, 4, 5, '6+'] as const;
const TERRITORIES = [
  { value: 'worldwide', label: 'Mundial' },
  { value: 'spain', label: 'España' },
  { value: 'latam', label: 'LATAM' },
  { value: 'usa', label: 'USA' },
  { value: 'europe', label: 'Europa' },
];

// ── Step Indicator ──

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-primary/20 text-primary',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <Check className="w-3.5 h-3.5" /> : step}
            </div>
            {i < total - 1 && (
              <div className={cn('w-8 h-0.5', step < current ? 'bg-primary/40' : 'bg-muted')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Single Row Component ──

function SingleRowEditor({
  index,
  row,
  onChange,
  tracks,
}: {
  index: number;
  row: SingleRow;
  onChange: (row: SingleRow) => void;
  tracks: TrackOption[];
}) {
  const [trackOpen, setTrackOpen] = useState(false);

  const selectedTrack = tracks.find((t) => t.id === row.trackId);

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
      <span className="text-xs font-semibold text-muted-foreground mt-2.5 w-6 shrink-0">
        {index + 1}.
      </span>

      {/* Track combobox or free text */}
      <div className="flex-1 space-y-2">
        <Popover open={trackOpen} onOpenChange={setTrackOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-9">
              {selectedTrack ? (
                <span className="truncate">
                  {selectedTrack.track_number}. {selectedTrack.title}
                  {selectedTrack.isrc && (
                    <span className="ml-1 text-muted-foreground text-xs">({selectedTrack.isrc})</span>
                  )}
                </span>
              ) : row.name ? (
                <span className="truncate">{row.name}</span>
              ) : (
                <span className="text-muted-foreground">Vincular a canción…</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar canción…"
                value={row.trackId ? '' : row.name}
                onValueChange={(val) => {
                  if (!tracks.find((t) => t.title.toLowerCase() === val.toLowerCase())) {
                    onChange({ ...row, trackId: undefined, name: val });
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>
                  {row.name ? (
                    <span className="text-xs">Se usará "{row.name}" como nombre libre</span>
                  ) : (
                    'Sin resultados'
                  )}
                </CommandEmpty>
                <CommandGroup heading="Canciones del release">
                  {tracks.map((track) => (
                    <CommandItem
                      key={track.id}
                      value={track.title}
                      onSelect={() => {
                        onChange({ ...row, trackId: track.id, name: track.title });
                        setTrackOpen(false);
                      }}
                    >
                      <span className="truncate">
                        {track.track_number}. {track.title}
                      </span>
                      {track.isrc && (
                        <span className="ml-auto text-xs text-muted-foreground">{track.isrc}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Optional date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={cn('h-7 text-xs', !row.date && 'text-muted-foreground')}>
              <CalendarIcon className="w-3 h-3 mr-1" />
              {row.date ? format(row.date, 'dd MMM yyyy', { locale: es }) : 'Fecha (opcional)'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={row.date}
              onSelect={(d) => onChange({ ...row, date: d || undefined })}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CronogramaSetupWizard({
  open,
  onOpenChange,
  onGenerate,
  initialReleaseDate,
  initialNumSongs = 1,
  tracks = [],
}: CronogramaSetupWizardProps) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  // Step 1 state
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(initialReleaseDate || undefined);
  const [physicalDate, setPhysicalDate] = useState<Date | undefined>(undefined);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasPhysical, setHasPhysical] = useState(false);

  // Step 2 state
  const [numSongs, setNumSongs] = useState<number>(initialNumSongs);
  const [numSingles, setNumSingles] = useState<number>(0);
  const [singleRows, setSingleRows] = useState<SingleRow[]>([]);

  // Step 3 state
  const [distributor, setDistributor] = useState('');
  const [label, setLabel] = useState('');
  const [territory, setTerritory] = useState('');
  const [priorityPitching, setPriorityPitching] = useState(false);
  const [notes, setNotes] = useState('');

  // Sync initial values
  useEffect(() => {
    setNumSongs(initialNumSongs);
    if (numSingles >= initialNumSongs) {
      setNumSingles(Math.max(0, initialNumSongs - 1));
    }
  }, [initialNumSongs]);

  // Reset step on open
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  // Keep singleRows in sync with numSingles
  useEffect(() => {
    setSingleRows((prev) => {
      if (numSingles <= 0) return [];
      const next = [...prev];
      while (next.length < numSingles) next.push({ name: '', trackId: undefined, date: undefined });
      return next.slice(0, numSingles);
    });
  }, [numSingles]);

  const singlesOptions = Array.from({ length: numSongs }, (_, i) => i);

  const handleGenerate = () => {
    if (!releaseDate) return;

    const singleDates: SingleConfig[] | undefined =
      singleRows.length > 0
        ? singleRows.map((r) => ({
            name: r.name || undefined,
            date: r.date || releaseDate,
            trackId: r.trackId || undefined,
          }))
        : undefined;

    const config: ReleaseConfig = {
      releaseDate,
      physicalDate: physicalDate || null,
      numSongs,
      numSingles,
      hasVideo,
      hasPhysical,
      singleDates,
      distributor: distributor || undefined,
      label: label || undefined,
      territory: territory || undefined,
      priorityPitching: priorityPitching || undefined,
      notes: notes || undefined,
    };

    onGenerate(config);
    onOpenChange(false);
  };

  const canNext = step === 1 ? !!releaseDate : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configurar Cronograma
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Define las fechas clave y el formato de tu lanzamiento.'}
            {step === 2 && 'Configura las canciones y vincula los singles a tu tracklist.'}
            {step === 3 && 'Información adicional opcional para personalizar el cronograma.'}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {/* ═══════ STEP 1 ═══════ */}
          {step === 1 && (
            <div className="space-y-6 py-2">
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
                      className={cn('w-full justify-start text-left font-normal', !releaseDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {releaseDate ? format(releaseDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={releaseDate} onSelect={setReleaseDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Physical Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  Fecha de Venta Física (opcional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !physicalDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {physicalDate ? format(physicalDate, 'PPP', { locale: es }) : 'Sin fecha física'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={physicalDate} onSelect={setPhysicalDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
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
          )}

          {/* ═══════ STEP 2 ═══════ */}
          {step === 2 && (
            <div className="space-y-6 py-2">
              {/* Number of Songs */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-blue-500" />
                  Número de canciones
                </Label>
                <div className="flex gap-2">
                  {SONG_OPTIONS.map((option) => {
                    const value = option === '6+' ? 6 : option;
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={numSongs === value ? 'default' : 'outline'}
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
                <div className="flex flex-wrap gap-2">
                  {singlesOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={numSingles === option ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNumSingles(option)}
                      className="w-12"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {numSongs > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Puedes lanzar hasta {numSongs - 1} singles antes del lanzamiento principal
                  </p>
                )}
              </div>

              {/* Single rows with track linking */}
              {numSingles > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Configurar Singles</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Vincula cada single a una canción del tracklist o escribe un nombre libre.
                  </p>
                  <div className="space-y-2">
                    {singleRows.map((row, i) => (
                      <SingleRowEditor
                        key={i}
                        index={i}
                        row={row}
                        onChange={(updated) => {
                          const next = [...singleRows];
                          next[i] = updated;
                          setSingleRows(next);
                        }}
                        tracks={tracks}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ STEP 3 ═══════ */}
          {step === 3 && (
            <div className="space-y-5 py-2">
              <p className="text-xs text-muted-foreground">
                Todos los campos de este paso son opcionales.
              </p>

              {/* Distributor */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Building2 className="w-4 h-4" />
                  Distribuidora
                </Label>
                <Input
                  placeholder="ej: DistroKid, TuneCore, The Orchard…"
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
                />
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Disc3 className="w-4 h-4" />
                  Sello Discográfico
                </Label>
                <Input
                  placeholder="ej: Sony Music, Independiente…"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              {/* Territory */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Globe className="w-4 h-4" />
                  Territorio Principal
                </Label>
                <Select value={territory} onValueChange={setTerritory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar territorio" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRITORIES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority pitching */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm cursor-pointer">
                  <Megaphone className="w-4 h-4" />
                  Prioridad de pitching editorial
                </Label>
                <Switch checked={priorityPitching} onCheckedChange={setPriorityPitching} />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                  <StickyNote className="w-4 h-4" />
                  Notas adicionales
                </Label>
                <Textarea
                  placeholder="Cualquier contexto relevante para el cronograma…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!releaseDate}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar Cronograma
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
