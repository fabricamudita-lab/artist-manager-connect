import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ReleaseBudgetContactField } from '@/components/releases/ReleaseBudgetContactField';
import { ProducerSelector, SingleProducerSelector, type ProducerRef } from '@/components/releases/ProducerSelector';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  CalendarIcon, ChevronLeft, ChevronRight, Loader2, Plus, X, Check,
  Disc3, Music, Camera, Megaphone, Truck, UtensilsCrossed, BedDouble,
  Clapperboard, Package, ShieldAlert, Settings, Globe, GitMerge, Calculator, Blend, RotateCcw
} from 'lucide-react';
import type { Release, ReleaseMilestone } from '@/hooks/useReleases';

// ─── TERRITORY OPTIONS ────────────────────────────────────────────
const TERRITORY_GROUPS = [
  { label: 'Global', options: [{ value: 'GLOBAL', label: 'Global (todos los territorios)' }] },
  { label: 'Europa', options: [
    { value: 'ES', label: 'España' }, { value: 'FR', label: 'Francia' }, { value: 'DE', label: 'Alemania' },
    { value: 'IT', label: 'Italia' }, { value: 'GB', label: 'Reino Unido' }, { value: 'PT', label: 'Portugal' },
    { value: 'NL', label: 'Países Bajos' }, { value: 'BE', label: 'Bélgica' }, { value: 'SE', label: 'Suecia' },
    { value: 'NO', label: 'Noruega' }, { value: 'CH', label: 'Suiza' }, { value: 'AT', label: 'Austria' },
    { value: 'PL', label: 'Polonia' }, { value: 'IE', label: 'Irlanda' }, { value: 'DK', label: 'Dinamarca' },
    { value: 'FI', label: 'Finlandia' }, { value: 'GR', label: 'Grecia' }, { value: 'CZ', label: 'Rep. Checa' },
    { value: 'RO', label: 'Rumanía' }, { value: 'HU', label: 'Hungría' },
  ]},
  { label: 'Latinoamérica', options: [
    { value: 'MX', label: 'México' }, { value: 'AR', label: 'Argentina' }, { value: 'CO', label: 'Colombia' },
    { value: 'CL', label: 'Chile' }, { value: 'PE', label: 'Perú' }, { value: 'EC', label: 'Ecuador' },
    { value: 'UY', label: 'Uruguay' }, { value: 'BR', label: 'Brasil' }, { value: 'VE', label: 'Venezuela' },
    { value: 'CR', label: 'Costa Rica' }, { value: 'PA', label: 'Panamá' }, { value: 'DO', label: 'Rep. Dominicana' },
    { value: 'GT', label: 'Guatemala' }, { value: 'PY', label: 'Paraguay' }, { value: 'BO', label: 'Bolivia' },
  ]},
  { label: 'Norteamérica', options: [
    { value: 'US', label: 'Estados Unidos' }, { value: 'CA', label: 'Canadá' },
  ]},
  { label: 'Asia-Pacífico', options: [
    { value: 'JP', label: 'Japón' }, { value: 'KR', label: 'Corea del Sur' }, { value: 'AU', label: 'Australia' },
    { value: 'NZ', label: 'Nueva Zelanda' }, { value: 'IN', label: 'India' }, { value: 'CN', label: 'China' },
    { value: 'PH', label: 'Filipinas' }, { value: 'TH', label: 'Tailandia' },
  ]},
  { label: 'África y Oriente Medio', options: [
    { value: 'MA', label: 'Marruecos' }, { value: 'ZA', label: 'Sudáfrica' }, { value: 'AE', label: 'EAU' },
    { value: 'EG', label: 'Egipto' }, { value: 'NG', label: 'Nigeria' }, { value: 'IL', label: 'Israel' },
    { value: 'SA', label: 'Arabia Saudí' }, { value: 'TR', label: 'Turquía' },
  ]},
];

const ALL_TERRITORIES = TERRITORY_GROUPS.flatMap(g => g.options);

// ─── SERVICE OPTIONS ──────────────────────────────────────────────
const SERVICE_OPTIONS = [
  'Grabación', 'Mezcla', 'Mastering', 'Videoclip', 'Shooting', 'PR Nacional',
  'PR Internacional', 'RRSS / Contenidos', 'Diseño gráfico', 'Distribución',
  'Fabricación física', 'Stage / Residencia', 'Evento de lanzamiento',
];

// ─── MASTER TYPE OPTIONS ───────────────────────────────────────────
const MASTER_TYPE_OPTIONS = [
  { value: 'estereo',      label: 'Estéreo',              desc: 'Streaming & descarga digital (estándar universal)' },
  { value: 'vinilo',       label: 'Vinilo',                desc: 'Corte a lacquer, ecualización RIAA para prensado' },
  { value: 'atmos',        label: 'Dolby Atmos',           desc: 'Spatial Audio — Apple Music, Amazon, Tidal' },
  { value: 'stem',         label: 'Stem Master',           desc: 'Masters por stems separados (remix / sync)' },
  { value: 'cd',           label: 'CD (Red Book)',         desc: 'Prensado físico en CD, estándar ISO 9660' },
  { value: 'hires',        label: 'Hi-Res (24-bit/96kHz)', desc: 'Alta resolución — Qobuz, Tidal HiFi, Apple Lossless' },
  { value: 'instrumental', label: 'Instrumental / Karaoke', desc: 'Versión sin voz, obligatorio para sync y muchas distribuidoras' },
  { value: 'surround51',   label: '5.1 Surround',          desc: 'Mezcla surround para Blu-ray y contenido audiovisual' },
  { value: 'cassette',     label: 'Casete',                desc: 'Edición física en casete (nichos y reediciones)' },
  { value: 'tbd',          label: 'Por determinar',        desc: '' },
];

