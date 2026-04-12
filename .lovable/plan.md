

## Hacer colapsables "Estado de Pagos" y "Timeline"

### Cambio
Añadir un estado `collapsed` con toggle en el header de cada componente. Al minimizar, se oculta el `CardContent` con animación suave. Se persiste en `localStorage` para recordar la preferencia.

### Archivos a modificar

**1. `src/components/booking-detail/BookingTimeline.tsx`**
- Añadir estado `collapsed` inicializado desde `localStorage('timeline_collapsed')`
- Añadir icono `ChevronDown`/`ChevronUp` al header con `onClick` toggle
- Envolver `CardContent` en condicional `{!collapsed && <CardContent>...</CardContent>}`
- Header con `cursor-pointer` y transición en el icono

**2. `src/components/booking-detail/PaymentStatusCard.tsx`**
- Mismo patrón: estado `collapsed` con `localStorage('payment_status_collapsed')`
- Icono toggle en el header junto a "Estado de Pagos"
- Ocultar `CardContent` cuando colapsado

### Detalle visual
- El icono de chevron rota 180° con `transition-transform duration-200`
- El header completo es clickable para toggle
- Al colapsar, la Card queda solo con el título (compacta)

