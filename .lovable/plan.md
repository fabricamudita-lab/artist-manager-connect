## Problema

En el modal de hito del calendario (`MilestoneDayPopover`):

1. **Countdown incorrecto**: "Faltan 10 días para el lanzamiento" se calcula contra `new Date()` (hoy), por lo que sale el mismo número independientemente de qué celda del calendario se haya clicado.
2. **Fecha clicada poco visible**: el modal muestra "Vence", "Inicio", fechas de fase, etc. y el usuario no distingue rápidamente qué día concreto del calendario abrió el popover (muchos hitos abarcan varios días).

## Causa

- `MilestoneDayPopover.tsx` línea 81-83 usa `differenceInCalendarDays(parseISO(releaseDate), new Date())` — siempre relativo a hoy.
- Los handlers en `Calendar.tsx` (líneas 848 y 1040) llaman `setSelectedMilestone(m)` sin pasar la fecha del día clicado (`day`).

## Solución

### 1. `src/pages/Calendar.tsx`
- Cambiar el estado `selectedMilestone` para guardar también la fecha clicada:
  ```ts
  const [selectedMilestone, setSelectedMilestone] = useState<{ milestone: CalendarMilestone; date: Date } | null>(null);
  ```
- En los dos `onClick` (líneas 848 y 1040) pasar `{ milestone: m, date: day }`.
- Actualizar la prop al popover (línea 1382): `milestone={selectedMilestone?.milestone ?? null} clickedDate={selectedMilestone?.date}`.

### 2. `src/components/calendar/MilestoneDayPopover.tsx`
- Añadir prop opcional `clickedDate?: Date`.
- **Countdown**: calcular `daysToRelease` desde `clickedDate` (o `new Date()` como fallback) en lugar de `new Date()` siempre. Texto: "Del lanzamiento le faltan X días desde esta fecha" o, mejor, mantener "Faltan X días para el lanzamiento" pero relativo al día clicado.
- **Resaltar fecha clicada**: añadir un bloque destacado en la cabecera (justo debajo del título, antes de los badges) con el formato:
  ```text
  ┌──────────────────────────────────┐
  │ 📅  Domingo, 26 de abril de 2026 │
  └──────────────────────────────────┘
  ```
  Estilo: `rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-base font-semibold` con icono `CalendarDays` en color primario. Solo se muestra si `clickedDate` está definido.

### 3. Resultado

- El popover deja claro de un vistazo qué día se ha clicado (banner destacado arriba).
- "Faltan X días para el lanzamiento" cambia según el día clicado (3 abril → 30 días, 26 abril → 10 días, etc.).
- Si la fecha clicada es posterior al lanzamiento, se mostrará "Lanzamiento publicado hace X días" coherentemente.

Sin cambios de base de datos. Solo dos archivos modificados.
