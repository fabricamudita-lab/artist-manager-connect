
# Fix de filtros + Edición inline en la tabla de Presupuestos

## Problemas identificados

### 1. Filtro por artista (bug de closure)
En la línea 351, el `onValueChange` del Select de artista hace:
```tsx
onValueChange={(v) => { setFilterArtist(v); fetchBudgets(); }}
```
Esto falla porque `setFilterArtist` es asíncrono — cuando `fetchBudgets()` se ejecuta, `filterArtist` aún tiene el valor anterior. La query en `fetchBudgets` usa el estado `filterArtist` en el momento de ejecución (stale closure), ignorando la selección nueva.

**Fix**: Mover el filtrado de artista a la misma función de filtrado local (igual que el tipo), y eliminar el filtro por artista de la query de supabase. Ya tenemos todos los artistas cargados — el filtro local es más rápido y no tiene el problema de closure.

### 2. Búsqueda por nombre (funciona pero tiene un bug visual)
La búsqueda funciona correctamente en el array filtrado. Sin embargo, el `filterArtist` no funciona debido al bug anterior, así que aparenta que "no filtra por artista" siendo que el filtro de búsqueda sí incluye el nombre del artista.

### 3. Edición inline — no existe
La fila entera es clickeable y abre `BudgetDetailsDialog`. No hay forma de editar campos directamente en la lista sin abrir el diálogo completo.

---

## Solución propuesta

### Fix 1: Filtro de artista — migrar a filtrado local

Eliminar el filtro de artista de la query de Supabase (que causaba el bug) y añadirlo al `filteredBudgets` junto a tipo y búsqueda:

```ts
const filteredBudgets = budgets.filter((budget) => {
  const q = searchTerm.toLowerCase().trim();
  const matchesSearch = !q ||
    budget.name.toLowerCase().includes(q) ||
    (budget.artists?.stage_name?.toLowerCase().includes(q) ?? false) ||
    (budget.artists?.name?.toLowerCase().includes(q) ?? false) ||
    (budget.releases?.title?.toLowerCase().includes(q) ?? false) ||
    (budget.projects?.name?.toLowerCase().includes(q) ?? false) ||
    (budget.city?.toLowerCase().includes(q) ?? false);

  const matchesType = filterType === 'all' || budget.type === filterType;
  const matchesArtist = filterArtist === 'all' || budget.artist_id === filterArtist;

  return matchesSearch && matchesType && matchesArtist;
});
```

Y el Select de artista pasa a ser:
```tsx
onValueChange={setFilterArtist}  // sin llamar fetchBudgets()
```

---

### Fix 2: Edición inline — nueva columna de acciones expandida

Se añade un **modo de edición por fila**. Al hacer clic en el icono de lápiz (nueva acción), la fila se convierte en editable mostrando 3 campos editables:

#### Campos editables directamente en la tabla

| Campo | Control | Notas |
|---|---|---|
| **Nombre** | Input de texto | Edit inline, guardar con Enter o botón ✓ |
| **Estado** | Select desplegable | Opciones predefinidas |
| **Vinculado a (proyecto)** | Select de proyectos | Con confirmación doble al desvincular |

#### Campos NO editables en la tabla (requieren abrir el detalle)
- Tipo (cambio estructural)
- Capital / Gastos (afectan ítems internos)
- Fecha del evento
- Artista (afecta permisos y datos financieros)

#### Diseño de la fila en modo edición

Cuando el usuario hace clic en el icono lápiz de una fila:
- La fila se resalta con `ring-2 ring-primary/30 bg-primary/5`
- El campo **Nombre** pasa a ser un `<Input>` con el valor actual
- El campo **Estado** pasa a ser un `<Select>` con las opciones
- El campo **Vinculado a** muestra un `<Select>` de proyectos
- Aparecen dos botones en Acciones: ✓ (guardar) y ✕ (cancelar)
- Hacer clic fuera cancela la edición (sin guardar)

#### Estados disponibles en el Select de Estado
Basado en los datos reales de la base de datos:
```
borrador | pendiente | confirmado | en producción | facturado | liquidado | cancelado
```
Estos valores se guardan en `metadata.estado` para presupuestos de producción y en `show_status` para conciertos.

#### Lógica de guardado de estado

Para mantener consistencia con la función `getEstadoReal`, al guardar el estado se actualiza **siempre en `metadata.estado`** (el campo más universal). Si el presupuesto es de tipo `concierto` también se actualiza `show_status` para compatibilidad con el módulo de Booking.

```ts
const handleInlineUpdate = async (budgetId: string, field: 'name' | 'estado' | 'project_id', value: string | null) => {
  let updatePayload: Record<string, any> = {};
  
  if (field === 'name') {
    updatePayload = { name: value };
  } else if (field === 'estado') {
    // Para conciertos: también actualizar show_status
    const budget = budgets.find(b => b.id === budgetId);
    updatePayload = { 
      metadata: { ...(budget?.metadata || {}), estado: value },
      ...(budget?.type === 'concierto' ? { show_status: value } : {})
    };
  } else if (field === 'project_id') {
    updatePayload = { project_id: value };
  }
  
  const { error } = await supabase.from('budgets').update(updatePayload).eq('id', budgetId);
  if (error) throw error;
  fetchBudgets();
};
```

#### Doble confirmación al desvincular proyecto

Si el usuario cambia "Vinculado a" de un proyecto existente a "Sin vínculo", se muestra un `AlertDialog` de confirmación:

```
¿Desvincular del proyecto "On TOUR"?
Esta acción eliminará el vínculo entre este presupuesto y el proyecto.
Los datos del presupuesto no se eliminarán.
[Cancelar] [Desvincular]
```

---

## Cambios técnicos — solo `src/pages/Budgets.tsx`

### Nuevos estados
```ts
const [editingRowId, setEditingRowId] = useState<string | null>(null);
const [editValues, setEditValues] = useState<{ name: string; estado: string; project_id: string | null }>({ name: '', estado: '', project_id: null });
const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
const [confirmUnlink, setConfirmUnlink] = useState<{ budgetId: string; projectName: string } | null>(null);
```

### Nueva función `fetchProjects()`
Carga los proyectos disponibles para el Select de vinculación.

### Función `startEditing(budget)`
Inicializa `editValues` con los valores actuales del presupuesto y pone `editingRowId = budget.id`.

### Función `handleInlineUpdate()`
Llama a Supabase con el payload correcto según el campo, muestra toast de éxito/error, y llama `fetchBudgets()`.

### Función `handleUnlinkProject(budgetId)`
Se llama solo después de la confirmación del `AlertDialog`. Actualiza `project_id = null`.

### Cambio en `TableRow`
- Cuando `editingRowId === budget.id`: renderiza campos editables + botones ✓/✕
- Cuando `editingRowId !== budget.id`: renderiza la fila normal con el nuevo icono lápiz en Acciones
- El `onClick` en `TableRow` solo se dispara si `editingRowId === null` (no en modo edición)

### Cambio en el Select de Artista
`onValueChange={setFilterArtist}` — sin llamar `fetchBudgets()`.

### Añadir `matchesArtist` al filtrado local
```ts
const matchesArtist = filterArtist === 'all' || budget.artist_id === filterArtist;
```

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Budgets.tsx` | Fix filtros + estados de edición + fila editable + fetch proyectos |

**Sin tocar**: base de datos (no se crea ninguna columna nueva), otros componentes, `BudgetDetailsDialog`.

**Sin migraciones**: El estado se guarda en `metadata.estado` (campo JSONB existente) y `show_status` (columna existente).
