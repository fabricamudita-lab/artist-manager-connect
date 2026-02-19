
# Rediseño del Panel de Inconsistencias — UX orientada a tareas

## Problema #1: Duplicados de warnings

El bug de "Nº tracks desactualizado" apareciendo 3 veces se debe a que el check de `track_count` corre dentro del `for (const budget of linkedBudgets)`. Si hay 3 presupuestos, el warning se genera 3 veces (una por presupuesto), aunque todos comparten el mismo release.

Lo mismo ocurre con `physical_no_milestone` — es una condición del release, no de un presupuesto concreto, y se duplica si hay varios presupuestos con `release_date_physical`.

**Fix:** Separar los checks en dos categorías:
- **Por presupuesto** (track_count, release_date_changed, missing_vinyl_master, version_no_tracks): se generan una vez por presupuesto.
- **Del release** (physical_no_milestone, date_mismatch): se generan una sola vez, fuera del loop de presupuestos.

## Problema #2: UX del panel de alertas

Sustituir la lista de banners ámbar por un panel tipo **"Centro de tareas pendientes"** con:

### Layout nuevo

Un área colapsable con un resumen de cuántas inconsistencias hay. Al expandir, las tareas se muestran como tarjetas interactivas, agrupadas por urgencia. Cada tarjeta tiene:

- Un **título claro y accionable** (no técnico)
- Una **descripción breve** (1 línea)
- **Acciones directas integradas** en la propia tarjeta, no como texto plano

### Diseño de tarjeta de tarea

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠  El presupuesto tiene 1 canción, pero el release tiene 2  │
│     "Presupuesto - La Flor de Déu"                           │
│                                                               │
│  [Actualizar presupuesto]  [Ignorar]                         │
└──────────────────────────────────────────────────────────────┘
```

Para decisiones duales (qué fecha usar):
```
┌──────────────────────────────────────────────────────────────┐
│  📅 Fecha de lanzamiento distinta en presupuesto y release   │
│     El presupuesto dice 15 feb, el release dice 22 feb       │
│                                                               │
│  [✓ Usar 15 feb (presupuesto)]  [✓ Usar 22 feb (release)]   │
└──────────────────────────────────────────────────────────────┘
```

Para tareas de navegación:
```
┌──────────────────────────────────────────────────────────────┐
│  📋 Falta el flujo de fabricación en el cronograma           │
│     Tienes fecha física (22 feb) pero sin hitos de fab.      │
│                                                               │
│  [→ Crear hito en Cronograma]                                │
└──────────────────────────────────────────────────────────────┘
```

### Header colapsable con indicador de estado

```
┌──────────────────────────────────────────────────────────────┐
│  ⚡ 3 puntos para revisar              [Ver tareas ▼]        │
└──────────────────────────────────────────────────────────────┘
```

Cuando todas están resueltas → verde con "Todo en orden ✓".

### Acciones específicas por tipo

| Tipo | Acción principal | Acción secundaria |
|------|-----------------|-------------------|
| `track_count` | "Actualizar nº de canciones en el presupuesto" (actualiza metadata.variables.n_tracks) | "Ignorar" (descarta la warning localmente) |
| `release_date_changed` | Botón con la fecha del presupuesto | Botón con la fecha del release |
| `physical_no_milestone` | "Ir al Cronograma →" (navega) | — |
| `missing_vinyl_master` | "Abrir presupuesto" (abre BudgetDetailsDialog) | — |
| `version_no_tracks` | "Ir a Créditos & Audio →" | — |
| `date_mismatch` | "Ir al Cronograma →" | — |

### Funcionalidad de "Ignorar"

Un estado local `dismissedWarnings: Set<string>` (identificado por tipo + budgetId) permite al usuario ocultar warnings que elige no resolver. El estado se guarda en `sessionStorage` para que no reaparezcan al refrescar la página en la misma sesión.

---

## Cambios técnicos

### `src/pages/release-sections/ReleasePresupuestos.tsx`

**1. Fix del bug de duplicados** (~líneas 156–264):
- Sacar `physical_no_milestone` fuera del `for (const budget of linkedBudgets)` — se comprueba una sola vez.
- `track_count` ya está dentro del loop pero referencia `currentTrackCount` (del release). Es correcto que genere un warning por presupuesto (cada presupuesto tiene su propio `n_tracks`), pero la descripción debe ser diferenciada. El bug real es que se tienen 3 presupuestos con el mismo `n_tracks`. La solución es deduplicar warnings con el mismo `type + message` usando un `Set`.

**2. Nuevo componente inline `InconsistencyPanel`** (dentro del mismo archivo):
```tsx
function InconsistencyPanel({ warnings, onResolve, onDismiss, ... }) {
  const [expanded, setExpanded] = useState(true);
  // Renders collapsible header + task cards
}
```

**3. Nueva acción: actualizar n_tracks del presupuesto**:
```tsx
const resolveTrackCount = async (budgetId: string) => {
  const budget = linkedBudgets.find(b => b.id === budgetId);
  if (!budget) return;
  const meta = { ...(budget.metadata || {}) };
  if (!meta.variables) meta.variables = {};
  meta.variables.n_tracks = tracks?.length || 0;
  await supabase.from('budgets').update({ metadata: meta }).eq('id', budgetId);
  toast.success('Número de canciones actualizado en el presupuesto');
  fetchLinkedBudgets();
};
```

**4. Estado de warnings descartados**:
```tsx
const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => {
  try {
    const saved = sessionStorage.getItem(`dismissed-warnings-${id}`);
    return new Set(saved ? JSON.parse(saved) : []);
  } catch { return new Set(); }
});

const dismiss = (key: string) => {
  setDismissedKeys(prev => {
    const next = new Set(prev).add(key);
    sessionStorage.setItem(`dismissed-warnings-${id}`, JSON.stringify([...next]));
    return next;
  });
};
```

Cada warning tiene un `key` único: `${type}-${budgetId || 'release'}`.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/release-sections/ReleasePresupuestos.tsx` | Fix bug duplicados + nuevo panel de tareas completo |

Sin cambios en base de datos, sin nuevos archivos.
