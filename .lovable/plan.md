

## Fase 2 — Inconsistencias de navegación

Tres cambios concretos para limpiar rutas confusas y redirecciones innecesarias.

---

### 1. "Mi Perfil" → `/mi-perfil` (antes `/contacts`)

**Cambios:**
- **`AppSidebar.tsx`**: Cambiar `url: "/contacts"` a `url: "/mi-perfil"` en el sidebar de management
- **`App.tsx`**: Añadir ruta `/mi-perfil` que renderiza `<Contacts />` con `DashboardLayout`. Cambiar la ruta `/contacts` a un `<Navigate to="/mi-perfil" replace />` para no romper enlaces existentes

---

### 2. "Drive" → `/carpetas` directamente (eliminar redirección)

**Cambios:**
- **`AppSidebar.tsx`**: Cambiar `url: "/drive"` a `url: "/carpetas"` en ambas vistas (management y artista)
- **`App.tsx`**: Mantener la ruta `/drive` como redirect por si hay enlaces guardados, pero el sidebar ya no la usa

---

### 3. Consolidar botón "Nuevo Proyecto" en Proyectos

Actualmente, los botones "Nuevo Proyecto" y "Crear Proyecto" en `Proyectos.tsx` navegan a `/projects` (otra página). En vez de eso, abrir el formulario de creación inline o como dialog.

**Cambios:**
- **`Proyectos.tsx`**: Cambiar `navigate('/projects')` por un dialog de creación rápida de proyecto. Reutilizar la lógica de `Projects.tsx` para crear el proyecto y luego navegar a `/projects/{id}` (el detalle)
- **`ArtistProfile.tsx`**: El botón "Ver todos" que va a `/projects` → cambiar a `/proyectos`

---

### Resumen de archivos tocados

| Archivo | Cambio |
|---------|--------|
| `AppSidebar.tsx` | Dos URLs: `/contacts` → `/mi-perfil`, `/drive` → `/carpetas` |
| `App.tsx` | Nueva ruta `/mi-perfil`, redirect en `/contacts` |
| `Proyectos.tsx` | Dialog de creación en vez de navegar a `/projects` |
| `ArtistProfile.tsx` | "Ver todos" → `/proyectos` |

