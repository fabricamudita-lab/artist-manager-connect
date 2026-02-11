

# Unificar barra de seleccion con la linea de Progreso General

## Cambio

En lugar de que la barra de seleccion ("X tareas seleccionadas / Ocultar / Cancelar") aparezca como un bloque separado debajo de "Progreso General", se integrara en la misma linea, al lado derecho. Asi al seleccionar tareas no se desplaza el contenido.

## Detalle tecnico

### Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`

1. Fusionar los dos bloques (progreso + seleccion) en un unico `div flex items-center gap-3`
2. El lado izquierdo mantiene: "Progreso General" + barra + "X de Y completadas" + badge %
3. Al lado derecho (con `ml-auto`), cuando `selectedTaskIds.size > 0`, aparecen los controles de seleccion: texto "X tareas seleccionadas", boton Ocultar, boton Cancelar
4. Eliminar el bloque separado de seleccion que se anadio en el cambio anterior
5. Todo queda en una sola fila horizontal sin alterar la estructura de la pagina

