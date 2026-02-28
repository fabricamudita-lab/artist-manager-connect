

## ZIP descargable del modulo de detalle de proyecto

Se creara una pagina temporal o utilidad que, al pulsar un boton, genera un archivo ZIP con los 10 archivos del modulo de detalle de proyecto y lo descarga automaticamente en el navegador.

### Archivos incluidos en el ZIP

1. `src/pages/ProjectDetail.tsx`
2. `src/components/project-detail/ProjectPulseTab.tsx`
3. `src/components/project-detail/ProjectWorkflowsTab.tsx`
4. `src/components/project-detail/ProjectIncidentsTab.tsx`
5. `src/components/project-detail/ProjectQuestionsTab.tsx`
6. `src/components/project-detail/ProjectTaskSubtasks.tsx`
7. `src/components/project-detail/ProjectTaskTypes.ts`
8. `src/components/project-detail/WorkflowToast.tsx`
9. `src/components/project-detail/LinkedResourcesSection.tsx`
10. `src/components/ProjectChecklistManager.tsx`

### Implementacion

**Archivo nuevo**: `src/utils/downloadProjectDetailZip.ts`

Una funcion que usa la libreria `JSZip` (ya instalada) para:
- Importar el contenido de cada archivo como texto usando `import.meta.glob` con `{ query: '?raw', eager: true }`
- Agregar cada archivo al ZIP manteniendo la estructura de carpetas
- Generar el blob y disparar la descarga automatica como `proyecto-detalle-modulo.zip`

**Archivo modificado**: `src/pages/ProjectDetail.tsx`

Se anadira un boton discreto (icono de descarga) en la cabecera del detalle de proyecto que llame a la funcion de descarga del ZIP.

### Nota tecnica

Se usara `?raw` en los imports para obtener el codigo fuente como string en lugar de ejecutarlo. Esto es una funcionalidad nativa de Vite.

