

## Auditoría completa del sidebar — Bugs y mejoras encontrados

Tras revisar el código de las secciones principales del sidebar, aquí van los problemas encontrados, organizados por prioridad.

---

### BUG 1: `ContactSelector.tsx` — query rota (mismo bug que se acaba de corregir)

**Archivo:** `src/components/ContactSelector.tsx` (línea 61)

La query usa `profiles:artist_id(full_name)` pero `contacts.artist_id` referencia la tabla `artists`, que no tiene `full_name`. Esto rompe silenciosamente la carga de contactos cuando se usa este componente.

**Fix:** Cambiar a `artist:artist_id(name, stage_name)` y adaptar el consumo.

---

### BUG 2: `ManagementDashboard.tsx` — botón "Invitar Artista" no funciona

El botón llama `setShowInviteDialog(true)` pero ese estado **nunca se pasa** al componente `InviteArtistDialog`. El dialog maneja su propio estado interno con `DialogTrigger`, así que el botón no abre nada.

**Sin embargo**, `ManagementDashboard` es **código muerto** — no se importa en ninguna ruta ni componente activo. El dashboard real es `OwnerDashboard` + `CollaboratorDashboard`.

**Fix:** Eliminar `ManagementDashboard.tsx` como dead code (o ignorar).

---

### BUG 3: `ManagementDashboard.tsx` — Pestaña Finanzas hardcodeada a €0

La pestaña "Finanzas" muestra todo hardcodeado a €0 sin hacer ninguna query. Botones como "Ver Informe Detallado" y "Registrar Ingreso" no tienen `onClick`.

**Fix:** Código muerto — eliminar o ignorar (misma razón que Bug 2).

---

### MEJORA 4: Dead code — archivos sin usar

Estos archivos no se usan en rutas activas:
- `src/components/ManagementDashboard.tsx` — sustituido por `OwnerDashboard`
- `src/pages/Finanzas.tsx` — sustituido por `FinanzasHub.tsx`
- Variables sin usar: `eventTimeframe` y `newArtist` en ManagementDashboard

**Fix:** Eliminar estos archivos muertos para limpiar el proyecto.

---

### MEJORA 5: `OwnerDashboard.tsx` — demasiadas queries secuenciales

El dashboard del owner hace **~15 queries individuales** a Supabase de forma secuencial en `fetchGlobalData`. Esto ralentiza la carga innecesariamente.

**Fix:** Agrupar queries independientes en `Promise.all` para ejecutarlas en paralelo.

---

### MEJORA 6: Sidebar — "Mi Perfil" apunta a `/contacts` que es confuso

En el sidebar de management, "Mi Perfil" va a `/contacts` — esa ruta probablemente muestra la lista de contactos, no el perfil del usuario.

**Fix:** Verificar y potencialmente corregir la ruta o el label.

---

### Resumen de acciones propuestas

| # | Tipo | Impacto | Archivo |
|---|------|---------|---------|
| 1 | Bug activo | Alto | `ContactSelector.tsx` |
| 2-3 | Dead code | Bajo | `ManagementDashboard.tsx` |
| 4 | Limpieza | Bajo | Varios archivos muertos |
| 5 | Performance | Medio | `OwnerDashboard.tsx` |
| 6 | UX | Bajo | `AppSidebar.tsx` |

### Plan de implementación

1. **Corregir `ContactSelector.tsx`** — cambiar `profiles:artist_id(full_name)` por `artist:artist_id(name, stage_name)`
2. **Eliminar dead code** — borrar `ManagementDashboard.tsx` y `Finanzas.tsx`
3. **Optimizar `OwnerDashboard`** — envolver queries en `Promise.all`

