## Objetivo

Añadir el campo **Fecha de fijación de la grabación** (`recording_fixation_date`) al diálogo "Editar Canción" en Créditos y Autoría. Este dato es relevante para contratos de Propiedad Intelectual (ya existe `grabacion_fecha_fijacion` en `IPLicenseGenerator`) y para Label Copy / metadatos legales.

## Interacción con el sistema existente (revisión)

- **Auth**: La edición de tracks usa `supabase.from('tracks').update()` directamente desde el cliente. La autorización está garantizada por las políticas RLS existentes de la tabla `tracks` (ligadas a `release_id` → `releases` → workspace/artist). No se altera ese flujo.
- **Panel de usuario / artistas roster**: El campo se almacena por track, no afecta a `artists`, `profiles` ni a la lógica de Eudald Payés / fichas de artista. No rompe la "single source of truth" de roster.
- **Contratos**: `IPLicenseGenerator` ya tiene un campo equivalente (`grabacion_fecha_fijacion`) introducido manualmente. Tras esta migración, en el futuro se podrá precargar desde el track (no se hace en este cambio para mantenerlo acotado).
- **Label Copy / Splits PDF**: No se incluye en exportes ahora (no rompe nada); se podrá añadir después.

## Cambios técnicos

### 1. Migración de base de datos
Añadir columna a `tracks`:
```sql
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS recording_fixation_date date;
COMMENT ON COLUMN public.tracks.recording_fixation_date IS
  'Fecha en la que se fijó (grabó) por primera vez la interpretación. Útil para contratos de Propiedad Intelectual.';
```
- Tipo `date` nativo de PostgreSQL → previene inyección SQL por construcción (no se concatenan strings).
- Las políticas RLS existentes de `tracks` cubren la nueva columna automáticamente.

### 2. Validación estricta con Zod (`src/pages/release-sections/ReleaseCreditos.tsx`)
Crear esquema antes del `updateTrack.mutate`:
```ts
const TrackUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  isrc: z.string().trim().regex(/^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i).optional().or(z.literal('')),
  lyrics: z.string().max(20000).optional(),
  recording_fixation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => {
    const dt = new Date(d);
    return !isNaN(dt.getTime()) && dt <= new Date();
  }, 'Fecha inválida o futura').nullable().optional(),
  c_copyright_holder: z.string().trim().max(255).nullable(),
  p_copyright_holder: z.string().trim().max(255).nullable(),
  c_copyright_year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable(),
  p_production_year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable(),
  explicit: z.boolean(),
});
```
Edge cases manejados:
- Fecha vacía → se guarda como `null`.
- Fecha futura → rechazada (no se puede fijar algo que no ha ocurrido).
- Strings con HTML/script → React escapa al renderizar (XSS prevenido); además `.trim()` y `.max()` limitan input.
- Valor inválido → `toast.error` con mensaje claro, no se llama al backend.

### 3. UI del diálogo (`EditTrackForm`)
Añadir dentro del bloque "Copyright & Producción", debajo de los selects de año:
```tsx
<div className="col-span-2">
  <Label htmlFor="edit_fixation_date" className="text-xs">
    Fecha de fijación de la grabación
  </Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full h-8 justify-start text-left font-normal text-sm">
        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
        {fixationDate ? format(fixationDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar mode="single" selected={fixationDate} onSelect={setFixationDate}
                disabled={(d) => d > new Date()} initialFocus />
    </PopoverContent>
  </Popover>
  <p className="text-[11px] text-muted-foreground mt-1">
    Útil para contratos de Propiedad Intelectual y registros legales.
  </p>
</div>
```
Estado: `const [fixationDate, setFixationDate] = useState<Date | undefined>(track.recording_fixation_date ? new Date(track.recording_fixation_date) : undefined);`

En el submit: `recording_fixation_date: fixationDate ? format(fixationDate, 'yyyy-MM-dd') : null`.

### 4. Tipos
- Actualizar la interfaz `Track` en `src/hooks/useReleases.ts` añadiendo `recording_fixation_date: string | null`.
- `src/integrations/supabase/types.ts` se regenera automáticamente tras la migración.
- Actualizar la firma de `updateTrack.mutationFn` y la prop `onSubmit` de `EditTrackForm`.

## Archivos a modificar / crear

- **Nueva migración SQL**: añadir columna `recording_fixation_date` a `tracks`.
- `src/pages/release-sections/ReleaseCreditos.tsx`: estado, UI del campo, esquema Zod, mutación.
- `src/hooks/useReleases.ts`: tipo `Track`.

## Seguridad — checklist

- ✅ Validación Zod estricta antes del envío (longitud, formato, rango de fechas).
- ✅ Tipo `date` en PostgreSQL → sin riesgo de inyección SQL.
- ✅ RLS existente en `tracks` cubre la nueva columna (autorización por release).
- ✅ React escapa contenido al renderizar → XSS prevenido en visualización.
- ✅ Edge cases: fecha vacía (null), fecha futura (rechazada), formato inválido (rechazada con toast).
- ✅ No se rompe lógica de auth, perfiles de artista, contratos ni Label Copy.
