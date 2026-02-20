
# Detección y resolución de presupuestos duplicados

## El problema (confirmado en la captura)

Hay 4 presupuestos "Presupuesto - PLAYGRXVND" exactamente iguales: mismo tipo, artista, fecha, estado y capital €3500. Esto ocurre típicamente al crear un presupuesto automáticamente desde un booking repetido o al duplicar manualmente.

## Estrategia de detección

Un presupuesto se considera duplicado cuando comparte con otro **todos** estos campos:
- `name` (normalizado: sin espacios extra, lowercase)
- `artist_id`
- `type`
- `fee` (capital)
- `event_date` (si existe, o ambos null)

Si comparten solo algunos (ej. mismo nombre y artista, pero diferente capital), se consideran **similares** y el warning muestra en qué difieren.

## Cuándo y cómo se muestra el warning

### 1. Banner de alerta en la parte superior de la tabla

Cuando `filteredBudgets` contiene grupos de 2+ presupuestos que cumplen los criterios de similitud, aparece un banner ámbar justo encima de la tabla:

```
⚠️  Se detectaron 2 grupos con posibles duplicados (4 presupuestos)   [Revisar]
```

El botón "Revisar" abre un **diálogo de resolución de duplicados**.

### 2. Filas marcadas visualmente

Las filas duplicadas muestran un indicador de advertencia sutil: un punto naranja o un icono `⚠` pequeño en la columna "Tipo", antes del badge de tipo.

## El diálogo de resolución (`DuplicateBudgetsDialog`)

Se crea como componente inline dentro de `Budgets.tsx`. Muestra un grupo de duplicados a la vez, con navegación "Grupo 1 de N".

