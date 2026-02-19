
# Sincronización bidireccional del Presupuesto con el resto del Lanzamiento

## Análisis del estado actual

El formulario `CreateReleaseBudgetDialog` recoge información muy completa (n_tracks, cronograma, versiones, productores, master types, etc.) y la almacena correctamente en el campo JSONB `metadata` de la tabla `budgets`. Sin embargo, **hay tres problemas clave**:

1. **Las fechas del cronograma no se sincronizan de vuelta**: el wizard lee milestones existentes pero al crear el presupuesto no escribe/actualiza nada en `release_milestones`.
2. **El número de canciones no se refleja automáticamente en `tracks`**: si el usuario dice "13 canciones", no se crean automáticamente las 13 filas en la tabla `tracks`.
3. **Las inconsistencias cross-departamento se detectan parcialmente** en `ReleasePresupuestos.tsx` (track count, fecha), pero no se cruzan con todos los campos nuevos (versiones, master engineers, PR periods, etc.).

## Qué se debe hacer

### 1. Cronograma: crear/actualizar milestones al finalizar el presupuesto

Cuando el wizard llega al paso 3 y el usuario pulsa **Crear**, en `handleSubmit` se deben insertar/upsert los deadlines resueltos como milestones reales en `release_milestones`:

```ts
// Después de crear el budget, mapear resolvedDeadlines → release_milestones
const milestonePayload = resolvedDeadlines.map((d, i) => ({
  release_id: release.id,
  title: d.name,
  due_date: format(d.finalDate, 'yyyy-MM-dd'),
  status: 'pending',
  category: 'marketing',
  sort_order: i,
}));
// upsert por release_id + title (conflict key)
```

Lógica condicional:
- Si ya existe un milestone con ese `title` → **sólo actualizar si la fecha difiere** y mostrar alerta de conflicto al usuario.
- Si no existe → insertar.

### 2. Canciones: crear filas en `tracks` si el nº indicado > canciones existentes

Al hacer submit, comparar `nTracks` con `tracks.length` actual del release:
- Si `nTracks > tracks.length` → insertar en la tabla `tracks` las canciones que faltan (ej. "Canción 4", "Canción 5"... con `track_number` correlativo).
- Si `nTracks < tracks.length` → NO borrar (silencioso), mostrar una advertencia en el resumen del presupuesto de que hay más tracks reales que los indicados en el presupuesto.
- Si `nTracks === tracks.length` → sin acción.

### 3. Cross-check de inconsistencias ampliado

En `ReleasePresupuestos.tsx`, ampliar la función `warnings` para detectar:

| Check | Condición | Mensaje |
|---|---|---|
| Track count | `meta.variables.n_tracks !== tracks.length` | Ya implementado ✓ |
| Fecha digital | `meta.release_date_digital ≠ release.release_date` | Ya implementado ✓ |
| **Versiones vs. tracks** | Si se declararon versiones (ej. "Instrumental") pero no existen tracks con créditos de ese tipo | "El presupuesto incluye versión Instrumental pero no hay tracks instrumental en Créditos" |
| **Master types vs. Fabricación** | Si `fisico_formatos` incluye "vinilo" pero `master_types` no incluye "vinilo" | "Has planificado fabricación en vinilo pero no hay master de vinilo" |
| **Fechas físicas vs. cronograma** | Si `release_date_physical` está definida pero no hay milestone de "Fabricación física" | "Tienes fecha física pero no hay hito de fabricación en el cronograma" |

Para los conflictos "cuál es el correcto" (ej. fecha de lanzamiento), el warning incluirá **dos botones** de acción: "Usar el del presupuesto" / "Usar el del release".

### 4. Resumen post-creación con datos escritos

Al completar el submit, mostrar un **toast expandido o un panel de resumen** con las acciones tomadas:
- ✓ Presupuesto creado con X categorías
- ✓ Y milestones del cronograma creados/actualizados
- ✓ Z canciones añadidas a Créditos & Audio
- ⚠ Si hubo conflictos, listarlos

---

## Detalle técnico de implementación

