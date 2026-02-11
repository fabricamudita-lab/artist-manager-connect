
# Mostrar fechas en la barra resumen del flujo (como en las tareas)

## Cambio

Agregar una etiqueta de fecha ("05 dic - 12 dic") que aparece al pasar el raton sobre la barra resumen del flujo, con el mismo estilo que las tareas individuales: texto pequeno a la derecha de la barra, visible solo en hover.

## Detalle tecnico

### Archivo: `src/components/lanzamientos/GanttChart.tsx`

En la barra resumen del workflow (lineas 444-454), se haran estos cambios:

1. Reemplazar el atributo `title` (tooltip nativo del navegador) por una etiqueta inline identica a la de las tareas
2. Agregar la clase `group` al contenedor de la barra para activar hover
3. Insertar un `span` con las fechas formateadas como `dd MMM` (sin ano, igual que las tareas) que aparece al hacer hover, posicionado a la derecha de la barra con `left: 100%`
4. El formato sera: `format(wfStart, 'dd MMM', { locale: es }) – format(wfEnd, 'dd MMM', { locale: es })`

El resultado visual sera identico al de las tareas: al pasar el raton por la barra del flujo, aparece "05 dic – 12 dic" a su derecha.