### Estructura del diálogo para un grupo

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Posibles duplicados — Grupo 1 de 1                   │
│  "Presupuesto - PLAYGRXVND" · Klaus Stroink             │
│─────────────────────────────────────────────────────────│
│  Comparativa de los 4 presupuestos:                      │
│                                                          │
│  │   │ #1 (original) │ #2            │ #3    │ #4       │
│  │ ID│ ...abc1       │ ...abc2       │ ...   │ ...      │
│  │ 📅 │ 19/02/2026   │ 19/02/2026   │ = │ =           │
│  │ € │ €3.500        │ €3.500        │ = │ =           │
│  │ 🗂 │ Borrador      │ Borrador     │ = │ =           │
│  │ 📁 │ —             │ —            │ = │ =           │
│  │ 📝 │ 3 categorías  │ 0 categorías │ = │ =           │
│                                                          │
│  Diferencias encontradas: número de categorías internas  │
│                                                          │
│  ¿Qué quieres hacer?                                     │
│                                                          │
│  [Conservar #1 y eliminar el resto]                      │
│  [Conservar #2 y eliminar el resto]                      │
│  [Ignorar — mantener todos]                              │
│  [Cancelar]                                              │
└─────────────────────────────────────────────────────────┘
```

### Lógica de "complementar" (cuando los duplicados tienen datos distintos)

Si hay incongruencias entre duplicados (diferente capital, diferente estado, vinculados a proyectos distintos), aparece una opción extra:

```
[Usar los datos de #1 pero con el capital de #2]
→ Esto abre un mini-editor para elegir campo a campo qué valor conservar
```

Este modo "complementar" muestra una tabla de decisión:

```
Campo        │  #1 (elegir)  │  #2 (elegir)
─────────────┼───────────────┼───────────────
Capital      │ ○ €3.500      │ ● €4.200
Estado       │ ● Borrador    │ ○ Confirmado
Vinculado a  │ ● On TOUR     │ ○ —
```

El usuario selecciona qué valor quiere para cada campo, luego pulsa "Fusionar → conservar #1 con cambios seleccionados", lo cual:
1. Actualiza el presupuesto #1 con los valores elegidos
2. Elimina los demás

## Cambios técnicos — solo `src/pages/Budgets.tsx`

### Nueva función `detectDuplicates(budgets)`

```ts
function detectDuplicates(budgets: Budget[]): Budget[][] {
  const groups: Budget[][] = [];
  const visited = new Set<string>();

  for (let i = 0; i < budgets.length; i++) {
    if (visited.has(budgets[i].id)) continue;
    const group = [budgets[i]];
    for (let j = i + 1; j < budgets.length; j++) {
      if (areSimilar(budgets[i], budgets[j])) {
        group.push(budgets[j]);
        visited.add(budgets[j].id);
      }
    }
    if (group.length > 1) {
      groups.push(group);
      visited.add(budgets[i].id);
    }
  }
  return groups;
}

function areSimilar(a: Budget, b: Budget): boolean {
  const sameName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  const sameArtist = a.artist_id === b.artist_id;
  const sameType = (a.type ?? '') === (b.type ?? '');
  const sameFee = (a.fee ?? 0) === (b.fee ?? 0);
  const sameDate = (a.event_date ?? null) === (b.event_date ?? null);

  // Duplicado exacto: todos iguales
  // Similar: al menos nombre + artista + tipo
  return sameName && sameArtist && sameType && (sameFee || sameDate);
}
```

### Nuevos estados

```ts
const [duplicateGroups, setDuplicateGroups] = useState<Budget[][]>([]);
const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
// Para el modo "complementar"
const [mergeSelections, setMergeSelections] = useState<Record<string, string>>({}); // field -> budgetId
```

### Cálculo de grupos (reactivo)

```ts
useEffect(() => {
  const groups = detectDuplicates(budgets);
  setDuplicateGroups(groups);
}, [budgets]);
```

### Banner de warning

Se añade entre los filtros y la tabla:

```tsx
{duplicateGroups.length > 0 && (
  <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
    <span className="text-sm text-amber-800 dark:text-amber-300">
      Se detectaron {duplicateGroups.length} grupo{duplicateGroups.length > 1 ? 's' : ''} con posibles duplicados
      ({duplicateGroups.reduce((n, g) => n + g.length, 0)} presupuestos)
    </span>
    <Button size="sm" variant="outline" 
      className="ml-auto border-amber-400 text-amber-700 hover:bg-amber-100"
      onClick={() => { setCurrentGroupIndex(0); setShowDuplicateDialog(true); }}>
      Revisar
    </Button>
  </div>
)}
```

### Indicador en filas duplicadas

Las IDs de presupuestos duplicados se precomputan:

```ts
const duplicateIds = new Set(duplicateGroups.flat().map(b => b.id));
```

En la columna Tipo, si `duplicateIds.has(budget.id)`, se añade un pequeño `⚠` antes del badge.

### Componente inline `DuplicateResolverDialog`

Diálogo que recibe el grupo actual y expone:
- Tabla comparativa (nombre, fecha, capital, estado, vinculación)
- Si hay incongruencias: modo fusión con selección campo a campo
- Acciones:
  - **Conservar #N y eliminar el resto**: borra todos excepto el elegido
  - **Fusionar** (si hay incongruencias): actualiza el primero con campos seleccionados, borra los demás
  - **Ignorar**: cierra el diálogo sin cambios
  - **Siguiente grupo**: si hay más de un grupo de duplicados

### Detección de incongruencias

```ts
const hasDifferences = (group: Budget[]) => {
  const ref = group[0];
  return group.slice(1).some(b =>
    (b.fee ?? 0) !== (ref.fee ?? 0) ||
    getEstadoReal(b) !== getEstadoReal(ref) ||
    (b.project_id ?? null) !== (ref.project_id ?? null) ||
    (b.release_id ?? null) !== (ref.release_id ?? null)
  );
};
```

Si `hasDifferences` es `true`, se muestra el modo fusión. Si todos son idénticos, solo se muestran los botones simples de "Conservar #N".

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Budgets.tsx` | `detectDuplicates` + `areSimilar` + banner + `duplicateIds` para filas + `DuplicateResolverDialog` inline |

**Sin tocar**: base de datos, migraciones, otros componentes. La eliminación usa el `handleDeleteBudget` existente. La fusión usa el `persistSave` existente.