### Archivos a modificar

**`src/components/releases/CreateReleaseBudgetDialog.tsx`**
- En `handleSubmit`, después del bloque de `budget_items`:
  1. **Sync tracks**: comparar `nTracks` con los tracks existentes del release (recibidos como prop `trackCount`). Insertar los que falten con `track_number` y título genérico.
  2. **Sync milestones**: mapear `getResolvedDeadlines()` a upserts en `release_milestones`. Solo upsert si `deadlineStrategy !== 'cronograma'` para no sobreescribir datos manuales cuando el usuario explícitamente eligió "usar cronograma".

**`src/pages/release-sections/ReleasePresupuestos.tsx`**
- Ampliar la función `warnings` con los 3 checks nuevos.
- Añadir botones de resolución "cuál es el correcto" para conflictos de fecha y track count.
- Resolver conflicto: actualizar el release o el presupuesto según elija el usuario.

### Lógica de conflicto de fechas (interactividad)

```tsx
// Warning de fecha con resolución
{w.type === 'release_date_changed' && (
  <div className="flex gap-2 mt-2">
    <Button size="sm" onClick={() => resolveWithReleaseDate(w.budgetId)}>
      Usar fecha del Release ({format(release.release_date, 'dd MMM')})
    </Button>
    <Button size="sm" variant="outline" onClick={() => resolveWithBudgetDate(w.budgetId, w.budgetDate)}>
      Usar fecha del Presupuesto ({format(w.budgetDate, 'dd MMM')})
    </Button>
  </div>
)}
```

Cada botón: llama a `supabase.from('releases').update({ release_date })` o `supabase.from('budgets').update({ metadata })` según corresponda.

### Lógica nueva de cross-check (versiones vs tracks vs master)

```ts
// En warnings:
// Check: fisico_formatos vinilo pero sin master vinilo
const fisicoFormatos = meta.variables?.fisico_formatos || [];
const masterTypes = meta.variables?.master_types || [];
if (fisicoFormatos.includes('vinilo') && !masterTypes.includes('vinilo')) {
  w.push({
    type: 'missing_vinyl_master',
    message: 'Fabricación vinilo sin master de vinilo',
    detail: `El presupuesto "${budget.name}" incluye fabricación en vinilo pero no se planificó master de vinilo.`,
    budgetId: budget.id,
  });
}

// Check: physical date pero sin milestone de fabricación
const physicalDate = meta.release_date_physical ? new Date(meta.release_date_physical) : null;
const hasFabricacionMilestone = milestones?.some(m => m.category === 'fabricacion');
if (physicalDate && !hasFabricacionMilestone) {
  w.push({
    type: 'physical_no_milestone',
    message: 'Fecha física sin flujo de fabricación',
    detail: `Hay fecha de salida física (${format(physicalDate, 'dd MMM')}) pero no existe ninguna tarea en el Flujo de Fabricación del Cronograma.`,
  });
}
```

---

## Flujo visual del submit actualizado

```text
[Usuario pulsa "Crear Presupuesto"]
         │
         ├─ 1. INSERT budget + budget_items
         │
         ├─ 2. Sync tracks
         │       ├─ nTracks > existentes → INSERT tracks faltantes
         │       └─ nTracks < existentes → guardar aviso
         │
         ├─ 3. Sync cronograma
         │       ├─ deadlineStrategy = 'cronograma' → no tocar milestones
         │       └─ autocalcular / mezclar → upsert milestones por título
         │               ├─ Sin conflicto → INSERT/UPDATE silencioso
         │               └─ Con conflicto (fecha diferente) → mostrar aviso post-creación
         │
         └─ 4. Toast con resumen de acciones
```

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/releases/CreateReleaseBudgetDialog.tsx` | Sync de tracks y milestones en `handleSubmit` |
| `src/pages/release-sections/ReleasePresupuestos.tsx` | Ampliar `warnings` + botones de resolución de conflictos |

Sin cambios en la base de datos — toda la lógica opera sobre tablas existentes (`tracks`, `release_milestones`, `budgets`, `releases`).
