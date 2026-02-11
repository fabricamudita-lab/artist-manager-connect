

# Navegacion interactiva desde la vista panoramica de Cronogramas

## Resumen

Hacer que los clics en la vista panoramica ("Cronogramas" en Discografia) naveguen de forma inteligente segun donde se haga clic:

1. **Clic en la barra del lanzamiento (franja consolidada)**: Abre el cronograma del lanzamiento en modo Gantt
2. **Clic en la barra de un flujo (ej. "Contenido" de HOBBA)**: Abre el cronograma en modo Gantt y hace scroll automatico al flujo correspondiente, centrandolo visualmente
3. **Clic en el nombre del lanzamiento**: Abre el cronograma en modo lista con todos los flujos cerrados/colapsados

## Cambios tecnicos

### 1. AllCronogramasView.tsx - Parametrizar la navegacion

**Barra del lanzamiento (ya funciona correctamente):** Mantener la navegacion actual a `/releases/{id}/cronograma`

**Barra del flujo:** Cambiar el onClick para navegar con query param de flujo:
```
/releases/{id}/cronograma?focus={workflowId}
```

**Nombre del lanzamiento:** Cambiar el onClick para navegar con query param de modo lista colapsado:
```
/releases/{id}/cronograma?mode=list&collapsed=all
```

### 2. ReleaseCronograma.tsx - Leer los query params y reaccionar

**a) Leer `useSearchParams`:**
- Si `mode=list` y `collapsed=all`: establecer `viewMode` a `'list'` y `openSections` con todos los valores en `false`
- Si `focus={workflowId}`: establecer `viewMode` a `'gantt'` y despues del render, hacer scroll al workflow indicado

**b) Scroll al flujo:**
- Asignar `data-workflow-id={workflow.id}` a cada fila/seccion del Gantt
- Usar un `useEffect` que, cuando haya un param `focus`, busque el elemento con `querySelector('[data-workflow-id="..."]')` y llame a `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Agregar un resaltado temporal (flash de color) al flujo enfocado para que el usuario lo localice visualmente

**c) Limpiar params despues de aplicar:** Llamar a `setSearchParams({})` (o `navigate` sin params) tras aplicar la logica para que no se re-ejecute en futuros re-renders

### 3. Archivos afectados

- `src/components/releases/AllCronogramasView.tsx` - Modificar 3 handlers de onClick
- `src/pages/release-sections/ReleaseCronograma.tsx` - Agregar lectura de searchParams + logica de scroll/focus + data attributes

