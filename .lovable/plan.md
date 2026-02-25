

## Rediseno de Sincronizaciones para coherencia con Booking

### Problema
La pagina de Sincronizaciones tiene un diseno visual diferente al de Booking, y el Kanban obliga a deslizar horizontalmente porque usa columnas de ancho fijo (300px) con scroll horizontal, mientras que Booking usa un grid responsive que muestra todas las fases en pantalla.

### Cambios

**1. SyncKanban: Grid responsive en vez de scroll horizontal**
Archivo: `src/components/sync/SyncKanban.tsx`

- Cambiar el contenedor de `flex gap-4 overflow-x-auto` con columnas fijas de 300px a `grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-3` (igual que BookingKanban).
- Eliminar `min-w-[300px] max-w-[300px]` de `DroppableColumn`.
- Usar `Card` con header compacto (mismo patron que BookingKanban: `CardHeader` + `CardTitle` con Badge de conteo y boton "+").
- Reemplazar las cabeceras de colores solidos por el estilo de Booking (fondo tenue con borde).

**2. Sincronizaciones page: Stats compactos como Booking**
Archivo: `src/pages/Sincronizaciones.tsx`

- Reemplazar las 4 Cards grandes con iconos por una barra de stats compacta igual a Booking: `grid grid-cols-2 md:grid-cols-4 gap-3` con divs `bg-muted/50 rounded-lg px-3 py-2`.
- Esto reduce el espacio vertical y se ve identico a Booking.

**3. Tarjetas de Sync: Estilo coherente con CompactBookingCard**
Archivo: `src/components/sync/SyncKanban.tsx`

- Ajustar las tarjetas `DraggableSyncCard` para que tengan la misma densidad y estilo que `CompactBookingCard`: compactas, con la info clave visible (titulo, artista/cancion, fee, territorio).
- Mantener el contenido especifico de sync (tipo de produccion, territorio) pero con el mismo formato visual.

### Resultado visual esperado

Antes: Cards grandes de stats + Kanban con scroll horizontal
Despues: Stats compactos inline + Grid responsive de 5 columnas que caben en pantalla, identico al layout de Booking

