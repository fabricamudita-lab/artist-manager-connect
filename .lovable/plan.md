
# FAB Inteligente: Sugerencia automática de categoría por análisis del archivo

## El problema actual

El diálogo actual del FAB pregunta primero la categoría y luego el archivo — el orden inverso a lo natural. El usuario tiene que saber de antemano dónde va el archivo. La imagen de referencia confirma este flujo: primero hay que elegir en un Select, luego seleccionar el archivo.

## Nueva propuesta: Drag & Drop primero, categoría sugerida después

El flujo se invierte completamente:

```text
Antes:  [Elegir categoría] → [Seleccionar archivo] → Subir
Ahora:  [Soltar/Seleccionar archivo] → [IA analiza] → [Categoría sugerida] → Confirmar o cambiar → Subir
```

## Cómo se detecta la categoría (sin IA externa, solo lógica local)

Se implementa una función `detectCategory(file: File): { category: string; reason: string; confidence: 'alta' | 'media' | 'baja' }` que analiza:

### 1. Por MIME type (máxima fiabilidad)
| MIME | Categoría sugerida |
|---|---|
| `image/*` | IMÁGENES |
| `audio/*` | AUDIO (stems, masters) |
| `video/*` | AUDIOVISUALES |

### 2. Por extensión de archivo
| Extensión | Categoría sugerida |
|---|---|
| `.pdf`, `.docx`, `.doc` | CONTRATOS / LEGAL (si el nombre incluye "contrato", "acuerdo", "rider") |
| `.pdf` genérico | PRENSA o CONTRATOS |
| `.ai`, `.psd`, `.svg`, `.eps`, `.png` grande | DISEÑO |
| `.wav`, `.aif`, `.flac`, `.stem` | AUDIO (stems, masters) |
| `.mp3`, `.ogg` | AUDIO (stems, masters) |
| `.mp4`, `.mov`, `.avi` | AUDIOVISUALES |
| `.xlsx`, `.xls`, `.csv` | PRESUPUESTOS Y FACTURAS |

### 3. Por palabras clave en el nombre del archivo
| Palabras en el nombre | Categoría sugerida |
|---|---|
| `contrato`, `acuerdo`, `contract`, `legal`, `nda` | CONTRATOS / LEGAL |
| `rider`, `hospitality`, `hoja de ruta`, `roadmap` | CONCIERTOS |
| `factura`, `presupuesto`, `invoice`, `budget` | PRESUPUESTOS Y FACTURAS |
| `prensa`, `press`, `dossier`, `nota de prensa` | PRENSA |
| `logo`, `arte`, `flyer`, `cartel`, `banner` | DISEÑO |
| `marketing`, `rrss`, `social`, `campaña` | MARKETING |
| `merch`, `merchandise`, `tienda` | MERCH |
| `distribucion`, `upc`, `isrc`, `pitch` | DISTRIBUCIÓN DIGITAL |
| `stem`, `master`, `mix`, `vocal` | AUDIO (stems, masters) |
| `nif`, `pasaporte`, `dni`, `passport` | DOCUMENTOS DEL ARTISTA |
| `clip`, `videoclip`, `making`, `teaser` | AUDIOVISUALES |
| `foto`, `photo`, `promo`, `portrait` | IMÁGENES |

### 4. Confianza del resultado
- **Alta**: MIME + nombre coinciden (ej: `contrato_festival.pdf` → CONTRATOS)
- **Media**: Solo MIME o solo nombre
- **Baja**: Ningún indicador claro → se muestra sin preselección, pidiendo al usuario que elija

## Nuevo diseño del diálogo FAB

### Estado 1: Zona de drop (estado inicial)
```text
┌───────────────────────────────────────────────────────┐
│  Subir archivo inteligente                            │
│                                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │                                                │   │
│  │       ↑  Arrastra tu archivo aquí             │   │
│  │                                               │   │
│  │    o  [Seleccionar archivo desde disco]       │   │
│  │                                               │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  [Cancelar]                                           │
└───────────────────────────────────────────────────────┘
```

