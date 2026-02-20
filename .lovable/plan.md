
# Rediseño de la tabla de Presupuestos — columnas universales para todos los tipos

## Diagnóstico del problema actual

La tabla en `src/pages/Budgets.tsx` tiene estas columnas: **Nombre | Ciudad | Venue | Fecha | Estado | Importe | Acciones**

Problemas identificados en el código (y confirmados en la captura):

1. **La columna "Venue" muestra la dirección completa** (ej: "Carrer d'Àlaba, 30, Sant Martí, 08005") — el campo `venue` en la base de datos almacena la dirección literal del lugar, no el nombre del recinto
2. **La columna "Fecha" muestra el valor del campo `venue`** — hay un bug en el código: la línea 303 dice `{budget.venue || '-'}` en lugar de mostrar `event_date`
3. **Ciudad y Venue solo aplican a conciertos** — un presupuesto de producción musical (como "Presupuesto - La Flor de Déu") no tiene ciudad ni venue, mostrando guiones en toda la fila
4. **El campo `budget_status`** tiene valores `nacional/internacional` (no describe el estado del documento), mientras que `show_status` tiene `confirmado/pendiente/cancelado` (tampoco describe el estado del presupuesto como documento)
5. **Sin diferenciación por tipo** — no se ve a simple vista si es un concierto, producción musical, campaña, etc.
6. **Sin vínculo visible** a release, proyecto o booking

## Análisis de la base de datos

Los campos disponibles en la tabla `budgets` son:

| Campo | Tipo | Para qué sirve realmente |
|---|---|---|
| `type` | enum | `concierto`, `produccion_musical`, `campana_promocional`, `videoclip`, `otros` |
| `name` | text | Nombre del presupuesto |
| `budget_status` | enum | `nacional` / `internacional` (¿ámbito geográfico, no estado del doc!) |
| `show_status` | enum | `confirmado` / `pendiente` / `cancelado` (estado del evento, no del presupuesto) |
| `fee` | numeric | CAPITAL / Importe principal (ingresos) |
| `expense_budget` | numeric | Presupuesto de gastos |
| `event_date` | date | Fecha del evento (solo conciertos) |
| `city` | text | Ciudad (solo conciertos) |
| `venue` | text | Nombre del recinto (pero contiene direcciones en algunos casos) |
| `release_id` | uuid | Vínculo a discografía |
| `project_id` | uuid | Vínculo a proyecto |
| `artist_id` | uuid | Artista |
| `metadata.estado` | jsonb | Estado real del workflow del presupuesto (ej: "produccion") |
| `settlement_status` | text | Estado de liquidación (`open`) |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Última modificación |

**Hallazgo clave**: el "estado" real del presupuesto (borrador, en revisión, aprobado, etc.) **no tiene columna propia** — vive dentro del campo `metadata` como `metadata.estado`. La interfaz usa `budget_status` para mostrar "borrador" pero ese campo contiene `nacional/internacional`.

## Columnas universales propuestas (análisis desde gestión de proyectos)

Basado en los principios de gestión financiera de proyectos creativos, las columnas óptimas para identificar cualquier presupuesto de un vistazo son:

| Columna | Datos mostrados | Justificación |
|---|---|---|
| **Tipo** | Badge con icono (🎤 Concierto, 💿 Producción, 📣 Campaña, 🎥 Videoclip) | Contexto inmediato sin leer el nombre |
| **Nombre** | `budget.name` | Identificador principal |
| **Artista** | `artist_name` / `stage_name` | Qué artista concierne |
| **Vinculado a** | Release / Proyecto / Booking | Navegación cruzada, muestra el contexto |
| **Fecha clave** | `event_date` si es concierto, `created_at` si no | La fecha más relevante según el tipo |
| **Estado** | `metadata.estado` o `show_status` según tipo | Estado real del documento |
| **Capital (€)** | `fee` | Importe principal (ingresos/inversión) |
| **Gastos (€)** | `expense_budget` | Presupuesto de costes |
| **Acciones** | Ver, Eliminar | Acciones rápidas |

## Cambios técnicos

### Solo se modifica `src/pages/Budgets.tsx`

**Cambio 1: Ampliar la query para traer datos de artista y vinculaciones**

Reemplazar el `select('*')` actual por:
```ts
.select(`
  id, name, type, city, venue, event_date, budget_status, show_status,
  fee, expense_budget, metadata, created_at, updated_at, artist_id,
  release_id, project_id,
  artists:artist_id(name, stage_name),
  releases:release_id(title),
  projects:project_id(name)
`)
```

