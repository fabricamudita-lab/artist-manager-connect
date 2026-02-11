

# Mejoras al zoom del Cronograma

## 3 cambios principales

### 1. Reducir el zoom base (25% del actual)

Actualmente el `minWidth` se calcula como `totalDays * 25px`. Esto es demasiado exagerado y genera mucho scroll. Se reducira a `totalDays * 6px` (aprox. 25% del valor actual), con un minimo de 800px para que siga siendo legible en timelines cortos.

### 2. Columna de flujos fija (sticky)

Actualmente la columna de nombres de flujos y tareas (w-48) se desplaza junto con el contenido horizontal. Se convertira en una columna sticky con `position: sticky; left: 0` y un fondo solido para que permanezca visible mientras se hace scroll horizontal. Esto aplica a:
- Los headers de workflow (nombre del flujo, icono, conteo)
- Los nombres de las tareas individuales

### 3. En "Vista completa", ocultar la cabecera para ganar espacio vertical

Cuando `fitToView` esta activo, se ocultaran:
- El header con el titulo "Cronograma" y el boton de volver
- La fila de "Progreso General"

Esto maximiza el espacio vertical para mostrar mas tareas. El boton de Minimize2 seguira visible en la barra de pestanas para volver a la vista normal.

## Detalle tecnico

### GanttChart.tsx

- Cambiar `totalDays * 25` a `totalDays * 6` (linea 391)
- Agregar `sticky left-0 z-10 bg-background` a los contenedores de etiquetas (w-48) tanto en el header del workflow (linea 447) como en los nombres de tarea (linea 491-493)
- Asegurar que el fondo sea opaco para no transparentarse con las barras debajo

### ReleaseCronograma.tsx

- Envolver el header y el progreso en una condicion `{!fitToView && ...}` para ocultarlos cuando la vista completa esta activa
- Mover el boton de fitToView fuera de esa condicion para que siga accesible
- Pasar `fitToView` como prop al componente padre si es necesario para controlar el layout

### Archivos afectados

- `src/components/lanzamientos/GanttChart.tsx` - minWidth reducido + sticky labels
- `src/pages/release-sections/ReleaseCronograma.tsx` - ocultar header/progreso en vista completa