### Estado 2: Archivo detectado — categoría sugerida
```text
┌───────────────────────────────────────────────────────┐
│  Subir archivo                                        │
│                                                       │
│  📄 contrato_festival_mad.pdf  (245 KB)              │
│                                                       │
│  Categoría detectada:                                 │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ✓  CONTRATOS / LEGAL                           │  │
│  │    El nombre contiene "contrato" y es un PDF   │  │
│  │    Confianza: Alta                             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ¿No es correcto? Cambiar:  [Select de categorías]   │
│                                                       │
│  [Cancelar]    [Subir a CONTRATOS / LEGAL →]         │
└───────────────────────────────────────────────────────┘
```

### Estado 3 (confianza baja): Sin sugerencia clara
```text
│  ⚠️ No pudimos detectar la categoría automáticamente │
│  Por favor, selecciona dónde quieres guardar este    │
│  archivo:  [Select de categorías]                     │
```

## Cambios técnicos

### Archivos afectados: SOLO `src/pages/Carpetas.tsx`

No se toca `useArtistFiles.ts`, no se crean edge functions, no hay llamadas externas. Todo el análisis es local en el cliente.

### Cambio 1: Nueva función `detectCategory()`

Añadir antes del componente `Carpetas`:

```ts
function detectCategory(file: File): { 
  category: string | null; 
  reason: string; 
  confidence: 'alta' | 'media' | 'baja' 
} {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  // MIME-based detection (alta confianza base)
  if (mime.startsWith('audio/') || name.match(/\.(wav|aif|aiff|flac|stem|stems)$/)) {
    return { category: 'musica', reason: 'Es un archivo de audio', confidence: 'alta' };
  }
  if (mime.startsWith('video/') || name.match(/\.(mp4|mov|avi|mkv|webm)$/)) {
    // Check if it's a clip/videoclip by name
    if (name.match(/clip|videoclip|making|teaser|trailer/)) {
      return { category: 'audiovisuales', reason: 'El nombre sugiere contenido audiovisual', confidence: 'alta' };
    }
    return { category: 'audiovisuales', reason: 'Es un archivo de vídeo', confidence: 'alta' };
  }
  if (mime.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) {
    // Distinguish between design and press photos
    if (name.match(/logo|arte|flyer|cartel|banner|poster|artwork/)) {
      return { category: 'diseno', reason: 'El nombre sugiere material de diseño', confidence: 'alta' };
    }
    if (name.match(/foto|photo|promo|portrait|press|prensa|epk/)) {
      return { category: 'imagenes', reason: 'El nombre sugiere fotografía de prensa o EPK', confidence: 'alta' };
    }
    // .ai, .psd, .svg = design
    if (name.match(/\.(ai|psd|svg|eps|indd)$/)) {
      return { category: 'diseno', reason: 'Es un archivo de diseño gráfico', confidence: 'alta' };
    }
    return { category: 'imagenes', reason: 'Es una imagen', confidence: 'media' };
  }

  // Keyword-based for documents
  if (name.match(/contrato|contract|acuerdo|agreement|nda|legal/)) {
    return { category: 'contratos', reason: 'El nombre incluye términos legales o contractuales', confidence: 'alta' };
  }
  if (name.match(/rider|hospitality|hoja.de.ruta|roadmap|backline/)) {
    return { category: 'conciertos', reason: 'El nombre sugiere documentos de concierto o rider técnico', confidence: 'alta' };
  }
  if (name.match(/factura|invoice|presupuesto|budget|liquidaci/)) {
    return { category: 'economia', reason: 'El nombre sugiere documento financiero', confidence: 'alta' };
  }
  if (name.match(/prensa|press|dossier|nota.de.prensa|press.release/)) {
    return { category: 'prensa', reason: 'El nombre sugiere material de prensa', confidence: 'alta' };
  }
  if (name.match(/marketing|rrss|social|campa|contenido/)) {
    return { category: 'marketing', reason: 'El nombre sugiere material de marketing', confidence: 'alta' };
  }
  if (name.match(/merch|merchandise|tienda|shop/)) {
    return { category: 'merch', reason: 'El nombre sugiere material de merchandising', confidence: 'alta' };
  }
  if (name.match(/distribuci|upc|isrc|pitch|spotify|apple.music/)) {
    return { category: 'distribucion', reason: 'El nombre sugiere documentos de distribución digital', confidence: 'alta' };
  }
  if (name.match(/stem|master|mix|vocal|instrumental|session/)) {
    return { category: 'musica', reason: 'El nombre sugiere archivo de audio o producción', confidence: 'alta' };
  }
  if (name.match(/nif|pasaporte|passport|dni|dni|documento/)) {
    return { category: 'personal', reason: 'El nombre sugiere documento personal del artista', confidence: 'alta' };
  }

  // Spreadsheet = finances
  if (mime.includes('spreadsheet') || name.match(/\.(xlsx|xls|csv|ods)$/)) {
    return { category: 'economia', reason: 'Es una hoja de cálculo (probablemente financiera)', confidence: 'media' };
  }

  // Generic PDF — no keyword match
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return { category: 'contratos', reason: 'Es un PDF (posiblemente un contrato o documento legal)', confidence: 'baja' };
  }

  return { category: null, reason: 'No se pudo detectar la categoría automáticamente', confidence: 'baja' };
}
```

