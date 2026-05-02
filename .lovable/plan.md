## Limpieza visual del detalle de booking

Refactor enfocado a **carga cognitiva**: estandarizar las KPIs superiores, resolver UUIDs a nombres, reequilibrar la rejilla Resumen/Promotor, unificar el idioma de las pestañas, suavizar la paleta y evitar superposiciones con el FAB.

> No requiere migración de base de datos: los problemas son todos de presentación (los datos en DB ya están correctos; el "UUID en pantalla" es un fallo de resolución en el frontend, no un dato corrupto).

---

### 1. KPIs superiores estandarizadas (Fee · Gastos · Comisión · Facturación/Viabilidad)

Archivo: `src/pages/BookingDetail.tsx` (líneas ~590–702)

- Crear un componente local reutilizable `BookingKpiCard` con estructura fija:
  - Fila 1: label arriba-izquierda (`text-xs uppercase text-muted-foreground`) + icono arriba-derecha (`h-4 w-4`, mismo tamaño todos).
  - Fila 2: valor grande (`text-2xl font-semibold`).
  - Fila 3 opcional: subtexto (`text-[11px] text-muted-foreground`).
- Aplicarlo a las 4 tarjetas → estructura idéntica, alineadas a misma baseline.
- Quitar los gradientes pastel; usar `bg-card` + `border` neutro y un único `accentColor` semántico por tarjeta solo en el icono y el valor cuando aporte significado (ej. disponible negativo = `text-destructive`).
- El "+ Estimar gastos" pasa a un botón secundario **debajo del valor "—"**, no dentro de la tarjeta como estado principal.

### 2. Resolver UUIDs a nombres (Promotor / Buyer)

Archivo: `src/components/booking-detail/BookingOverviewTab.tsx`

- El bloque actual ya intenta resolver `contacto` por UUID (línea 113), pero si no encuentra contact (`maybeSingle()` → null) se cae al `else` y pinta el UUID crudo. Cambios:
  - Si `contacto` matchea regex UUID y no hay registro → mostrar `'Contacto sin nombre'` + tooltip con "ID interno: …" (no exponer el UUID en la UI).
  - Aplicar el mismo patrón a `promotor` (también puede ser UUID; ahora solo se busca por nombre).
  - Detectar regex UUID antes de la búsqueda `or(name.ilike…)` para evitar `.ilike%uuid%` (que nunca matchea).
- Mostrar como fallback secundario el email del contacto si existe (ampliar el `select` a `id, name, stage_name, email`).

### 3. Reequilibrio de la rejilla Resumen / Promotor

Archivo: `src/components/booking-detail/BookingOverviewTab.tsx` (línea 184)

- Cambiar `grid-cols-1 md:grid-cols-2` → `md:grid-cols-5` con `Resumen del Deal` ocupando `md:col-span-3` y `Promotor / Buyer` `md:col-span-2`.
- Dentro de "Resumen del Deal":
  - Mover **Capacidad**, **Invitaciones** y **PVP** a una sección colapsable "Datos de venta" (collapsed por defecto si el evento no está confirmado).
  - Mantener visible solo: Oferta/Fee, Formato, Duración, Público, Estado Facturación.
- Dentro de "Promotor / Buyer":
  - Si `link_venta` o `inicio_venta` están vacíos, no renderizar la sección (ya se hace, ok).
  - Añadir placeholder amable cuando no hay contacto vinculado: botón "+ Vincular contacto" en lugar de tarjeta vacía.

### 4. Unificación de idioma en las pestañas

Archivo: `src/pages/BookingDetail.tsx` (líneas 709–733)

Renombrar etiquetas visibles (los `value` internos no cambian para no romper el `searchParam`):

| Antes | Después |
|---|---|
| Overview | Resumen |
| Hoja de Ruta | Hoja de ruta |
| Presupuesto | Presupuesto |
| Travel Expenses | Gastos de viaje |
| Archivos & Docs | Archivos y documentos |
| Solicitudes | Solicitudes |

### 5. Paleta más sobria

Archivos: `BookingOverviewTab.tsx`, `BookingDetail.tsx`, `PaymentStatusCard.tsx`

- Quitar `text-green-600` para precios/fees → usar `text-foreground` con `font-bold` (verde solo para deltas positivos en cobro real).
- Estados como "Pendiente" → `Badge variant="outline"` con `text-muted-foreground`, **sin** color morado/ámbar. Reservar colores para alertas (rojo) y CTAs.
- Botones con borde punteado (la caja inferior derecha mencionada): convertir a `Card` normal con `border-dashed` solo si es un placeholder de acción, en cuyo caso el border-dashed es válido pero reducir su prominencia con `bg-muted/30`.

### 6. FAB ⚙️ Dev Tools tapando contenido

Archivo: `src/pages/BookingDetail.tsx` (contenedor principal)

- Añadir `pb-24` al contenedor raíz del detalle (actualmente termina con `space-y-6` sin padding inferior extra), garantizando ~96px libres bajo el último card para que el botón flotante no solape la tarjeta de viabilidad.

---

### Notas de integración

- **Auth / panel de usuario**: ningún cambio toca permisos, RLS, ni rutas. Se mantienen los `value` internos de los Tabs (`overview`, `expenses`, etc.), por lo que los enlaces profundos (`?tab=…`) y el sistema de alertas contextuales siguen funcionando.
- **i18n**: el proyecto no usa librería de i18n; los strings van directos en JSX. Cambios localizados a estos dos archivos.
- **Testeo manual**: revisar el detalle con un booking que tenga (a) `contacto` como UUID válido, (b) `contacto` como nombre libre, (c) sin contacto.

### Archivos a tocar
- `src/pages/BookingDetail.tsx` (KPIs estandarizadas, etiquetas tabs, padding inferior)
- `src/components/booking-detail/BookingOverviewTab.tsx` (resolución UUID robusta, rejilla 3/2, sección colapsable, paleta neutra)

### Sin cambios
- Base de datos / migraciones
- Rutas / RLS / Auth
- Componentes hijos (PaymentStatusCard, ViabilityChecksCard, etc.)