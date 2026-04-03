

## Auditoría completa de MOODITA — Bugs, inconsistencias y mejoras

Tras revisar las 14+ secciones del sidebar en profundidad, he encontrado problemas en 3 categorías: bugs activos que rompen funcionalidad, inconsistencias estructurales, y mejoras de UX/calidad.

---

### BUGS ACTIVOS

**B1. Documents.tsx — Tabla equivocada para artistas**
La página de Documentos hace `from('profiles').select('*')` para poblar el selector de artistas, pero `documents.artist_id` probablemente debería referenciar la tabla `artists`, no `profiles`. Además, el tipo `Artist` usa `full_name` y `email` como si fuera un perfil, no un artista.
- **Fix**: Cambiar la query a `from('artists').select('id, name, stage_name')` y adaptar el tipo y las referencias a `a.stage_name || a.name`.

**B2. AddToCalendarDialog.tsx — Misma confusión profiles/artists**
Hace `from('profiles').select('*').contains('roles', ['artist'])` para listar artistas. Usa `full_name` como display. Si el calendario espera `artist_id` referenciando `artists`, la query está mal.
- **Fix**: Cambiar a `from('artists')` o validar que `artist_id` en `events` referencia `profiles`.

**B3. Correo.tsx — Datos mock, no conectado**
La página de Correo usa `mockEmails` y `mockAccounts` importados de `emailMockData`. No hay integración real. El usuario ve un buzón falso con datos inventados.
- **Fix**: Mostrar un estado vacío claro ("Correo no configurado — Conecta tu cuenta de email") en vez de datos falsos que confunden.

**B4. Settings.tsx — Todos los switches son decorativos**
Ningún `Switch` tiene `checked`, `onCheckedChange`, ni estado. Los toggles no hacen nada — son puramente visuales.
- **Fix**: O conectarlos a preferencias reales en la DB, o mostrar un placeholder honesto ("Próximamente").

**B5. Proyectos.tsx — DashboardLayout duplicado**
`Proyectos.tsx` ya envuelve su contenido en `<DashboardLayout>` internamente (línea 165), pero en `App.tsx` NO tiene `<DashboardLayout>` wrapper. Sin embargo, `Drive.tsx` redirige a `/carpetas` que tampoco tiene `DashboardLayout` en App.tsx. Ambas páginas (`/proyectos`, `/carpetas`, `/drive`) se renderizan sin sidebar.
- **Fix**: Alinear — o quitar `DashboardLayout` de dentro del componente y añadirlo en `App.tsx`, o dejarlo dentro. Lo importante es la consistencia. Actualmente `/proyectos` tiene sidebar (lo pone internamente) pero `/drive` redirige a `/carpetas` que SÍ tiene sidebar internamente.

---

### INCONSISTENCIAS ESTRUCTURALES

**E1. Sidebar "Mi Perfil" apunta a `/contacts`**
En el sidebar de management, "Mi Perfil" tiene `url: "/contacts"`. La página `/contacts` (`Contacts.tsx`) es efectivamente la página de perfil del usuario (muestra `ProfileTab` con datos personales, documentos de identidad, etc.). El nombre de la ruta `/contacts` es confuso, pero la funcionalidad es correcta.
- **Fix**: Renombrar la ruta a `/mi-perfil` para claridad, o al menos validar que el label y la ruta coincidan.

**E2. Dos páginas de proyectos: `/projects` y `/proyectos`**
`/projects` renderiza `Projects.tsx` y `/proyectos` renderiza `Proyectos.tsx`. El botón "Nuevo Proyecto" en Proyectos navega a `/projects`. Son dos páginas distintas para el mismo concepto.
- **Fix**: Consolidar en una sola. Parece que `Proyectos.tsx` es la vista de lista principal y `Projects.tsx` es un flujo de creación.

**E3. `/drive` redirige a `/carpetas`, pero el sidebar dice "Drive"**
El sidebar tiene `url: "/drive"`, que redirige a `/carpetas`. La página real es `Carpetas.tsx`. Funciona, pero añade una redirección innecesaria.
- **Fix**: Cambiar el sidebar a `url: "/carpetas"` directamente, o consolidar.

---

### MEJORAS DE CALIDAD / UX

**M1. Solicitudes.tsx — 1846 líneas en un solo archivo**
Es el archivo más grande de la app. Difícil de mantener y lento para cargar/editar.
- **Fix**: Extraer en sub-componentes (SolicitudesHeader, SolicitudesTable, SolicitudesFilters, etc.).

**M2. Booking.tsx — 1161 líneas**
Misma situación. La lógica de filtros, tabla, kanban, templates y validaciones está todo en un archivo.
- **Fix**: Refactorizar a componentes más pequeños.

**M3. Calendar.tsx — 1148 líneas**
Calendario con múltiples vistas (semana, mes, trimestre, año) todo inline.
- **Fix**: Extraer vistas de calendario a componentes separados.

**M4. Teams.tsx — 1691 líneas**
Gestión de equipos con múltiples vistas, dialogs y lógica compleja en un solo archivo.

**M5. Contacts (Mi Perfil) — 911 líneas con lógica duplicada**
`DocumentUploadCard` y `DocumentDisplayCard` tienen lógica casi idéntica de signed URLs.

---

### PLAN DE IMPLEMENTACIÓN (por prioridad)

**Fase 1 — Bugs activos (impacto inmediato)**
1. Corregir `Documents.tsx`: cambiar query de `profiles` a `artists` y adaptar tipos
2. Corregir `AddToCalendarDialog.tsx`: mismo fix
3. Reemplazar datos mock en `Correo.tsx` por un estado vacío honesto
4. Hacer que `Settings.tsx` muestre "Próximamente" en los switches no funcionales

**Fase 2 — Inconsistencias de navegación**
5. Cambiar sidebar: "Mi Perfil" → url `/mi-perfil`, crear redirect de `/contacts` a `/mi-perfil`
6. Cambiar sidebar: "Drive" → url `/carpetas` directamente (eliminar redirección)
7. Consolidar botón "Nuevo Proyecto" en Proyectos para no navegar a otra página

**Fase 3 — Calidad de código (no cambia funcionalidad visible)**
8. Extraer sub-componentes de `Solicitudes.tsx`, `Booking.tsx`, `Calendar.tsx` y `Teams.tsx`

Propongo empezar por la **Fase 1** (4 fixes concretos) que son los que impactan directamente la experiencia del usuario. Las fases 2 y 3 se pueden abordar después.