**Cambio 2: Ampliar la interfaz `Budget`**

```ts
interface Budget {
  id: string;
  name: string;
  type: string;
  city?: string;
  venue?: string;
  event_date?: string;
  budget_status?: string;
  show_status?: string;
  fee?: number;
  expense_budget?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  artist_id?: string;
  release_id?: string;
  project_id?: string;
  artists?: { name: string; stage_name?: string };
  releases?: { title: string };
  projects?: { name: string };
}
```

**Cambio 3: Helper `getEstadoReal(budget)`**

```ts
// El estado real vive en metadata.estado para presupuestos de producción
// y en show_status para conciertos
function getEstadoReal(budget: Budget): string {
  if (budget.metadata?.estado) return budget.metadata.estado;
  if (budget.show_status) return budget.show_status;
  if (budget.budget_status && budget.budget_status !== 'nacional' && budget.budget_status !== 'internacional') {
    return budget.budget_status;
  }
  return 'borrador';
}
```

**Cambio 4: Helper `getVinculacion(budget)` para la columna "Vinculado a"**

```ts
function getVinculacion(budget: Budget): { label: string; type: 'release' | 'project' | 'none' } | null {
  if (budget.releases?.title) return { label: budget.releases.title, type: 'release' };
  if (budget.projects?.name) return { label: budget.projects.name, type: 'project' };
  return null;
}
```

**Cambio 5: Config de tipos con icono y colores**

```ts
const BUDGET_TYPES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  concierto:           { label: 'Concierto',   icon: '🎤', color: 'text-green-700',  bg: 'bg-green-50' },
  produccion_musical:  { label: 'Producción',  icon: '💿', color: 'text-purple-700', bg: 'bg-purple-50' },
  campana_promocional: { label: 'Campaña',     icon: '📣', color: 'text-pink-700',   bg: 'bg-pink-50' },
  videoclip:           { label: 'Videoclip',   icon: '🎥', color: 'text-amber-700',  bg: 'bg-amber-50' },
  otros:               { label: 'Otros',       icon: '📋', color: 'text-slate-700',  bg: 'bg-slate-50' },
};
```

**Cambio 6: Nueva estructura de columnas en la tabla**

```
[Tipo] [Nombre] [Artista] [Vinculado a] [Fecha] [Estado] [Capital] [Gastos] [Acciones]
```

- **Tipo**: Badge con icono + label corto (`🎤 Concierto`)
- **Nombre**: `budget.name`, click abre el detalle
- **Artista**: `budget.artists?.stage_name || budget.artists?.name || '—'`
- **Vinculado a**: badge azul para releases, verde para proyectos, `—` si nada
- **Fecha**: `event_date` formateada si existe, si no `created_at` (con label "Creado")
- **Estado**: badge de color (borrador=gris, pendiente=amarillo, confirmado=verde, etc.)
- **Capital**: `€{fee}` en verde si > 0
- **Gastos**: `€{expense_budget}` en rojo/naranja si > 0, `—` si cero
- **Acciones**: Ver + Eliminar

**Cambio 7: Fix del bug de columnas duplicadas**

La línea 303 actual tiene `{budget.venue || '-'}` en la columna de Fecha. Esto se elimina completamente al reestructurar las columnas.

**Cambio 8: Actualizar filtro de búsqueda**

Añadir `name`, `artists.stage_name`, `releases.title`, `projects.name` al filtro de búsqueda para mayor cobertura.

**Cambio 9: KPI cards actualizadas**

Reemplazar los 3 KPIs actuales por métricas universales:
- Total presupuestos
- Capital total (suma de `fee`)
- Gastos totales (suma de `expense_budget`)
- (opcional) Balance neto

## Resultado visual esperado

```
Tipo        Nombre                    Artista    Vinculado a          Fecha       Estado      Capital   Gastos
🎤 Concierto  260419 Barcelona VIC    Artista X  —                   19/4/2026   Pendiente   €10.000   €3.200
💿 Producción Presupuesto - Álbum    Pol Batlle  💿 La Flor de Déu  —           En produc.  €10.000   €8.500
🎤 Concierto  Inverfest               Artista X  —                   26/4/2026   Pendiente   €15.000   €4.000
```

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Budgets.tsx` | Nueva query + nueva interfaz + nuevas columnas + helpers + fix del bug |

**Sin tocar**: `BudgetDetailsDialog`, `CreateBudgetDialog`, base de datos, rutas. Solo se modifica la lista/tabla.

**Sin migraciones necesarias**: Todos los datos necesarios ya existen en la base de datos. Solo se usan correctamente.