### Cambio 2: Nuevo estado para el FAB inteligente

Reemplazar:
```ts
const [fabCategory, setFabCategory] = useState<string>('');
```

Por:
```ts
const [fabCategory, setFabCategory] = useState<string>('');
const [fabFile, setFabFile] = useState<File | null>(null);
const [fabSuggestion, setFabSuggestion] = useState<{ category: string | null; reason: string; confidence: 'alta' | 'media' | 'baja' } | null>(null);
const [fabDragOver, setFabDragOver] = useState(false);
```

### Cambio 3: Handlers de drag & drop y detección

```ts
const handleFABDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setFabDragOver(false);
  const file = e.dataTransfer.files[0];
  if (file) {
    const suggestion = detectCategory(file);
    setFabFile(file);
    setFabSuggestion(suggestion);
    setFabCategory(suggestion.category || '');
  }
};

const handleFABFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const suggestion = detectCategory(file);
    setFabFile(file);
    setFabSuggestion(suggestion);
    setFabCategory(suggestion.category || '');
  }
};

const handleFABConfirmUpload = async () => {
  if (!selectedArtist || !fabCategory || !fabFile) return;
  await uploadFiles([fabFile], selectedArtist.id, fabCategory);
  setShowFABDialog(false);
  setFabFile(null);
  setFabSuggestion(null);
  setFabCategory('');
};
```

### Cambio 4: Nuevo JSX del diálogo FAB

El diálogo ahora tiene dos estados visuales: zona de drop (sin archivo) y confirmación de categoría (con archivo).

El `<input type="file" hidden ref={fabFileRef}>` ya no se necesita para seleccionar el archivo antes de elegir categoría — ahora el input se activa desde la zona de drop (estado 1) y la detección es inmediata.

Al cerrar el diálogo se resetea `fabFile`, `fabSuggestion` y `fabCategory`.

## Archivos modificados

| Archivo | Sección | Cambio |
|---|---|---|
| `src/pages/Carpetas.tsx` | Antes del componente | Nueva función `detectCategory()` |
| `src/pages/Carpetas.tsx` | Estado (líneas ~155-157) | Añadir `fabFile`, `fabSuggestion`, `fabDragOver` |
| `src/pages/Carpetas.tsx` | Handlers (líneas ~411-426) | Reemplazar `handleFABFileSelect` + `handleFABUpload` |
| `src/pages/Carpetas.tsx` | JSX del diálogo (líneas ~555-595) | Reescribir completamente el diálogo FAB |

**Sin tocar**: lógica de upload, `useArtistFiles`, rutas, `FileExplorer`, `ConciertosView`, categorías, archivos recientes. Solo se modifica el diálogo del FAB.

**Sin dependencias externas.** Todo el análisis es local — sin IA externa, sin edge functions, instantáneo.
