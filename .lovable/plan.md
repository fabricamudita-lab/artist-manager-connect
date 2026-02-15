
# Hacer scrollable toda la pagina de presupuestos

## Problema

El dialogo de detalle de presupuesto tiene una estructura de layout fijo: el header (titulo, tarjetas financieras, badges de ubicacion, recordatorio) esta anclado arriba con `flex-shrink-0`, y solo el contenido de abajo (tabs) tiene scroll. Esto consume mucho espacio vertical y no permite ver toda la informacion de forma fluida.

## Solucion

Cambiar el layout para que todo el contenido sea scrollable como una sola pagina, eliminando la separacion entre header fijo y contenido con scroll independiente.

## Cambios tecnicos en `src/components/BudgetDetailsDialog.tsx`

1. **Linea 2401**: Cambiar el contenedor principal de `overflow-hidden` a `overflow-y-auto` para que todo el div sea scrollable
2. **Linea 2403**: Quitar `flex-shrink-0` del header para que fluya naturalmente con el scroll
3. **Linea 2764**: Cambiar `<div className="flex-1 overflow-hidden">` a `<div className="flex-1 min-h-0">` para que el contenido de tabs siga funcionando correctamente dentro del scroll general
4. **Linea 2766**: En el div del border-b de tabs, quitar `flex-shrink-0` o mantenerlo segun sea necesario
5. Ajustar el TabsContent de items (linea 2779-2780) para que no use `overflow-hidden` ni `h-full` rigido, sino que se expanda naturalmente

El resultado: al hacer scroll en el dialogo, primero se desplaza el header con las tarjetas financieras y luego se ve el contenido de las tabs. Las tabs seguiran funcionando normalmente pero sin la restriccion de espacio fijo.

### Archivo afectado

- `src/components/BudgetDetailsDialog.tsx` - Cambios de layout CSS (5-6 clases)