const FORMATOS_FISICOS = [
  { value: 'vinilo',       label: 'Vinilo (LP/12")' },
  { value: 'vinilo_doble', label: 'Vinilo doble (2xLP)' },
  { value: 'cd',           label: 'CD' },
  { value: 'deluxe',       label: 'Edición Deluxe' },
  { value: 'cassete',      label: 'Casete' },
  { value: 'otros',        label: 'Otros formatos' },
];

interface CreateReleaseBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  release: Release | null;
  trackCount: number;
}

// ─── CATEGORY MAP ──────────────────────────────────────────────────
const RELEASE_BUDGET_CATEGORIES = [
  { key: 'grabacion', name: 'Grabación', icon: 'Music', items: [
    'Producción (productor/es)', 'Ingeniería de grabación', 'Músicos adicionales',
    'Reparaciones / mantenimiento', 'Alquiler de estudio', 'Alquiler de equipo de grabación',
    'Ingeniería / pre / post / edición', 'Mezcla', 'Master'
  ]},
  { key: 'produccion', name: 'Producción', icon: 'Settings', items: [
    'Project management', 'Cuidados / logística personal', 'Making-of (grabación)',
    'Edición de cápsulas / piezas', 'Imprevistos por proyecto'
  ]},
  { key: 'diseno', name: 'Diseño (universo visual)', icon: 'Camera', items: [
    'Dirección de arte', 'Diseño gráfico (pack)', 'Shooting + conceptualización',
    'Piezas visuales (videoclips / visualizers / lyric videos)',
    'Cápsulas promocionales RRSS', 'Vestuario / estilismo'
  ]},
  { key: 'stage', name: 'Stage (residencia técnica)', icon: 'Clapperboard', items: [
    'Tour management', 'Técnica de sonido', 'Dirección creativa',
    'Diseño de luces', 'Vestuario / estilismo', 'Alquiler de material técnico',
    'Escenografía', 'Alquiler de espacio', 'Dietas / hospitality'
  ]},
  { key: 'transporte', name: 'Transporte', icon: 'Car', items: [
    'Combustible', 'Alquiler de vehículo', 'Transporte público / taxi / avión'
  ]},
  { key: 'dietas', name: 'Dietas', icon: 'UtensilsCrossed', items: [
    'Comidas', 'Cenas', 'Mantenimiento / extras'
  ]},
  { key: 'hospedaje', name: 'Hospedaje', icon: 'Bed', items: [
    'Alojamiento', 'Habitación extra', 'Apartamento extra'
  ]},
  { key: 'pr_marketing', name: 'PR & Marketing', icon: 'Megaphone', items: [
    'Sesión de fotos', 'Agencia / PR + pitching (nacional)',
    'Agencia / PR + pitching (internacional)', 'Contenidos / gestión RRSS',
    'Ads', 'Playlisting', 'Radio', 'Influencers / UGC', 'EPK / press kit',
    'Evento de lanzamiento'
  ]},
  { key: 'distribucion', name: 'Distribución & Admin', icon: 'FileText', items: [
    'Distribución / altas / fees', 'Content ID / canales oficiales',
    'Registros (UPC/ISRC)', 'Legal (contratos / cesiones)', 'Contabilidad / gestión'
  ]},
  { key: 'fabricacion', name: 'Fabricación & logística', icon: 'Package', items: [
    'Fabricación (vinilo / CD)', 'Pruebas / test', 'Packaging extra',
    'Envíos / logística', 'Fulfillment'
  ]},
  { key: 'contingencia', name: 'Contingencia', icon: 'ShieldAlert', items: [
    'Reserva / margen de imprevistos'
  ]},
];

// ─── TOGGLE CONFIG ─────────────────────────────────────────────────
// Maps toggle keys to which category keys they activate
const TOGGLE_CATEGORY_MAP: Record<string, string[]> = {
  // Always-on categories (grabacion is always present)
  producers: ['grabacion'],
  externalMix: ['grabacion'],
  master: ['grabacion'],
  // Visual / production
  videoclips: ['diseno'],
  capsulasRRSS: ['diseno'],
  shooting: ['diseno'],
  vestuario: ['diseno'],
  makingOf: ['produccion'],
  edicionCapsulas: ['produccion'],
  // Stage
  stage: ['stage'],
  // PR
  prNacional: ['pr_marketing'],
  prInternacional: ['pr_marketing'],
  gestionRRSS: ['pr_marketing'],
  // Logistics
  transporte: ['transporte'],
  dietas: ['dietas'],
  hospedaje: ['hospedaje'],
  // Physical
  fisico: ['fabricacion'],
};

type Step = 'metadata' | 'dates' | 'variables';

