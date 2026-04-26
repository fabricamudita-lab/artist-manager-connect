## Objetivo

El panel "Eventos para …" debe mostrar contenido aunque no haya un día concreto seleccionado, adaptándose al modo de calendario y, en Mes/Año, también a un mes seleccionado en el encabezado.

## Comportamiento por vista

| Vista | Sin selección | Click en mes (encabezado) | Click en día concreto |
|---|---|---|---|
| **Semana** | Todos los eventos de la semana visible (`currentDate`) | — | Solo de ese día (igual que ahora) |
| **Mes** | Todos los eventos de los **dos meses visibles** (`currentDate` y `currentDate + 1 mes`) | Solo eventos del mes clicado | Solo de ese día |
| **Año** | Todos los eventos del año (`currentDate.getFullYear()`) | Solo eventos del mes clicado | Solo de ese día |

Regla: al cambiar de vista o navegar (prev/next/today), se limpian `selectedDate` y `selectedMonth` para que el panel vuelva al modo "rango completo" de la nueva vista.

## Cambios técnicos

### 1. `src/pages/Calendar.tsx` — Estado nuevo

- Cambiar `selectedDate` para que arranque como `undefined` (hoy en día se inicializa con `new Date()` en línea 63 — esto fuerza que siempre haya día seleccionado).
- Añadir `const [selectedMonth, setSelectedMonth] = useState<Date | null>(null)` (representa el primer día del mes seleccionado).
- En `setViewMode` (los 3 botones de las 3 vistas), `navigateWeek/Month/Year` y "Hoy": resetear `setSelectedDate(undefined)` y `setSelectedMonth(null)`. (Hoy `navigateWeek/Month` setean `selectedDate = newDate` — eliminar esa línea.)
- Al hacer click en un día del calendario: `setSelectedMonth(null)` además de `setSelectedDate(day)`.

### 2. Encabezados de mes clicables

- **Vista Mes** (`renderSingleMonth`, línea 956-964): envolver el `<h3>` en un botón que haga `setSelectedMonth(startOfMonth(monthDate))` y `setSelectedDate(undefined)`. Resaltar visualmente el mes activo (`selectedMonth && isSameMonth(monthDate, selectedMonth)` → `text-primary underline`).
- **Vista Año** (`YearlyCalendar.tsx`, línea 84): añadir prop `onMonthSelect?: (date: Date) => void` y `selectedMonth?: Date | null`. El `<h3>{monthNames[monthIndex]}</h3>` se vuelve clicable (con `e.stopPropagation()` para no chocar con clicks de día). Resaltar mes activo con `ring-2 ring-white` o similar. Pasar las props desde Calendar.tsx en línea 1120.

### 3. Helpers nuevos en `Calendar.tsx`

```ts
const getEventsInRange = (start: Date, end: Date) =>
  filteredEvents.filter(e => {
    const d = new Date(e.start_date);
    return d >= start && d <= end;
  });

const getBookingsInRange = (start: Date, end: Date) =>
  filteredBookings.filter(b => {
    if (!b.fecha) return false;
    const d = new Date(b.fecha);
    return d >= start && d <= end;
  });
```

### 4. Lógica del panel "Eventos para …" (líneas 1158-1265)

Reemplazar el actual `selectedDate && <Card>…</Card>` por una lógica que calcule `{ rangeLabel, rangeEvents, rangeBookings }` según prioridad:

1. Si `selectedDate` → comportamiento actual (un día).
2. Else si `selectedMonth` → rango = mes completo. Título: `"Eventos de {MMMM yyyy}"`.
3. Else según `viewMode`:
   - `week`: rango = `startOfWeek(currentDate, {weekStartsOn:1})` … `endOfWeek(...)`. Título: `"Eventos de la semana del {d} al {d MMM yyyy}"`.
   - `month`: rango = `startOfMonth(currentDate)` … `endOfMonth(addMonths(currentDate,1))`. Título: `"Eventos de {MMM} – {MMM yyyy}"`.
   - `year`: rango = año entero (`startOfYear`/`endOfYear`). Título: `"Eventos de {yyyy}"`.
4. Si `quarter` (existe en el type union) → tratarlo como `month`.

El panel se renderiza siempre (no condicionado por `selectedDate`). La lista de bookings y eventos se ordena por fecha ascendente. Cada evento/booking muestra ya su fecha (formato corto) además de la hora, dado que ahora pueden ser de días distintos.

El bloque "No hay eventos programados…" se mantiene cuando ambos arrays están vacíos, adaptando el texto al rango (p. ej. "No hay eventos en este rango").

### 5. Reusar el render

Extraer las tarjetas actuales de booking y de evento (líneas 1172-1257) sin cambios estructurales — solo iteran sobre los nuevos arrays `rangeBookings` y `rangeEvents`. Añadir un pequeño `<span>` con la fecha (`format(date, 'd MMM', {locale: es})`) junto a la hora cuando el rango cubra más de un día.

### Imports adicionales

`startOfYear`, `endOfYear` desde `date-fns` (ya se usan `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `addMonths`, `isSameMonth`).

Sin cambios de base de datos.
