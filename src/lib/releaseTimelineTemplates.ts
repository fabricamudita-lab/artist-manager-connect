import { addDays } from 'date-fns';

export type VideoType = 'none' | 'videoclip' | 'visualiser' | 'videolyric';

export type TaskCondition = 'always' | 'hasVideo' | 'hasPhysical' | 'hasSingles' | 'single1' | 'single2' | 'single3';

export interface TimelineTaskTemplate {
  id: string;
  workflowId: string;
  name: string;
  offsetDays: number;  // Negative = before release, 0 = release day, positive = after
  estimatedDays: number;
  condition: TaskCondition;
}

export interface SingleConfig {
  name?: string;   // Ej: "Single 1" o el título de la canción
  date: Date;      // La fecha exacta de lanzamiento del single
  trackId?: string; // Vínculo al track existente del release
  videoType?: VideoType; // Tipo de contenido audiovisual del single
}

export interface ReleaseConfig {
  releaseDate: Date;
  physicalDate?: Date | null;
  numSongs: number;
  numSingles: number;
  hasVideo: boolean;
  hasPhysical: boolean;
  singleDates?: SingleConfig[];  // Fechas reales de cada single (del presupuesto)
  // Campos opcionales del wizard enriquecido
  distributor?: string;
  label?: string;
  territory?: string;
  priorityPitching?: boolean;
  notes?: string;
  focusTrackId?: string; // Track principal para pitching editorial (albums/EPs)
  singleVideoType?: VideoType; // For single releases: the video type chosen in step 1
}

// Industry-standard offsets (days relative to digital release date)
export const TIMELINE_TEMPLATES: TimelineTaskTemplate[] = [
  // ============ AUDIO WORKFLOW ============
  { id: 'audio-grabacion', workflowId: 'audio', name: 'Grabación', offsetDays: -70, estimatedDays: 14, condition: 'always' },
  { id: 'audio-mezcla', workflowId: 'audio', name: 'Mezcla', offsetDays: -55, estimatedDays: 10, condition: 'always' },
  { id: 'audio-mastering', workflowId: 'audio', name: 'Mastering', offsetDays: -45, estimatedDays: 5, condition: 'always' },
  { id: 'audio-labelcopy', workflowId: 'audio', name: 'Label Copy / ISRC', offsetDays: -42, estimatedDays: 2, condition: 'always' },

  // ============ VISUAL WORKFLOW ============
  { id: 'visual-sesion', workflowId: 'visual', name: 'Sesión de Fotos', offsetDays: -60, estimatedDays: 2, condition: 'always' },
  { id: 'visual-retoque', workflowId: 'visual', name: 'Fotos Retocadas', offsetDays: -50, estimatedDays: 5, condition: 'always' },
  { id: 'visual-artwork', workflowId: 'visual', name: 'Artwork Final', offsetDays: -42, estimatedDays: 7, condition: 'always' },
  
  // ============ CONTENIDO PROMOCIONAL ============
  { id: 'cont-making', workflowId: 'contenido', name: 'Making Of', offsetDays: -21, estimatedDays: 7, condition: 'always' },
  { id: 'cont-clips', workflowId: 'contenido', name: 'Clips para Redes', offsetDays: -14, estimatedDays: 5, condition: 'always' },
  { id: 'cont-visualizers', workflowId: 'contenido', name: 'Visualizers', offsetDays: -7, estimatedDays: 5, condition: 'always' },
  
  // Videoclip (condicional)
  { id: 'cont-videoclip-pre', workflowId: 'contenido', name: 'Pre-producción Videoclip', offsetDays: -60, estimatedDays: 7, condition: 'hasVideo' },
  { id: 'cont-videoclip-rodaje', workflowId: 'contenido', name: 'Rodaje Videoclip', offsetDays: -45, estimatedDays: 3, condition: 'hasVideo' },
  { id: 'cont-videoclip-edicion', workflowId: 'contenido', name: 'Edición Videoclip', offsetDays: -30, estimatedDays: 14, condition: 'hasVideo' },
  { id: 'cont-videoclip-final', workflowId: 'contenido', name: 'Videoclip Entregado', offsetDays: -14, estimatedDays: 2, condition: 'hasVideo' },

  // ============ MARKETING (WATERFALL) ============
  { id: 'mkt-entrega-dist', workflowId: 'marketing', name: 'Entrega a Distribuidora', offsetDays: -28, estimatedDays: 1, condition: 'always' },
  { id: 'mkt-presave', workflowId: 'marketing', name: 'Pre-save Activo', offsetDays: -28, estimatedDays: 1, condition: 'always' },
  { id: 'mkt-focus', workflowId: 'marketing', name: 'Focus Track / Pitch Editorial', offsetDays: -28, estimatedDays: 1, condition: 'always' },
  { id: 'mkt-salida', workflowId: 'marketing', name: 'Salida Digital', offsetDays: 0, estimatedDays: 1, condition: 'always' },
  
  // Singles (condicionales, espaciados dinámicamente)
  { id: 'mkt-single1', workflowId: 'marketing', name: 'Single 1', offsetDays: -56, estimatedDays: 1, condition: 'single1' },
  { id: 'mkt-single2', workflowId: 'marketing', name: 'Single 2', offsetDays: -42, estimatedDays: 1, condition: 'single2' },
  { id: 'mkt-single3', workflowId: 'marketing', name: 'Single 3', offsetDays: -28, estimatedDays: 1, condition: 'single3' },

  // ============ FABRICACIÓN (CONDICIONAL) ============
  // Requiere master + artwork listos → después de mastering (-40) y artwork (-35)
  { id: 'fab-envio', workflowId: 'fabricacion', name: 'Envío a Fábrica', offsetDays: -35, estimatedDays: 2, condition: 'hasPhysical' },
  { id: 'fab-test', workflowId: 'fabricacion', name: 'Test Pressing', offsetDays: -33, estimatedDays: 14, condition: 'hasPhysical' },
  { id: 'fab-recepcion', workflowId: 'fabricacion', name: 'Recepción Stock', offsetDays: -14, estimatedDays: 7, condition: 'hasPhysical' },
  { id: 'fab-venta', workflowId: 'marketing', name: 'Venta Física', offsetDays: 7, estimatedDays: 1, condition: 'hasPhysical' },
];

