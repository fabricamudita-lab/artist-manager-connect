
# Convertir "Master" de selección única a selección múltiple con opciones reales

## Situación actual

El campo "Master" usa un `<Select>` de Radix UI con selección única (`value: string`, `useState('estereo')`). Solo permite elegir uno de estos 4 valores:
- `estereo` → Estéreo
- `vinilo` → Vinilo
- `atmos` → Dolby Atmos
- `tbd` → Por determinar

El valor se guarda en `metadata.master_type` (string simple) y se muestra en la observación de la partida "Master" como `Tipo: ${masterType}`.

## Tipos de master reales en la industria

Investigando los formatos de master que realmente se solicitan en un lanzamiento musical:

| Tipo | Descripción |
|------|-------------|
| Estéreo (Stereo) | El estándar universal para streaming y descarga digital |
| Vinilo (Vinyl/Lacquer) | Corte a lacquer para prensado en vinilo, requiere ecualización RIAA |
| Dolby Atmos | Mezcla espacial inmersiva (Apple Music Spatial Audio, Amazon Music, Tidal) |
| Stem Master | Master por stems separados (voz, instrumentos) para remixes y sincronización |
| CD (Red Book) | Estándar ISO 9660 para prensado en CD físico, distinto del estéreo digital |
| Cassette | Para ediciones físicas en casete (nichos y reediciones) |
| Instrumental / Karaoke | Versión sin voz, obligatorio para muchas distribuidoras y sync |
| 5.1 Surround | Mezcla surround clásica para Blu-ray y contenido audiovisual |
| Hi-Res (24-bit/96kHz+) | Para distribuidoras premium (Qobuz, Tidal HiFi, Apple Lossless) |
| Por determinar | Cuando aún no se ha decidido el formato final |

## Cambios técnicos

### 1. Estado: `string` → `string[]`
```tsx
// Antes:
const [masterType, setMasterType] = useState('estereo');

// Después:
const [masterTypes, setMasterTypes] = useState<string[]>(['estereo']);
```

### 2. UI: `<Select>` → lista de `<Checkbox>` con todas las opciones reales

Reemplazar el `<Select>` por una lista de checkboxes dentro de la sección de Grabación, de forma visualmente consistente con el resto del formulario.

```tsx
const MASTER_TYPE_OPTIONS = [
  { value: 'estereo', label: 'Estéreo', desc: 'Streaming & descarga digital' },
  { value: 'vinilo', label: 'Vinilo', desc: 'Prensado en vinilo (corte a lacquer)' },
  { value: 'atmos', label: 'Dolby Atmos', desc: 'Spatial Audio para Apple / Amazon / Tidal' },
  { value: 'stem', label: 'Stem Master', desc: 'Masters por stems (remix / sync)' },
  { value: 'cd', label: 'CD (Red Book)', desc: 'Prensado físico en CD' },
  { value: 'instrumental', label: 'Instrumental / Karaoke', desc: 'Versión sin voz' },
  { value: 'hires', label: 'Hi-Res (24-bit)', desc: 'Alta resolución para plataformas premium' },
  { value: 'cassette', label: 'Casete', desc: 'Edición física en casete' },
  { value: 'tbd', label: 'Por determinar', desc: '' },
];
```

La UI mostrará cada opción con su etiqueta y descripción en gris, con un `<Checkbox>` a la izquierda.

### 3. Metadata guardada: `master_type: string` → `master_types: string[]`

```json
// Antes:
{ "master_type": "vinilo" }

// Después:
{ "master_types": ["estereo", "vinilo", "atmos"] }
```

### 4. Observaciones de la partida presupuestaria

```tsx
// Antes:
if (itemName.includes('Master')) return `Tipo: ${masterType}`;

// Después:
if (itemName.includes('Master')) {
  const labels = masterTypes.map(v => MASTER_TYPE_OPTIONS.find(o => o.value === v)?.label || v);
  return labels.length ? `Tipos: ${labels.join(', ')}` : '';
}
```

### 5. Validación: al menos un tipo seleccionado

Si el usuario deselecciona todos, se muestra un aviso inline debajo del grupo de checkboxes: "Selecciona al menos un tipo de master".

## Archivos a modificar

Solo un archivo: `src/components/releases/CreateReleaseBudgetDialog.tsx`

- Cambiar el estado `masterType` → `masterTypes: string[]`
- Añadir constante `MASTER_TYPE_OPTIONS` junto a las demás constantes del archivo
- Reemplazar el `<Select>` en el JSX (líneas 970–980) por el grupo de checkboxes
- Actualizar la referencia en `getDefaultObservations` (línea 536)
- Actualizar la referencia en `metadata` del submit (línea 362)

Sin cambios en base de datos — el campo `metadata` es JSONB y acepta cualquier estructura.