export default function CreateReleaseBudgetDialog({
  open, onOpenChange, onSuccess, release, trackCount
}: CreateReleaseBudgetDialogProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('metadata');
  const [loading, setLoading] = useState(false);

  // ─── Metadata ────────────────────────────────────────────────────
  const [budgetName, setBudgetName] = useState('');
  const [releaseType, setReleaseType] = useState<string>(release?.type || 'single');
  const [version, setVersion] = useState('original');
  const [territories, setTerritories] = useState<string[]>(['ES']);
  const [labelContactId, setLabelContactId] = useState<string | undefined>(undefined);
  const [distributionContactId, setDistributionContactId] = useState<string | undefined>(undefined);
  const [estado, setEstado] = useState('produccion');
  const [services, setServices] = useState<string[]>([]);
  const [ownerContactId, setOwnerContactId] = useState<string | undefined>(undefined);
  const [notasInternas, setNotasInternas] = useState('');

  // ─── Dates ───────────────────────────────────────────────────────
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(
    release?.release_date ? new Date(release.release_date) : undefined
  );
  const [physicalDate, setPhysicalDate] = useState<Date | undefined>();
  const [singleDates, setSingleDates] = useState<Date[]>([]);
  const [autoDeadlines, setAutoDeadlines] = useState(true);

  // ─── Cronograma integration ─────────────────────────────────────
  const [existingMilestones, setExistingMilestones] = useState<ReleaseMilestone[]>([]);
  const [deadlineStrategy, setDeadlineStrategy] = useState<'cronograma' | 'autocalcular' | 'mezclar'>('autocalcular');
  const hasCronograma = existingMilestones.length > 0;

  // Extended deadline offsets aligned with cronograma tasks
  const EXTENDED_DEADLINE_OFFSETS: { key: string; name: string; days: number; milestoneTitle: string }[] = [
    { key: 'grabacion', name: 'Grabación', days: 70, milestoneTitle: 'Grabación' },
    { key: 'mezcla', name: 'Mezcla', days: 55, milestoneTitle: 'Mezcla' },
    { key: 'masters', name: 'Masters', days: 45, milestoneTitle: 'Mastering' },
    { key: 'arte', name: 'Arte', days: 42, milestoneTitle: 'Artwork Final' },
    { key: 'entregaDSP', name: 'Entrega DSP', days: 42, milestoneTitle: 'Entrega a Distribuidora' },
    { key: 'preSave', name: 'Pre Save', days: 28, milestoneTitle: 'Pre-save Activo' },
    { key: 'anuncio', name: 'Anuncio', days: 14, milestoneTitle: 'Focus Track / Anuncios' },
    { key: 'salida', name: 'Salida Digital', days: 0, milestoneTitle: 'Salida Digital' },
  ];

  // Compute resolved deadlines based on strategy
  const getResolvedDeadlines = () => {
    if (!releaseDate) return [];
    return EXTENDED_DEADLINE_OFFSETS.map(offset => {
      const calculatedDate = subDays(releaseDate, offset.days);
      const milestone = existingMilestones.find(m => m.title === offset.milestoneTitle);
      const cronogramaDate = milestone?.due_date ? new Date(milestone.due_date) : null;

      let finalDate: Date;
      let source: 'cronograma' | 'calculado';

      switch (deadlineStrategy) {
        case 'cronograma':
          finalDate = cronogramaDate || calculatedDate;
          source = cronogramaDate ? 'cronograma' : 'calculado';
          break;
        case 'mezclar':
          finalDate = cronogramaDate || calculatedDate;
          source = cronogramaDate ? 'cronograma' : 'calculado';
          break;
        case 'autocalcular':
        default:
          finalDate = calculatedDate;
          source = 'calculado';
          break;
      }

      return {
        key: offset.key,
        name: offset.name,
        calculatedDate,
        cronogramaDate,
        finalDate,
        source,
        milestoneStatus: milestone?.status || null,
      };
    });
  };

  // Legacy simple offsets (kept for backward compat in metadata)
  const deadlineOffsets = {
    masters: 45,
    arte: 42,
    pitchDSP: 28,
    anuncio: 14,
    preSave: 28,
  };

  // ─── Variables (toggles) ─────────────────────────────────────────
  const [nTracks, setNTracks] = useState(trackCount || 1);
  const [producers, setProducers] = useState<ProducerRef[]>([]);
  const [includesMix, setIncludesMix] = useState(true);
  const [externalMix, setExternalMix] = useState(false);
  const [externalMixEngineer, setExternalMixEngineer] = useState<ProducerRef | null>(null);
  const [masterTypes, setMasterTypes] = useState<string[]>(['estereo']);
  const [nVideoclips, setNVideoclips] = useState(0);
  const [nCapsulasRRSS, setNCapsulasRRSS] = useState(0);
  const [capsulasManuales, setCapsulasManuales] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [shootingContratado, setShootingContratado] = useState(false);
  const [vestuario, setVestuario] = useState(false);
  const [vestuarioContratado, setVestuarioContratado] = useState(false);
  const [makingOf, setMakingOf] = useState(false);
  const [makingOfContratado, setMakingOfContratado] = useState(false);
  const [edicionCapsulas, setEdicionCapsulas] = useState(false);
  const [edicionCapsulasCont, setEdicionCapsulasCont] = useState(false);
  const [stage, setStage] = useState(false);
  const [stageContratado, setStageContratado] = useState(false);
  const [stageDays, setStageDays] = useState(1);
  const [prNacional, setPrNacional] = useState(false);
  const [prNacionalContratado, setPrNacionalContratado] = useState(false);
  const [prNacionalProveedor, setPrNacionalProveedor] = useState<ProducerRef | null>(null);
  const [prNacionalCoste, setPrNacionalCoste] = useState(0);
  const [prInternacional, setPrInternacional] = useState(false);
  const [prInternacionalCont, setPrInternacionalCont] = useState(false);
  const [prIntProveedor, setPrIntProveedor] = useState<ProducerRef | null>(null);
  const [prIntCoste, setPrIntCoste] = useState(0);
  const [gestionRRSS, setGestionRRSS] = useState(false);
  const [gestionRRSSCont, setGestionRRSSCont] = useState(false);
  const [rrssProveedor, setRrssProveedor] = useState<ProducerRef | null>(null);
  const [rrssCoste, setRrssCoste] = useState(0);
  const [transporte, setTransporte] = useState(false);
  const [transporteCont, setTransporteCont] = useState(false);
  const [dietas, setDietas] = useState(false);
  const [dietasCont, setDietasCont] = useState(false);
  const [hospedaje, setHospedaje] = useState(false);
  const [hospedajeCont, setHospedajeCont] = useState(false);
  const [fisico, setFisico] = useState(false);
  const [fisicoCont, setFisicoCont] = useState(false);
  const [fisicoFormatos, setFisicoFormatos] = useState<string[]>([]);
  const [contingencia, setContingencia] = useState([10]);

  // Reset on open + fetch milestones
  useEffect(() => {
    if (open && release) {
      setBudgetName(`Presupuesto - ${release.title}`);
      setReleaseType(release.type || 'single');
      setLabelContactId(undefined);
      setNTracks(trackCount || 1);
      setReleaseDate(release.release_date ? new Date(release.release_date) : undefined);
      setStep('metadata');
      setServices([]);

      // Fetch existing milestones for this release
      supabase
        .from('release_milestones')
        .select('*')
        .eq('release_id', release.id)
        .order('due_date', { ascending: true, nullsFirst: true })
        .then(({ data }) => {
          const milestones = (data || []) as ReleaseMilestone[];
          setExistingMilestones(milestones);
          setDeadlineStrategy(milestones.length > 0 ? 'cronograma' : 'autocalcular');
          setAutoDeadlines(milestones.length === 0);
        });
    }
  }, [open, release, trackCount]);

  // ─── Auto-calc cápsulas RRSS = videoclips × 3 ───────────────────
  useEffect(() => {
    if (!capsulasManuales) {
      setNCapsulasRRSS(nVideoclips * 3);
    }
  }, [nVideoclips, capsulasManuales]);

  // ─── Determine which categories are active ───────────────────────
  const getActiveCategories = (): string[] => {
    const active = new Set<string>();
    // Grabación is always active
    active.add('grabacion');
    // Producción is always active (project management)
    active.add('produccion');
    // Distribución is always active
    active.add('distribucion');
    // Contingencia is always active
    active.add('contingencia');

    if (nVideoclips > 0 || nCapsulasRRSS > 0 || shooting || vestuario) active.add('diseno');
    if (stage) active.add('stage');
    if (prNacional || prInternacional || gestionRRSS) active.add('pr_marketing');
    if (transporte) active.add('transporte');
    if (dietas) active.add('dietas');
    if (hospedaje) active.add('hospedaje');
    if (fisico) active.add('fabricacion');

    return Array.from(active);
  };

  // ─── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!release || !profile?.user_id) return;
    setLoading(true);

    try {
      const resolvedDeadlines = getResolvedDeadlines();
      const metadata = {
        release_type: releaseType,
        version,
        territories,
        label_contact_id: labelContactId || null,
        distribution_contact_id: distributionContactId || null,
        owner_contact_id: ownerContactId || null,
        estado,
        services,
        release_date_digital: releaseDate?.toISOString() || null,
        release_date_physical: physicalDate?.toISOString() || null,
        single_dates: singleDates.map(d => d.toISOString()),
        auto_deadlines: autoDeadlines,
        deadline_strategy: hasCronograma ? deadlineStrategy : 'autocalcular',
        deadlines: resolvedDeadlines.map(d => ({
          name: d.name,
          date: d.finalDate.toISOString(),
          source: d.source,
        })),
        variables: {
          n_tracks: nTracks,
          producers,
          includes_mix: includesMix,
          external_mix: externalMix,
          external_mix_engineer: externalMixEngineer,
          master_types: masterTypes,
          n_videoclips: nVideoclips,
          n_capsulas_rrss: nCapsulasRRSS,
          shooting, shooting_contratado: shootingContratado,
          vestuario, vestuario_contratado: vestuarioContratado,
          making_of: makingOf, making_of_contratado: makingOfContratado,
          edicion_capsulas: edicionCapsulas, edicion_capsulas_contratado: edicionCapsulasCont,
          stage, stage_contratado: stageContratado, stage_days: stageDays,
          pr_nacional: prNacional, pr_nacional_contratado: prNacionalContratado,
          pr_nacional_proveedor: prNacionalProveedor, pr_nacional_coste: prNacionalCoste,
          pr_internacional: prInternacional, pr_internacional_contratado: prInternacionalCont,
          pr_int_proveedor: prIntProveedor, pr_int_coste: prIntCoste,
          gestion_rrss: gestionRRSS, gestion_rrss_contratado: gestionRRSSCont,
          rrss_proveedor: rrssProveedor, rrss_coste: rrssCoste,
          transporte, transporte_contratado: transporteCont,
          dietas, dietas_contratado: dietasCont,
          hospedaje, hospedaje_contratado: hospedajeCont,
          fisico, fisico_contratado: fisicoCont, fisico_formatos: fisicoFormatos,
          contingencia_pct: contingencia[0],
        },
      };

      // 1. Create budget
      const { data: newBudget, error: budgetError } = await (supabase
        .from('budgets')
        .insert({
          name: budgetName,
          type: 'produccion_musical',
          artist_id: release.artist_id,
          release_id: release.id,
          internal_notes: notasInternas,
          fee: 0,
          created_by: profile.user_id,
          metadata,
        } as any)
        .select()
        .single());

      if (budgetError) throw budgetError;
      const budgetId = (newBudget as any).id;

      // 2. Create categories and items
      const activeKeys = getActiveCategories();
      const categoriesToCreate = RELEASE_BUDGET_CATEGORIES.filter(c => activeKeys.includes(c.key));

      for (let i = 0; i < categoriesToCreate.length; i++) {
        const cat = categoriesToCreate[i];

        // Create or get category
        const { data: existingCat } = await supabase
          .from('budget_categories')
          .select('id')
          .eq('name', cat.name)
          .maybeSingle();

        let categoryId: string;
        if (existingCat?.id) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('budget_categories')
            .insert({
              name: cat.name,
              icon_name: cat.icon,
              created_by: profile.user_id,
              sort_order: i,
            })
            .select('id')
            .single();
          if (catError) throw catError;
          categoryId = newCat.id;
        }

        // Filter items based on active toggles
        const itemsToCreate = getFilteredItems(cat);

        if (itemsToCreate.length === 0) continue;

        // Build budget_items
        const budgetItems = itemsToCreate.map(itemName => {
          const itemData: any = {
            budget_id: budgetId,
            category_id: categoryId,
            category: cat.name,
            name: itemName,
            quantity: getDefaultQuantity(cat.key, itemName),
            unit_price: getDefaultPrice(cat.key, itemName),
            iva_percentage: getDefaultIVA(cat.key),
            irpf_percentage: getDefaultIRPF(cat.key, itemName),
            is_attendee: false,
            billing_status: 'pendiente',
            observations: getDefaultObservations(cat.key, itemName),
          };
          return itemData;
        });

        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(budgetItems);

        if (itemsError) throw itemsError;
      }

      toast.success('Presupuesto de lanzamiento creado con todas las partidas');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating release budget:', error);
      toast.error('Error al crear el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  // ─── Item filtering based on toggles ─────────────────────────────
  const getFilteredItems = (cat: typeof RELEASE_BUDGET_CATEGORIES[number]): string[] => {
    switch (cat.key) {
      case 'grabacion': {
        const items = ['Producción (productor/es)', 'Ingeniería de grabación', 'Alquiler de estudio'];
        if (!includesMix || externalMix) items.push('Mezcla');
        items.push('Master');
        return items;
      }
      case 'produccion': {
        const items = ['Project management'];
        if (makingOf) items.push('Making-of (grabación)');
        if (edicionCapsulas) items.push('Edición de cápsulas / piezas');
        items.push('Imprevistos por proyecto');
        return items;
      }
      case 'diseno': {
        const items: string[] = [];
        items.push('Dirección de arte', 'Diseño gráfico (pack)');
        if (shooting) items.push('Shooting + conceptualización');
        if (nVideoclips > 0) items.push('Piezas visuales (videoclips / visualizers / lyric videos)');
        if (nCapsulasRRSS > 0) items.push('Cápsulas promocionales RRSS');
        if (vestuario) items.push('Vestuario / estilismo');
        return items;
      }
      case 'stage':
        return stage ? cat.items : [];
      case 'pr_marketing': {
        const items: string[] = [];
        if (shooting) items.push('Sesión de fotos');
        if (prNacional) items.push('Agencia / PR + pitching (nacional)');
        if (prInternacional) items.push('Agencia / PR + pitching (internacional)');
        if (gestionRRSS) items.push('Contenidos / gestión RRSS');
        // Always include these optional items as rows
        items.push('Ads', 'Playlisting', 'EPK / press kit');
        return items;
      }
      default:
        return cat.items;
    }
  };

  const getDefaultQuantity = (catKey: string, itemName: string): number => {
    if (itemName.includes('videoclip') || itemName.includes('Piezas visuales')) return nVideoclips || 1;
    if (itemName.includes('Cápsulas')) return nCapsulasRRSS || 1;
    if (catKey === 'stage') return stageDays || 1;
    return 1;
  };

  const getDefaultPrice = (catKey: string, itemName: string): number => {
    if (itemName.includes('PR + pitching (nacional)')) return prNacionalCoste;
    if (itemName.includes('PR + pitching (internacional)')) return prIntCoste;
    if (itemName.includes('gestión RRSS')) return rrssCoste;
    return 0;
  };

  const getDefaultIVA = (catKey: string): number => {
    return 21; // Default Spain IVA
  };

  const getDefaultIRPF = (catKey: string, itemName: string): number => {
    if (['grabacion', 'produccion'].includes(catKey)) return 15;
    return 0;
  };

  const getDefaultObservations = (catKey: string, itemName: string): string => {
    if (itemName.includes('PR + pitching (nacional)') && prNacionalProveedor) return `Proveedor: ${prNacionalProveedor.name}`;
    if (itemName.includes('PR + pitching (internacional)') && prIntProveedor) return `Proveedor: ${prIntProveedor.name}`;
    if (itemName.includes('Master')) {
      const labels = masterTypes.map(v => MASTER_TYPE_OPTIONS.find(o => o.value === v)?.label || v);
      return labels.length ? `Tipos: ${labels.join(', ')}` : '';
    }
    if (itemName.includes('Producción (productor')) {
      if (!producers.length) return '';
      return `Productor/es: ${producers.map(p => p.name).join(' & ')}`;
    }
    return '';
  };

  // ─── Navigation ──────────────────────────────────────────────────
  const steps: Step[] = ['metadata', 'dates', 'variables'];
  const stepLabels = { metadata: 'Cabecera', dates: 'Fechas', variables: 'Variables' };
  const currentIndex = steps.indexOf(step);

  const handleClose = () => {
    setStep('metadata');
    onOpenChange(false);
  };

  // ─── Date picker helper ──────────────────────────────────────────
  const DatePicker = ({ value, onChange, label: dateLabel, defaultMonth, highlightDate }: { value?: Date; onChange: (d?: Date) => void; label: string; defaultMonth?: Date; highlightDate?: Date }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{dateLabel}</Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[300] bg-popover border border-border shadow-lg pointer-events-auto"
          align="start"
          avoidCollisions={false}
          style={{ pointerEvents: 'auto' }}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className="p-3 pointer-events-auto"
            defaultMonth={defaultMonth}
            modifiers={{ digitalRelease: highlightDate ? [highlightDate] : [] }}
            modifiersClassNames={{ digitalRelease: "bg-violet-500/20 text-violet-700 dark:text-violet-300 font-semibold rounded-md ring-1 ring-violet-400/50" }}
          />
        </PopoverContent>
      </Popover>
      {highlightDate && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-primary/40 shrink-0" />
          Fecha digital: {format(highlightDate, "dd MMM yyyy", { locale: es })}
        </p>
      )}
    </div>
  );

  // ─── Toggle row helper ───────────────────────────────────────────
  // `contracted` / `onContractedChange`: optional second toggle "Nosotros lo ejecutamos"
  const ToggleRow = ({ label: toggleLabel, checked, onChange, contracted, onContractedChange, children }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    contracted?: boolean;
    onContractedChange?: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Exists toggle */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Switch checked={checked} onCheckedChange={onChange} />
          <Label className="text-sm cursor-pointer truncate" onClick={() => onChange(!checked)}>{toggleLabel}</Label>
        </div>
        {/* Contracted toggle — only shown when element exists */}
        {onContractedChange && checked && (
          <div className={cn(
            "flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border transition-colors",
            contracted
              ? "bg-primary/10 border-primary/30"
              : "bg-muted border-border"
          )}>
            <Switch
              checked={contracted ?? false}
              onCheckedChange={onContractedChange}
            />
            <span className={cn(
              "text-xs font-medium whitespace-nowrap inline-block w-[110px]",
              contracted ? "text-primary" : "text-muted-foreground"
            )}>
              {contracted ? "Producción propia" : "Derivado"}
            </span>
          </div>
        )}
      </div>
      {checked && children && <div className="pl-4 border-l-2 border-primary/20 space-y-2">{children}</div>}
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-primary" />
            Nuevo Presupuesto de Lanzamiento
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex gap-1 pt-2">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  i <= currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            {steps.map(s => (
              <span key={s} className={cn(step === s && "text-foreground font-medium")}>{stepLabels[s]}</span>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {/* ═══ STEP 1: METADATA ═══ */}
          {step === 'metadata' && (
            <div className="space-y-4 pb-4">
              {/* Readonly release info */}
              <Card className="bg-muted/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <Disc3 className="h-8 w-8 text-primary/60" />
                  <div>
                    <p className="font-medium text-sm">{release?.title}</p>
                    <p className="text-xs text-muted-foreground">{release?.artist?.name || 'Sin artista'} · {nTracks} track{nTracks !== 1 ? 's' : ''}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-1.5">
                <Label className="text-xs">Nombre del presupuesto *</Label>
                <Input value={budgetName} onChange={e => setBudgetName(e.target.value)} className="h-9 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de release</Label>
                  <Select value={releaseType} onValueChange={setReleaseType}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="ep">EP</SelectItem>
                      <SelectItem value="album">Álbum</SelectItem>
                      <SelectItem value="deluxe">Deluxe</SelectItem>
                      <SelectItem value="reedicion">Re-edición</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Versión</Label>
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="explicit">Explicit</SelectItem>
                      <SelectItem value="clean">Clean (Radio Edit)</SelectItem>
                      <SelectItem value="instrumental">Instrumental</SelectItem>
                      <SelectItem value="acustica">Acústica</SelectItem>
                      <SelectItem value="live">Live / En directo</SelectItem>
                      <SelectItem value="remix">Remix oficial</SelectItem>
                      <SelectItem value="extended">Extended Mix (DJ Edit)</SelectItem>
                      <SelectItem value="deluxe">Deluxe / Edición especial</SelectItem>
                      <SelectItem value="remaster">Remasterizado</SelectItem>
                      <SelectItem value="ep">EP</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Territorio multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs">Territorio objetivo</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-auto min-h-9 text-sm py-1.5">
                      <Globe className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      {territories.length === 0 ? (
                        <span className="text-muted-foreground">Seleccionar territorios...</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {territories.map(t => {
                            const opt = ALL_TERRITORIES.find(o => o.value === t);
                            return (
                              <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-0.5">
                                {opt?.label || t}
                                <X className="h-2.5 w-2.5 cursor-pointer" onClick={(e) => {
                                  e.stopPropagation();
                                  setTerritories(prev => prev.filter(v => v !== t));
                                }} />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[300] bg-popover border border-border shadow-lg pointer-events-auto" align="start" side="bottom" sideOffset={4} avoidCollisions={false} style={{ pointerEvents: 'auto' }}>
                    <Command>
                      <CommandInput placeholder="Buscar país..." />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>No encontrado</CommandEmpty>
                        {TERRITORY_GROUPS.map(group => (
                          <CommandGroup key={group.label} heading={group.label}>
                            {group.options.map(opt => (
                              <CommandItem
                                key={opt.value}
                                value={opt.label}
                                onSelect={() => {
                                  setTerritories(prev =>
                                    prev.includes(opt.value)
                                      ? prev.filter(v => v !== opt.value)
                                      : [...prev, opt.value]
                                  );
                                }}
                              >
                                <Checkbox
                                  checked={territories.includes(opt.value)}
                                  className="mr-2 h-3.5 w-3.5"
                                />
                                <span className="text-sm">{opt.label}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Estado</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                      <SelectItem value="mezcla">Mezcla</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="programado">Programado</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sello</Label>
                  <ReleaseBudgetContactField
                    type="sello"
                    artistId={release?.artist_id || null}
                    value={labelContactId}
                    onValueChange={setLabelContactId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Distribución</Label>
                  <ReleaseBudgetContactField
                    type="distribucion"
                    artistId={release?.artist_id || null}
                    value={distributionContactId}
                    onValueChange={setDistributionContactId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Owner interno</Label>
                  <ReleaseBudgetContactField
                    type="owner"
                    artistId={release?.artist_id || null}
                    value={ownerContactId}
                    onValueChange={setOwnerContactId}
                  />
                </div>
              </div>

              {/* Servicios multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs">Servicios contratados</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-auto min-h-9 text-sm py-1.5">
                      {services.length === 0 ? (
                        <span className="text-muted-foreground">Seleccionar servicios...</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {services.map(s => (
                            <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-0.5">
                              {s}
                              <X className="h-2.5 w-2.5 cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                setServices(prev => prev.filter(v => v !== s));
                              }} />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0 z-[300] bg-popover border border-border shadow-lg pointer-events-auto" align="start" side="bottom" sideOffset={4} avoidCollisions={false} style={{ pointerEvents: 'auto' }}>
                    <Command>
                      <CommandInput placeholder="Buscar servicio..." />
                      <CommandList className="max-h-[250px]" onWheel={(e) => e.stopPropagation()}>
                        <CommandEmpty>No encontrado</CommandEmpty>
                        <CommandGroup>
                          {SERVICE_OPTIONS.map(svc => (
                            <CommandItem
                              key={svc}
                              value={svc}
                              onSelect={() => {
                                setServices(prev =>
                                  prev.includes(svc) ? prev.filter(v => v !== svc) : [...prev, svc]
                                );
                              }}
                            >
                              <Checkbox
                                checked={services.includes(svc)}
                                className="mr-2 h-3.5 w-3.5"
                              />
                              <span className="text-sm">{svc}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notas internas</Label>
                <Textarea value={notasInternas} onChange={e => setNotasInternas(e.target.value)} className="min-h-[60px] text-sm" placeholder="Observaciones..." />
              </div>
            </div>
          )}

          {/* ═══ STEP 2: DATES ═══ */}
          {step === 'dates' && (
            <div className="space-y-4 pb-4">
              <DatePicker label="Fecha de lanzamiento digital (principal) *" value={releaseDate} onChange={setReleaseDate} />
              <DatePicker label="Fecha de lanzamiento físico (opcional)" value={physicalDate} onChange={setPhysicalDate} defaultMonth={!physicalDate && releaseDate ? releaseDate : undefined} highlightDate={releaseDate ?? undefined} />

              {/* Singles previos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Singles previos</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSingleDates(prev => [...prev, new Date()])}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir
                  </Button>
                </div>
                {singleDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <DatePicker label={`Single ${i + 1}`} value={d} onChange={v => {
                      const copy = [...singleDates];
                      copy[i] = v || new Date();
                      setSingleDates(copy);
                    }} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 mt-5" onClick={() => setSingleDates(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Deadline strategy - depends on whether cronograma exists */}
              {hasCronograma ? (
                <div className="space-y-3">
                  <Label className="text-xs font-medium">Estrategia de deadlines</Label>
                  <p className="text-xs text-muted-foreground">
                    Este lanzamiento tiene un cronograma con {existingMilestones.length} hitos. ¿Cómo quieres calcular los deadlines del presupuesto?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'cronograma' as const, label: 'Usar cronograma', desc: 'Fechas reales del cronograma', icon: GitMerge },
                      { value: 'autocalcular' as const, label: 'Recalcular', desc: 'Offsets desde fecha de lanzamiento', icon: Calculator },
                      { value: 'mezclar' as const, label: 'Mezclar', desc: 'Cronograma + auto-relleno', icon: Blend },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDeadlineStrategy(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors",
                          deadlineStrategy === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <opt.icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Comparative deadline table */}
                  {releaseDate && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 space-y-2">
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
                          <span>Hito</span>
                          <span>Cronograma</span>
                          <span>Calculado</span>
                          <span>Seleccionado</span>
                        </div>
                        {getResolvedDeadlines().map(d => (
                          <div key={d.key} className="grid grid-cols-4 gap-1 text-xs items-center">
                            <span className="font-medium truncate">{d.name}</span>
                            <span className={cn("text-muted-foreground", !d.cronogramaDate && "italic text-muted-foreground/50")}>
                              {d.cronogramaDate ? format(d.cronogramaDate, "dd MMM", { locale: es }) : '—'}
                            </span>
                            <span className="text-muted-foreground">
                              {format(d.calculatedDate, "dd MMM", { locale: es })}
                            </span>
                            <span className={cn(
                              "font-medium",
                              d.source === 'cronograma' ? "text-primary" : "text-foreground"
                            )}>
                              {format(d.finalDate, "dd MMM", { locale: es })}
                              {d.source === 'cronograma' && (
                                <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-3.5">real</Badge>
                              )}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <>
                  {/* No cronograma - simple toggle */}
                  <ToggleRow label="Auto-calcular deadlines desde fecha principal" checked={autoDeadlines} onChange={setAutoDeadlines} />

                  {releaseDate && autoDeadlines && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Deadlines calculados:</p>
                        {EXTENDED_DEADLINE_OFFSETS.map(offset => (
                          <div key={offset.key} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{offset.name}</span>
                            <span>{format(subDays(releaseDate, offset.days), "dd MMM yyyy", { locale: es })}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ STEP 3: VARIABLES ═══ */}
          {step === 'variables' && (
            <div className="space-y-4 pb-4">
              {/* Tracks & Production */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Grabación & Producción</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nº tracks</Label>
                    <Input type="number" min={1} value={nTracks} onChange={e => setNTracks(parseInt(e.target.value) || 1)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Productor/es</Label>
                    <ProducerSelector
                      value={producers}
                      onChange={setProducers}
                      artistId={release?.artist_id}
                    />
                  </div>
                </div>
                {/* Mezcla — agrupado bajo producción */}
                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mezcla</h5>
                  <ToggleRow
                    label="¿El productor incluye mezcla?"
                    checked={includesMix}
                    onChange={(v) => { setIncludesMix(v); if (v) { setExternalMix(false); setExternalMixEngineer(null); } }}
                  />
                  {!includesMix && (
                    <div className="pl-3 border-l-2 border-border space-y-2">
                      <ToggleRow
                        label="¿Mezcla externa?"
                        checked={externalMix}
                        onChange={(v) => { setExternalMix(v); if (!v) setExternalMixEngineer(null); }}
                      />
                      {externalMix && (
                        <div className="space-y-1.5 pl-4 border-l-2 border-primary/30">
                          <Label className="text-xs">Técnico de mezcla externo</Label>
                          <SingleProducerSelector
                            value={externalMixEngineer}
                            onChange={setExternalMixEngineer}
                            artistId={release?.artist_id}
                            placeholder="Seleccionar técnico..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tipos de master</Label>
                  <div className="rounded-md border border-border bg-muted/30 divide-y divide-border">
                    {MASTER_TYPE_OPTIONS.map(opt => {
                      const checked = masterTypes.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={v => {
                              if (v) {
                                setMasterTypes(prev => [...prev, opt.value]);
                              } else {
                                setMasterTypes(prev => prev.filter(x => x !== opt.value));
                              }
                            }}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium leading-tight">{opt.label}</span>
                            {opt.desc && <span className="text-xs text-muted-foreground leading-tight mt-0.5">{opt.desc}</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {masterTypes.length === 0 && (
                    <p className="text-xs text-destructive">Selecciona al menos un tipo de master.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Visual */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Visual & Contenido</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nº videoclips</Label>
                    <Input type="number" min={0} value={nVideoclips} onChange={e => setNVideoclips(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Nº cápsulas RRSS</Label>
                      {capsulasManuales && nCapsulasRRSS !== nVideoclips * 3 && (
                        <button
                          type="button"
                          onClick={() => { setCapsulasManuales(false); setNCapsulasRRSS(nVideoclips * 3); }}
                          title="Restaurar valor automático (videoclips × 3)"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={nCapsulasRRSS}
                      onChange={e => { setCapsulasManuales(true); setNCapsulasRRSS(parseInt(e.target.value) || 0); }}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <ToggleRow label="¿Shooting?" checked={shooting} onChange={setShooting} contracted={shootingContratado} onContractedChange={setShootingContratado} />
                <ToggleRow label="¿Vestuario / estilismo?" checked={vestuario} onChange={setVestuario} contracted={vestuarioContratado} onContractedChange={setVestuarioContratado} />
                <ToggleRow label="¿Making of?" checked={makingOf} onChange={setMakingOf} contracted={makingOfContratado} onContractedChange={setMakingOfContratado} />
                <ToggleRow label="¿Edición de cápsulas?" checked={edicionCapsulas} onChange={setEdicionCapsulas} contracted={edicionCapsulasCont} onContractedChange={setEdicionCapsulasCont} />
              </div>

              <Separator />

              {/* Stage */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Stage / Residencia técnica</h4>
                <ToggleRow label="¿Stage / residencia técnica?" checked={stage} onChange={setStage} contracted={stageContratado} onContractedChange={setStageContratado}>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nº días</Label>
                    <Input type="number" min={1} value={stageDays} onChange={e => setStageDays(parseInt(e.target.value) || 1)} className="h-9 text-sm" />
                  </div>
                </ToggleRow>
              </div>

              <Separator />

              {/* PR & Marketing */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">PR & Marketing</h4>
                <ToggleRow label="¿PR nacional?" checked={prNacional} onChange={setPrNacional} contracted={prNacionalContratado} onContractedChange={setPrNacionalContratado}>
                  <div className="grid grid-cols-2 gap-2 items-start">
                    <SingleProducerSelector value={prNacionalProveedor} onChange={setPrNacionalProveedor} artistId={release?.artist_id} placeholder="Proveedor" />
                    <Input type="number" value={prNacionalCoste || ''} onChange={e => setPrNacionalCoste(parseFloat(e.target.value) || 0)} placeholder="Coste €" className="h-8 text-xs" />
                  </div>
                </ToggleRow>
                <ToggleRow label="¿PR internacional?" checked={prInternacional} onChange={setPrInternacional} contracted={prInternacionalCont} onContractedChange={setPrInternacionalCont}>
                  <div className="grid grid-cols-2 gap-2 items-start">
                    <SingleProducerSelector value={prIntProveedor} onChange={setPrIntProveedor} artistId={release?.artist_id} placeholder="Proveedor" />
                    <Input type="number" value={prIntCoste || ''} onChange={e => setPrIntCoste(parseFloat(e.target.value) || 0)} placeholder="Coste €" className="h-8 text-xs" />
                  </div>
                </ToggleRow>
                <ToggleRow label="¿Gestión RRSS / contenidos?" checked={gestionRRSS} onChange={setGestionRRSS} contracted={gestionRRSSCont} onContractedChange={setGestionRRSSCont}>
                  <div className="grid grid-cols-2 gap-2 items-start">
                    <SingleProducerSelector value={rrssProveedor} onChange={setRrssProveedor} artistId={release?.artist_id} placeholder="Proveedor" />
                    <Input type="number" value={rrssCoste || ''} onChange={e => setRrssCoste(parseFloat(e.target.value) || 0)} placeholder="Coste €" className="h-8 text-xs" />
                  </div>
                </ToggleRow>
              </div>

              <Separator />

              {/* Logistics */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Logística</h4>
                <ToggleRow label="¿Transporte?" checked={transporte} onChange={setTransporte} contracted={transporteCont} onContractedChange={setTransporteCont} />
                <ToggleRow label="¿Dietas?" checked={dietas} onChange={setDietas} contracted={dietasCont} onContractedChange={setDietasCont} />
                <ToggleRow label="¿Hospedaje?" checked={hospedaje} onChange={setHospedaje} contracted={hospedajeCont} onContractedChange={setHospedajeCont} />
              </div>

              <Separator />

              {/* Fabricación física */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Fabricación física</h4>
                <ToggleRow
                  label="¿Fabricación física (vinilo/CD)?"
                  checked={fisico}
                  onChange={(v) => { setFisico(v); if (!v) setFisicoFormatos([]); }}
                  contracted={fisicoCont}
                  onContractedChange={setFisicoCont}
                />
                {fisico && (
                  <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formatos</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {FORMATOS_FISICOS.map(f => (
                        <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={fisicoFormatos.includes(f.value)}
                            onCheckedChange={(v) => {
                              setFisicoFormatos(prev =>
                                v ? [...prev, f.value] : prev.filter(x => x !== f.value)
                              );
                            }}
                          />
                          <span className="text-sm">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Contingencia */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Contingencia</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Reserva de imprevistos</Label>
                    <Badge variant="secondary">{contingencia[0]}%</Badge>
                  </div>
                  <Slider value={contingencia} onValueChange={setContingencia} min={0} max={20} step={1} />
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <p className="text-xs font-medium mb-2">Resumen de categorías a generar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RELEASE_BUDGET_CATEGORIES
                      .filter(c => getActiveCategories().includes(c.key))
                      .map(c => (
                        <Badge key={c.key} variant="outline" className="text-xs">{c.name}</Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" onClick={currentIndex > 0 ? () => setStep(steps[currentIndex - 1]) : handleClose} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            {currentIndex > 0 ? 'Anterior' : 'Cancelar'}
          </Button>
          {currentIndex < steps.length - 1 ? (
            <Button onClick={() => setStep(steps[currentIndex + 1])} className="gap-1">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !budgetName.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Presupuesto
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
