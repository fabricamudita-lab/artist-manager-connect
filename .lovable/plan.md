

# Plan: Multi-Anclaje con Fechas Personalizables

## Resumen

Modificar el sistema de anclaje de tareas para permitir que una tarea pueda anclarse a **múltiples tareas padre**. Por defecto, la fecha de inicio se calculará automáticamente basándose en la fecha de vencimiento más tardía de las tareas padre, pero el usuario podrá **sobrescribir manualmente** esta fecha en cualquier momento.

## Cómo Funcionará

```text
┌─────────────────────────────────────────────────────────────┐
│  Tarea: "Subir a plataformas"                               │
├─────────────────────────────────────────────────────────────┤
│  Anclada a:  [Master final] [Portada aprobada] [+]          │
│                                                             │
│  Fecha sugerida: 15 mar (basada en anclas)                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ ○ Usar fecha automática (más tardía de anclas)   │       │
│  │ ● Personalizar fecha: [18 mar ▼]                 │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**Lógica por defecto:**
- Si una tarea está anclada a A y B, y A termina el 10 mar y B el 15 mar → la fecha sugerida es 15 mar
- Si el usuario mueve A al 20 mar → la fecha sugerida se actualiza a 20 mar
- El usuario puede activar "fecha personalizada" para ignorar el cálculo automático

## Cambios Técnicos

### 1. Estructura de Datos

**Archivo:** `src/pages/release-sections/ReleaseCronograma.tsx`

Modificar la interfaz `ReleaseTask`:
```typescript
interface ReleaseTask {
  // ... campos existentes
  anchoredTo?: string[];           // Cambio: de string a string[]
  customStartDate?: boolean;       // Nuevo: indica si la fecha fue personalizada
}
```

### 2. Selector de Múltiples Anclas

Reemplazar el `<Select>` simple por un componente multi-select que:
- Muestre las anclas actuales como badges/chips
- Permita añadir nuevas anclas desde un dropdown
- Permita eliminar anclas individuales con un botón ×
- Muestre un icono `🔗` cuando hay anclas activas

### 3. Cálculo Automático de Fecha

Nueva función para calcular la fecha sugerida:
```typescript
const getCalculatedStartDate = (anchoredTaskIds: string[]): Date | null => {
  if (!anchoredTaskIds.length) return null;
  
  const parentEndDates = anchoredTaskIds
    .map(id => getTaskById(id))
    .filter(t => t?.startDate)
    .map(t => addDays(t.startDate, t.estimatedDays));
  
  if (!parentEndDates.length) return null;
  return max(parentEndDates); // La más tardía
};
```

### 4. UI de Fecha con Toggle Manual

En el popover de fechas, añadir:
- Indicador visual de "fecha calculada" vs "fecha personalizada"
- Toggle para activar/desactivar fecha personalizada
- Cuando está en modo automático, mostrar la fecha sugerida en gris
- Cuando el usuario selecciona una fecha manualmente, activar modo personalizado

### 5. Propagación de Cambios

Cuando se mueve una tarea padre:
1. Buscar todas las tareas que la tienen en su array `anchoredTo`
2. Para cada tarea dependiente **sin** `customStartDate`:
   - Recalcular la fecha sugerida
   - Mostrar el diálogo de confirmación existente
3. Las tareas con `customStartDate = true` no se afectan automáticamente

### 6. GanttChart

Actualizar el componente Gantt para:
- Soportar el nuevo formato `anchoredTo: string[]`
- Mostrar líneas de conexión a múltiples padres (opcional/futuro)

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/release-sections/ReleaseCronograma.tsx` | Estructura de datos, UI de anclas, lógica de cálculo |
| `src/components/lanzamientos/AnchorDependencyDialog.tsx` | Soporte para múltiples anclas por tarea |
| `src/components/lanzamientos/GanttChart.tsx` | Adaptar a `anchoredTo: string[]` |

## Comportamiento Visual

**Columna "Anclada a":**
- Sin anclas: muestra "—"
- Con anclas: muestra `🔗 2` (número de anclas) + popover al hacer clic
- En el popover: lista de anclas con botón × para eliminar + selector para añadir

**Columna "Fechas":**
- Fecha automática: texto normal + indicador sutil ✨
- Fecha personalizada: texto normal sin indicador
- Si hay conflicto (fecha manual anterior a anclas): badge de advertencia ⚠️

