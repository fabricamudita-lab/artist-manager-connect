## Problema

En `/calendar` no aparecen los bookings cuya fase es **`facturado`** (ni `cerrado`). El filtro actual en `fetchBookingOffers` solo incluye:

```ts
.or('estado.in.(confirmado,pendiente,negociacion,interes,oferta),phase.in.(interes,negociacion,preconfirmado,confirmado,realizado)')
```

Verificado en BD: las fases reales son `interes`, `oferta`, `negociacion`, `confirmado`, `realizado`, `facturado` (y `cerrado` definida en el dominio). El usuario muestra una columna "Facturado" del Kanban con eventos de fechas reales (19/2 y 27/3 CurtCircuit) que efectivamente no se pintan en el calendario.

## Solución

Una sola línea en `src/pages/Calendar.tsx` (línea 343) para incluir todas las fases del pipeline:

```ts
.or(
  'estado.in.(confirmado,pendiente,negociacion,interes,oferta,facturado,realizado,cerrado),' +
  'phase.in.(interes,oferta,negociacion,preconfirmado,confirmado,realizado,facturado,cerrado)'
)
```

Cambios:
- Añadir `facturado`, `realizado`, `cerrado` a `estado.in(...)`.
- Añadir `oferta`, `facturado`, `cerrado` a `phase.in(...)`.

Esto cubre todo el pipeline de booking (desde `interes` hasta `cerrado`) sin tocar la UI ni el resto de la lógica.

## Validación y seguridad

- **Sin riesgo de inyección**: el filtro es una constante literal pasada al query builder de Supabase (parametrizado).
- **RLS**: ya aplicada por `booking_offers`; añadir más fases no expone datos extra, solo deja pasar las filas a las que el usuario ya tiene acceso.
- **Compatibilidad**: el resto del código (`getBookingOffersForDate`, `formatBookingTitle`, `KpiStatsBar`, etc.) ya soporta `facturado` (ver `KpiStatsBar.tsx` y `UpcomingEventsWidget.tsx`).
- **Edge cases**: bookings sin `fecha` siguen filtrados por `getBookingOffersForDate` (ya protegido). Bookings de artistas no seleccionados se siguen filtrando por `artist_id`.

## Archivos a tocar

- `src/pages/Calendar.tsx` — línea 343, una única edición.

No hay cambios de BD, hooks, RLS ni UI.

## Resultado

Los eventos en fase `facturado` (y `cerrado`) aparecerán en las vistas Semana, Mes y Año del calendario, igual que los `confirmado`/`realizado`.