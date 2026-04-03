

## Fase 3 — Refactorización de archivos grandes

Cuatro archivos de 1000-1800 líneas que se pueden dividir en sub-componentes sin cambiar funcionalidad visible. El objetivo es mantener cada archivo por debajo de ~400 líneas.

---

### 1. Solicitudes.tsx (1846 líneas → ~300 + 4 componentes)

**Extraer:**

| Nuevo archivo | Contenido | Líneas aprox. |
|---|---|---|
| `components/solicitudes/SolicitudesHeader.tsx` | Header con contadores, botones de exportar/plantillas/crear, badges de estado | ~120 |
| `components/solicitudes/SolicitudesFiltersBar.tsx` | Barra de búsqueda, selects de filtro (estado, tipo, artista), toggle de vista | ~80 |
| `components/solicitudes/SolicitudCard.tsx` | `renderSolicitudCard` (líneas 963-1178) — la card individual con acciones | ~220 |
| `components/solicitudes/SolicitudesDialogs.tsx` | Todos los dialogs instanciados al final del JSX (create, edit, details, delete, status, encounter, project, availability) | ~100 |

**`Solicitudes.tsx` queda con:** Estado, hooks, fetch, lógica de filtrado, y el layout principal que compone los sub-componentes. ~300 líneas.

---

### 2. Booking.tsx (1161 líneas → ~250 + 3 componentes)

**Extraer:**

| Nuevo archivo | Contenido |
|---|---|
| `components/booking/BookingHeader.tsx` | Header con título, botones sync/export/backfill/template |
| `components/booking/BookingAlerts.tsx` | Banners de alerta (contratos, realizados, vencidos) |
| `components/booking/BookingTableView.tsx` | La vista tabla con renderizado de filas, columnas, acciones inline |

**`Booking.tsx` queda con:** Estado, queries, lógica de filtros, tabs (tabla/kanban), y composición.

---

### 3. Calendar.tsx (1148 líneas → ~200 + 2 componentes)

Ya tiene `CalendarHeader`, `CalendarToolbar` y `CreateEventDialogV2` extraídos.

**Extraer:**

| Nuevo archivo | Contenido |
|---|---|
| `components/calendar/WeekView.tsx` | Vista semanal con grid de horas, drag-to-select, renderizado de eventos |
| `components/calendar/MonthView.tsx` | Vista mensual con grid de días y eventos |

**`Calendar.tsx` queda con:** Estado, fetch de eventos, lógica de filtros, switch de vistas (week/month/quarter/year).

---

### 4. Teams.tsx (1691 líneas → ~300 + 3 componentes)

**Extraer:**

| Nuevo archivo | Contenido |
|---|---|
| `components/teams/TeamsHeader.tsx` | Header + botones (seleccionar, perfil, invitar) |
| `components/teams/TeamsFilters.tsx` | TeamDropdown, CategoryDropdown, search, view toggle |
| `components/teams/TeamsDialogs.tsx` | Todos los dialogs del final (invite, add contact, edit contact, create/edit team, managers, profile sheet, dashboard, artist info) |

**`Teams.tsx` queda con:** Estado, fetch, lógica de filtrado/agrupación, y composición de vistas (grid/list/free).

---

### Enfoque de implementación

- Cada extracción es un **move puro**: cortar JSX + props necesarias al nuevo componente, sin cambiar lógica
- Los callbacks se pasan como props (ej: `onCreateClick`, `onFilterChange`)
- Los tipos/interfaces compartidos se mantienen en el archivo padre o se mueven a un `types.ts` local si hay más de 2 componentes que los usan
- Se implementa archivo por archivo para poder verificar que nada se rompe entre pasos

