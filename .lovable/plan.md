
# Aplicar la estética de sub-bloque a más secciones del wizard

## Objetivo

Unificar la estética del formulario aplicando el patrón de sub-bloques con sub-secciones anidadas a las secciones: **Versión** (multiselección), **Tipos de master** (con perfil vinculable por tipo), **Visual & Contenido** (toggle general de categoría), **PR & Marketing** (periodo de actividad), y **Logística** (switch general de categoría).

---

## Cambios sección por sección

### 1. VERSIÓN → multi-selección con chips (Paso 1: Metadata)

**Situación actual:** `Select` de una sola opción (dropdown) en el Step 1.

**Propuesta:** Reemplazar por un grid de chips seleccionables (multi-select), con el mismo estilo visual que los formatos físicos. Cada versión es un chip con `SelectionCheckbox` o toggle visual (border-primary cuando activo).

- Nuevo estado: `versions: string[]` (array), reemplaza el `version: string` actual.
- Constante `VERSION_OPTIONS` con las versiones del dropdown actual (Original, Explicit, Clean, Instrumental, Acústica, Live, Remix, Extended, Deluxe, Remasterizado, EP, Otro).
- UI: Grid 2 columnas de pills seleccionables. Mínimo 1 seleccionada (Original por defecto).
- Propagar al `handleSubmit` como `versions` en el metadata.

```
┌────────────────────────────────────────────────┐
│  VERSIONES                                      │
│  [x] Original   [ ] Explicit                   │
│  [ ] Instrumental  [ ] Clean (Radio Edit)      │
│  [ ] Live       [ ] Remix oficial              │
│  ...                                            │
└────────────────────────────────────────────────┘
```

---

### 2. TIPOS DE MASTER → añadir selector de técnico por tipo (Paso 3: Variables)

**Situación actual:** Lista de items con checkbox + label + desc. Sin selector de perfil.

**Propuesta:** Cuando un tipo de master está seleccionado, mostrar debajo un `SingleProducerSelector` para asignar un técnico de mastering. Visualmente, cada item expandido mostrará el selector con indentación.

- Nuevo estado: `masterEngineers: Record<string, ProducerRef | null>` — mapa de `masterType.value → ProducerRef`.
- Cuando se deselecciona un tipo, se limpia su entrada en el mapa.
- Propagación al submit: `master_engineers: masterEngineers` en variables.

```
┌─────────────────────────────────────────────────────────┐
│  [x] Estéreo                                            │
│      Streaming & descarga digital                       │
│      Técnico: [Seleccionar técnico...]                  │
│                                                         │
│  [ ] Vinilo                                             │
│      Corte a lacquer...                                 │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

### 3. VISUAL & CONTENIDO → toggle general ON/OFF de categoría (Paso 3: Variables)

**Situación actual:** La sección "Visual & Contenido" siempre está visible y tiene inputs/toggles sueltos.

**Propuesta:** Añadir un switch general `visualActivo` a la cabecera de la sección. Si está OFF, todo el contenido de la sección se colapsa (inputs de videoclips, cápsulas y sub-toggles). Si está OFF no se generan partidas de diseño/visual.

- Nuevo estado: `visualActivo: boolean` (default: `true` para no romper comportamiento actual).
- Cuando `visualActivo = false`: setNVideoclips(0), setNCapsulasRRSS(0), setShooting(false), etc.
- La cabecera `h4` lleva el switch alineado a la derecha.
- `getActiveCategories()` actualizado: `if (visualActivo && ...)`.

```
VISUAL & CONTENIDO  ────────────────────  [Switch ON/OFF]
  (contenido colapsado si OFF)
