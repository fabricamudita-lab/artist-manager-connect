
# Auto-guardado del Cronograma

## Problema actual

Los cambios realizados en el cronograma (estado, responsable, fechas, anclas, agregar/eliminar tareas) solo se guardan en memoria. Al recargar la pagina, se pierden todos los cambios excepto los generados por el wizard. Ademas, campos importantes como `estimatedDays`, `anchoredTo`, `customStartDate` y `subtasks` no se guardan en la base de datos.

## Solucion

Implementar auto-guardado con debounce: cada vez que cambie el estado `workflows`, se guardan automaticamente los cambios en la base de datos tras 1.5 segundos de inactividad.

## Pasos

### 1. Migracion de base de datos

Agregar una columna `metadata` de tipo JSONB a la tabla `release_milestones` para almacenar los campos que no tienen columna propia:

- `estimatedDays` (numero de dias estimados)
- `anchoredTo` (array de IDs de tareas padre)
- `customStartDate` (si la fecha fue asignada manualmente)
- `subtasks` (array de subtareas con su tipo y datos)
- `sort_order` (orden dentro del workflow)

### 2. Mejorar la funcion de guardado (`saveMilestonesToDB`)

Actualmente hace DELETE + INSERT, lo que pierde los IDs originales y rompe las referencias de anclas. La nueva logica:

- Usar upsert en lugar de delete + insert para preservar IDs
- Incluir el campo `metadata` con los datos adicionales serializados
- Incluir `sort_order` para preservar el orden de las tareas
- No mostrar toast de "Cronograma guardado" en cada auto-guardado (solo mostrar un indicador sutil)

### 3. Auto-guardado con debounce

Agregar un `useEffect` que observe cambios en `workflows` y dispare el guardado tras 1.5 segundos sin cambios nuevos:

```text
workflows cambia -> timer 1.5s -> saveMilestonesToDB()
                 -> nuevo cambio -> reinicia timer
```

Un indicador visual sutil mostrara el estado: "Guardando..." / "Guardado".

### 4. Mejorar la carga de datos (useEffect de milestones)

Actualizar la logica que convierte milestones de BD a `ReleaseTask` para leer los campos del `metadata` JSONB:

- Recuperar `estimatedDays`, `anchoredTo`, `customStartDate`, `subtasks`
- Respetar el `sort_order` guardado

### 5. Indicador visual

Agregar junto al boton de Deshacer un pequeno texto/icono que indique el estado del guardado:
- Icono de nube con check cuando esta guardado
- Texto "Guardando..." durante el guardado
- Sin toast repetitivos

## Detalle tecnico

### Archivo: Migracion SQL

```sql
ALTER TABLE release_milestones
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
```

### Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`

1. Modificar `saveMilestonesToDB`:
   - Usar DELETE + INSERT conservando IDs originales de las tareas (pasar `task.id` como `id` del milestone)
   - Serializar `estimatedDays`, `anchoredTo`, `customStartDate`, `subtasks` en `metadata`
   - Agregar `sort_order` basado en el indice de la tarea

2. Agregar auto-save con `useEffect` + `useRef` para timer:
   - Observar `workflows` con un ref para evitar el guardado en la carga inicial
   - Debounce de 1.5 segundos
   - Variable `hasInitializedRef` para no guardar al cargar por primera vez

3. Actualizar el `useEffect` de carga de milestones:
   - Leer `metadata` para restaurar `estimatedDays`, `anchoredTo`, `customStartDate`, `subtasks`
   - Ordenar tareas por `sort_order`

4. Agregar indicador visual de estado de guardado (icono Cloud/CloudOff junto a Deshacer)
