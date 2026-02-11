

# Integrar barra de seleccion y reducir barra de progreso

## Dos cambios

### 1. Barra flotante de seleccion: integrarla en la pestaña

La barra flotante fija en la parte inferior ("X tareas seleccionadas / Ocultar / Cancelar") tapa las tareas. Se movera de `fixed bottom-6` a una barra inline integrada justo encima del contenido del Gantt/Lista, debajo de la toolbar de filtros. Asi no tapa nada y queda contextualizada.

**Archivo:** `src/pages/release-sections/ReleaseCronograma.tsx`
- Mover el bloque de lineas 1857-1872 (la barra flotante) de su posicion `fixed` a un bloque inline justo antes del contenido de la vista (linea ~1696)
- Cambiar las clases de `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` a clases inline como `flex items-center gap-3 bg-muted/50 border rounded-lg px-4 py-2`
- La barra aparecera/desaparecera condicionalmente igual que ahora, pero dentro del flujo de la pagina

### 2. Reducir el tamaño de la tarjeta "Progreso General"

La card de progreso ocupa demasiado espacio vertical. Se convertira en una barra compacta inline (una sola fila).

**Archivos:** `src/pages/release-sections/ReleaseCronograma.tsx` (lineas 1678-1694) y `src/pages/Lanzamientos.tsx` (lineas 377-393)

En ambos archivos, reemplazar la Card completa (con CardHeader, CardTitle, CardContent) por una barra compacta de una sola linea:
- Un `div` con `flex items-center gap-3` que contenga:
  - Texto "Progreso General" en tamaño pequeño
  - La barra de progreso (`Progress`) con `h-2` y un ancho limitado (ej: `w-48` o `flex-1 max-w-xs`)
  - El texto "X de Y completadas" en tamaño pequeño
  - El badge de porcentaje en tamaño reducido
- Todo en una sola linea horizontal, sin Card wrapper, ocupando una fraccion del espacio actual