```

---

### 4. PR & MARKETING → añadir periodo de actividad por servicio (Paso 3: Variables)

**Situación actual:** PR nacional / internacional / RRSS tienen un selector de proveedor y un input de coste.

**Propuesta:** Añadir un `Select` de **periodo de actividad** (1 mes, 2 meses, 3 meses, 6 meses, campaña puntual) para cada uno de los tres servicios PR.

- Nuevos estados: `prNacionalPeriodo`, `prInternacionalPeriodo`, `rrssPerido` — string con valor del periodo.
- Constante `PERIODOS_PR = ['1 mes', '2 meses', '3 meses', '6 meses', 'Campaña puntual']`.
- UI: Añadir un `Select` compacto (`h-8 text-xs`) al bloque de cada PR, después del selector de proveedor y coste. Alinear en grid 3 columnas: proveedor | coste | periodo.
- Propagación al submit en `variables`.

```
¿PR nacional?  [toggle]  [Producción propia / Derivado]
  ┌───────────────┬──────────┬──────────────────┐
  │ Proveedor     │ Coste €  │ Periodo           │
  │ [selector]    │ [input]  │ [1 mes ▼]        │
  └───────────────┴──────────┴──────────────────┘
```

---

### 5. LOGÍSTICA → switch general de categoría (Paso 3: Variables)

**Situación actual:** Tres toggles independientes (Transporte, Dietas, Hospedaje) siempre visibles.

**Propuesta:** Añadir un switch general `logisticaActiva` en la cabecera de la sección. Si está OFF, la sección se colapsa y ninguno de los tres aparece. Si está ON, se muestra el contenido actual.

- Nuevo estado: `logisticaActiva: boolean` (default: `false` — la logística es opcional por naturaleza en un presupuesto de lanzamiento).
- Al desactivar: resetear `transporte`, `dietas`, `hospedaje` a false.
- Cabecera con switch alineado a la derecha, igual que Visual & Contenido.

```
LOGÍSTICA  ────────────────────────────  [Switch ON/OFF]
  Si ON:
    ¿Transporte?  [toggle]  [Derivado]
    ¿Dietas?      [toggle]  [Derivado]
    ¿Hospedaje?   [toggle]  [Derivado]
```

---

## Estados nuevos a añadir (~línea 317)

```tsx
const [versions, setVersions] = useState<string[]>(['original']);  // multiselect versiones
const [masterEngineers, setMasterEngineers] = useState<Record<string, ProducerRef | null>>({});  // técnico por tipo master
const [visualActivo, setVisualActivo] = useState(true);  // toggle general visual
const [prNacionalPeriodo, setPrNacionalPeriodo] = useState('');
const [prInternacionalPeriodo, setPrInternacionalPeriodo] = useState('');
const [rrssPeriodo, setRrssPeriodo] = useState('');
const [logisticaActiva, setLogisticaActiva] = useState(false);  // toggle general logística
```

---

## Constantes nuevas a añadir (~línea 97)

```tsx
const VERSION_OPTIONS = [
  { value: 'original', label: 'Original' },
  { value: 'explicit', label: 'Explicit' },
  { value: 'clean', label: 'Clean (Radio Edit)' },
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'acustica', label: 'Acústica' },
  { value: 'live', label: 'Live / En directo' },
  { value: 'remix', label: 'Remix oficial' },
  { value: 'extended', label: 'Extended Mix (DJ Edit)' },
  { value: 'deluxe', label: 'Deluxe / Edición especial' },
  { value: 'remaster', label: 'Remasterizado' },
  { value: 'ep', label: 'EP' },
  { value: 'otro', label: 'Otro' },
];

const PERIODOS_PR = [
  { value: '1m', label: '1 mes' },
  { value: '2m', label: '2 meses' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: 'puntual', label: 'Campaña puntual' },
];
```

---

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:

1. Añadir constantes `VERSION_OPTIONS` y `PERIODOS_PR` (~línea 97)
2. Añadir nuevos estados (~línea 317)
3. **Step 1 Metadata** (~línea 756): Reemplazar el `Select` de Versión por grid de chips multi-select
4. **Step 3 Variables**:
   - Master types (~línea 1114): Añadir `SingleProducerSelector` condicional por cada tipo seleccionado
   - Visual & Contenido (~línea 1152): Añadir switch general en cabecera y colapsar cuando OFF
   - PR & Marketing (~línea 1203): Añadir `Select` de periodo para cada servicio (grid 3 columnas)
   - Logística (~línea 1228): Añadir switch general en cabecera y colapsar cuando OFF
5. Actualizar `handleSubmit` con los nuevos estados en `variables`
6. Actualizar `getActiveCategories()`: respetar `logisticaActiva` y `visualActivo`
