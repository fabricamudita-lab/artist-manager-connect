

# Vista global de cronogramas superpuestos

## Objetivo

Crear una vista panoramica dentro de la pagina de Discografia que permita ver todos los cronogramas de todos los lanzamientos superpuestos en un solo Gantt, para tener una vision completa del estado de todos los procesos sin entrar a cada lanzamiento individualmente.

## Como funciona para el usuario

- En la pagina `/releases`, aparece un nuevo toggle en la barra de herramientas: **"Vista Cronogramas"** (icono Gantt) junto a la vista actual de cards
- Al activarlo, se muestra un diagrama Gantt unificado donde:
  - Cada lanzamiento aparece como una seccion agrupada (fila de cabecera con el nombre y portada del release)
  - Debajo de cada release, sus flujos de trabajo (Audio, Visual, Marketing...) con sus tareas como barras de Gantt
  - Las barras usan los mismos colores por estado (pendiente, en proceso, completado, retrasado)
  - Al hacer clic en el nombre de un release o en una tarea, se navega al cronograma detallado de ese release
- Los filtros existentes (artista, estado, busqueda) siguen aplicando sobre que releases se muestran
- Las secciones de cada release son colapsables para poder centrarse en los que interesan

## Implementacion tecnica

### 1. Nuevo archivo: `src/components/releases/AllCronogramasView.tsx`

Componente principal que:
- Recibe la lista de releases filtrados
- Para cada release, consulta sus milestones desde `release_milestones` (usando la categoria para agrupar por workflow)
- Renderiza un Gantt multi-release con:
  - Eje X temporal compartido (rango global calculado desde la fecha mas temprana hasta la mas tardia)
  - Filas agrupadas: cabecera de release (colapsable) -> filas de tareas por workflow
  - Colores de workflow heredados de `WORKFLOW_METADATA`
  - Barras con estado visual
- Modo read-only (sin drag-and-drop, solo visualizacion)
- Click en release -> navega a `/releases/{id}/cronograma`

### 2. Modificar: `src/pages/Releases.tsx`

- Anadir un nuevo estado `viewMode: 'cards' | 'cronogramas'`
- Anadir un toggle tabs (Cards | Cronogramas) en la barra superior, junto al boton "Nuevo Lanzamiento"
- Cuando `viewMode === 'cronogramas'`, renderizar `<AllCronogramasView releases={releases} />`
- Cuando `viewMode === 'cards'`, mostrar la vista actual de tarjetas

### 3. Nuevo hook: `src/hooks/useAllReleaseMilestones.ts`

- Recibe un array de release IDs
- Hace una sola consulta a `release_milestones` con `.in('release_id', ids)`
- Devuelve los milestones agrupados por `release_id`
- Esto evita hacer N queries, una por release

### 4. Detalle del Gantt unificado

```text
[ChromatisM]  ▼
  Audio       ████████░░░░░░░░░░░░
  Visual      ░░░░████████████░░░░
  Marketing   ░░░░░░░░░░░░████████

[NOX]         ▼
  Audio       ██████████░░░░░░░░░░
  Visual      ░░░░░░████████░░░░░░

[HOBBA]       ▼
  Audio       ████░░░░░░░░░░░░░░░░
```

- Eje temporal horizontal compartido (meses)
- Cada fila de workflow muestra una barra consolidada (desde la tarea mas temprana hasta la mas tardia de ese workflow)
- Badge de progreso por workflow (ej: "3/5 completadas")
- Colores de barras por estado predominante del workflow
- Hover sobre barra muestra tooltip con detalles rapidos

### Archivos

| Archivo | Accion |
|---|---|
| `src/hooks/useAllReleaseMilestones.ts` | Crear - hook para cargar milestones de multiples releases |
| `src/components/releases/AllCronogramasView.tsx` | Crear - vista Gantt unificada multi-release |
| `src/pages/Releases.tsx` | Modificar - anadir toggle cards/cronogramas |

