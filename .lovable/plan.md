
# Calendario: semana empieza en lunes

## Problema

Todos los calendarios (DayPicker) de la aplicacion empiezan en domingo (default de react-day-picker). El usuario necesita que empiecen en lunes.

## Solucion

Agregar `weekStartsOn={1}` al componente `Calendar` base en `src/components/ui/calendar.tsx`. Como todos los demas calendarios de la app usan este componente, el cambio se propagara automaticamente a todos los date pickers (lanzamientos, tareas, bookings, etc.).

## Cambio

| Archivo | Detalle |
|---|---|
| `src/components/ui/calendar.tsx` | Agregar la prop `locale` con `es` (date-fns/locale) para que la semana comience en lunes y los nombres de dias aparezcan en espanol. Alternativamente, pasar `weekStartsOn={1}` directamente si se prefiere mantener el idioma en ingles. Se usara `locale={es}` que implica lunes como primer dia. |

Un solo archivo, un solo cambio. Todos los calendarios de la app heredaran el comportamiento.