export interface GeneratedTask {
  id: string;
  workflowId: string;
  name: string;
  startDate: Date;
  estimatedDays: number;
  status: 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';
  responsible: string;
  responsible_ref?: null;
  anchoredTo?: string[];
  customStartDate?: boolean;
}

/**
 * Checks if a task template applies based on the release configuration
 */
function taskApplies(template: TimelineTaskTemplate, config: ReleaseConfig): boolean {
  switch (template.condition) {
    case 'always':
      return true;
    case 'hasVideo':
      return config.hasVideo;
    case 'hasPhysical':
      return config.hasPhysical;
    case 'hasSingles':
      return config.numSingles > 0;
    case 'single1':
      return config.numSingles >= 1;
    case 'single2':
      return config.numSingles >= 2;
    case 'single3':
      return config.numSingles >= 3;
    default:
      return true;
  }
}

/**
 * Generates dynamic single task templates based on the number of singles.
 * Spaces them evenly before release (minimum 2 weeks apart).
 */
function generateSingleTasks(numSingles: number): TimelineTaskTemplate[] {
  if (numSingles === 0) return [];

  const tasks: TimelineTaskTemplate[] = [];
  
  // Space singles evenly, starting from -8 weeks and ending at -2 weeks before release
  // Each single is at least 2 weeks apart
  const startOffset = -56; // 8 weeks before
  const endOffset = -14;   // 2 weeks before
  const range = endOffset - startOffset;
  const spacing = numSingles > 1 ? Math.floor(range / (numSingles - 1)) : 0;

  for (let i = 0; i < numSingles; i++) {
    const offset = numSingles === 1 
      ? -42 // Single single: 6 weeks before
      : startOffset + (i * spacing);
    
    tasks.push({
      id: `mkt-single${i + 1}`,
      workflowId: 'marketing',
      name: `Single ${i + 1}`,
      offsetDays: offset,
      estimatedDays: 1,
      condition: 'always', // These are dynamically generated, so always include
    });
  }

  return tasks;
}

/**
 * Adjusts templates to include dynamic single tasks.
 */
function adjustSingleOffsets(templates: TimelineTaskTemplate[], numSingles: number): TimelineTaskTemplate[] {
  // Remove static single templates (single1, single2, single3)
  const filteredTemplates = templates.filter(t => 
    !['single1', 'single2', 'single3'].includes(t.condition)
  );

  // Add dynamic single tasks
  const singleTasks = generateSingleTasks(numSingles);

  return [...filteredTemplates, ...singleTasks];
}

/**
 * Generates timeline tasks from configuration.
 * Calculates dates backwards from the release date.
 */
export function generateTimelineFromConfig(config: ReleaseConfig): GeneratedTask[] {
  const { releaseDate, numSingles, singleDates } = config;
  
  // 1. Adjust single offsets based on count
  const adjustedTemplates = adjustSingleOffsets(TIMELINE_TEMPLATES, numSingles);
  
  // 2. Filter applicable tasks
  const applicableTemplates = adjustedTemplates.filter(t => taskApplies(t, config));
  
  // 3. Calculate dates; if singleDates are provided, use exact dates for singles
  const tasks: GeneratedTask[] = applicableTemplates.map(template => {
    // Detect single tasks (id: 'mkt-single1', 'mkt-single2', etc.)
    const singleMatch = template.id.match(/^mkt-single(\d+)$/);
    if (singleMatch && singleDates && singleDates.length > 0) {
      const singleIndex = parseInt(singleMatch[1]) - 1;
      const singleConfig = singleDates[singleIndex];
      if (singleConfig?.date) {
        // Use exact date from the budget instead of calculating from offset
        return {
          id: template.id,
          workflowId: template.workflowId,
          name: singleConfig.name ? `Single: ${singleConfig.name}` : template.name,
          startDate: singleConfig.date,
          estimatedDays: 1,
          status: 'pendiente' as const,
          responsible: '',
          responsible_ref: null,
        };
      }
    }

    // All other tasks: normal offset calculation from release date
    const deadline = addDays(releaseDate, template.offsetDays);
    const startDate = addDays(deadline, -template.estimatedDays);
    
    return {
      id: template.id,
      workflowId: template.workflowId,
      name: template.name,
      startDate,
      estimatedDays: template.estimatedDays,
      status: 'pendiente' as const,
      responsible: '',
      responsible_ref: null,
    };
  });
  
  // 4. Sort by start date
  return tasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Groups generated tasks by workflow ID
 */
export function groupTasksByWorkflow(tasks: GeneratedTask[]): Record<string, GeneratedTask[]> {
  return tasks.reduce((acc, task) => {
    if (!acc[task.workflowId]) {
      acc[task.workflowId] = [];
    }
    acc[task.workflowId].push(task);
    return acc;
  }, {} as Record<string, GeneratedTask[]>);
}
