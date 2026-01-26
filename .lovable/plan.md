
# Wizard de Configuración Inicial para Cronograma de Lanzamiento

## Resumen

Implementar un wizard que aparezca al crear un nuevo release o al acceder al Cronograma por primera vez. Este wizard preguntará parámetros clave y **calculará automáticamente todas las fechas hacia atrás** desde la fecha de lanzamiento, usando offsets estándar de la industria musical.

## Flujo de Usuario

```text
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: Configuración Básica                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📅 Fecha de Lanzamiento Digital *                        │  │
│  │  [Calendario picker]                                      │  │
│  │                                                           │  │
│  │  📅 Fecha de Venta Física (opcional)                      │  │
│  │  [Calendario picker]                                      │  │
│  │                                                           │  │
│  │  🎵 Número de canciones                                   │  │
│  │  [1] [2] [3] [4] [5] [6+]                                │  │
│  │                                                           │  │
│  │  📀 Singles a lanzar antes del álbum                      │  │
│  │  [0] [1] [2] [3]                                         │  │
│  │                                                           │  │
│  │  🎬 ¿Incluir videoclip?  [Sí] [No]                       │  │
│  │                                                           │  │
│  │  📦 ¿Fabricación física (vinilo/CD)?  [Sí] [No]          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│                              [Generar Cronograma →]             │
└─────────────────────────────────────────────────────────────────┘
```

## Offsets Estándar (desde fecha de lanzamiento)

Basados en tiempos reales de la industria, calculando hacia atrás:

### Marketing (Waterfall)
| Tarea | Offset (días) | Notas |
|-------|---------------|-------|
| Entrega a distribuidora | -42 a -56 | 6-8 semanas antes (pitch editorial) |
| Pre-save activo | -28 | 4 semanas antes |
| Single 1 | -56 | 8 semanas antes (si hay singles previos) |
| Single 2 | -42 | 6 semanas antes |
| Single 3 | -28 | 4 semanas antes |
| Focus Track / Anuncios | -14 | 2 semanas antes |
| Salida Digital | 0 | Día D |
| Venta Física | +7 a +14 | 1-2 semanas después (opcional) |

### Audio
| Tarea | Offset (días) |
|-------|---------------|
| Mastering listo | -45 |
| Mezcla finalizada | -55 |
| Grabación completada | -70 |
| Label Copy / ISRC | -42 |

### Visual y Arte
| Tarea | Offset (días) |
|-------|---------------|
| Artwork final | -42 |
| Sesión de fotos | -60 |
| Fotos retocadas | -50 |

### Contenido Promocional
| Tarea | Offset (días) |
|-------|---------------|
| Visualizers listos | -7 |
| Clips para redes | -14 |
| Making of | -21 |

### Fabricación (si aplica)
| Tarea | Offset (días) |
|-------|---------------|
| Envío a fábrica | -90 |
| Test pressing | -75 |
| Recepción stock | -14 |

## Componentes a Crear/Modificar

### 1. Nuevo: `CronogramaSetupWizard.tsx`
Diálogo con el formulario de configuración inicial:
- Campos: fecha lanzamiento, fecha física, num canciones, num singles, videoclip sí/no, físico sí/no
- Botón "Generar Cronograma" que calcula todas las fechas
- Opción de editar/regenerar después

### 2. Nuevo: `releaseTimelineTemplates.ts`
Archivo de configuración con los offsets estándar:
```typescript
export interface TimelineTask {
  id: string;
  workflowId: string;
  name: string;
  offsetDays: number;  // Negativo = antes, 0 = día D, positivo = después
  estimatedDays: number;
  anchorTo?: string;   // ID de tarea padre (opcional)
  condition?: 'always' | 'hasVideo' | 'hasPhysical' | 'hasSingles';
}

export const RELEASE_TIMELINE_TEMPLATES = { ... }
```

### 3. Modificar: `ReleaseCronograma.tsx`
- Detectar si el cronograma está vacío/sin fechas y mostrar el wizard
- Añadir botón "Regenerar fechas" en el header para recalcular
- Estado para controlar si mostrar wizard o cronograma
- Función `generateTimelineFromConfig()` que:
  1. Toma la fecha de lanzamiento como ancla
  2. Calcula cada tarea aplicando offset hacia atrás
  3. Filtra tareas según condiciones (videoclip, físico, singles)
  4. Establece anclas automáticas entre tareas dependientes

### 4. Modificar: `CreateReleaseDialog.tsx` (opcional)
Añadir opción de "Configurar cronograma ahora" al crear release

## Lógica de Cálculo

```typescript
function generateTimeline(config: ReleaseConfig): WorkflowSection[] {
  const { releaseDate, physicalDate, numSongs, numSingles, hasVideo, hasPhysical } = config;
  
  // 1. Filtrar tareas según config
  const applicableTasks = TIMELINE_TEMPLATES.filter(task => {
    if (task.condition === 'hasVideo' && !hasVideo) return false;
    if (task.condition === 'hasPhysical' && !hasPhysical) return false;
    if (task.condition === 'hasSingles' && numSingles === 0) return false;
    return true;
  });
  
  // 2. Calcular fechas desde releaseDate
  const tasksWithDates = applicableTasks.map(task => ({
    ...task,
    startDate: addDays(releaseDate, task.offsetDays - task.estimatedDays),
    // La tarea empieza X días antes para terminar en su offset
  }));
  
  // 3. Ajustar singles dinámicamente
  // Si hay 2 singles, espaciarlos a -8 y -4 semanas
  // Si hay 3, a -10, -6, -3 semanas, etc.
  
  // 4. Agrupar por workflow
  return groupByWorkflow(tasksWithDates);
}
```

## Experiencia de Usuario

1. **Primer acceso al Cronograma**: Aparece el wizard en overlay
2. **Usuario configura**: Selecciona fecha, número de singles, opciones
3. **Click "Generar"**: Se puebla todo el cronograma con fechas calculadas
4. **Edición posterior**: Usuario puede ajustar manualmente; si mueve tarea ancla, se propagan cambios
5. **Regenerar**: Botón en toolbar para volver a abrir wizard y recalcular todo

## Beneficios

- **Ahorra tiempo**: No hay que calcular cada fecha manualmente
- **Estándar de industria**: Tiempos basados en prácticas reales (5-8 semanas a distribuidora, etc.)
- **Flexible**: Se puede ajustar después de generar
- **Dinámico**: Se adapta según si hay videoclip, físico, o múltiples singles

## Detalles Técnicos

### Archivos a crear
- `src/components/releases/CronogramaSetupWizard.tsx`
- `src/lib/releaseTimelineTemplates.ts`

### Archivos a modificar
- `src/pages/release-sections/ReleaseCronograma.tsx` (integrar wizard, lógica de generación)

### Dependencias
- date-fns (ya instalado)
- Componentes UI existentes (Dialog, Calendar, Select, etc.)
