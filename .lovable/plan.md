# Plan: Mejorar Editar Rol Funcional + Dar acceso a artistas

## Contexto

Tienes dos cuestiones distintas que vamos a abordar:

1. El diálogo **"Editar rol funcional"** (en `/teams`) hoy es un campo de texto libre — propenso a errores tipográficos e inconsistencias.
2. No existe un flujo claro y visible para **dar a un perfil de usuario (ej. "Perfil Test") acceso a un artista concreto**.

Ambas cosas ya tienen "ladrillos" en el código (`TEAM_CATEGORIES` para roles, `artist_role_bindings` + `InviteArtistDialog` para acceso a artistas), pero no están bien expuestas en la UI de Equipos.

---

## Parte 1 — Convertir "Rol funcional" en selector con opciones

### Cambios

- Reemplazar el `<Input>` de texto libre por un **Combobox** (selector con buscador y opción de escribir uno propio).
- Las opciones por defecto vendrán del catálogo ya existente `TEAM_CATEGORIES` (`src/lib/teamCategories.ts`): Banda, Equipo Artístico, Equipo Técnico, Management, Comunicación, Legal, Producción, Tour Manager, Booking, Compositor, Letrista, Productor, Intérprete, Sello, Editorial, Colaboradores, Otros.
- Añadiremos también roles de uso frecuente que faltan: **Business Manager, Director Artístico, Booker, A&R, Road Manager, Mánager Personal**.
- Se permitirá escribir un valor personalizado (campo libre debajo de "Otro…") para no perder flexibilidad, pero priorizando la lista para evitar errores.
- Los nuevos roles personalizados quedarán disponibles localmente para esa edición; opcionalmente se persistirán en la lista de "categorías personalizadas" del workspace (ya existe la tabla para custom categories).

### Resultado visible

Al abrir "Editar rol funcional" para Perfil Test verás:
- Un selector con búsqueda (tipo combo) listando los roles funcionales estándar.
- Al final, opción "Otro…" para escribir uno nuevo si hace falta.
- Botón Guardar habilitado al elegir o escribir un valor.

---

## Parte 2 — Dar acceso de Perfil Test a un Artista

Esto es independiente del rol funcional. El acceso a un artista concreto se controla en la tabla `artist_role_bindings` (ya implementada por el modelo RBAC jerárquico Workspace > Artista > Proyecto).

### Estado actual
- Ya existe `InviteArtistDialog` que crea un binding `(user_id, artist_id, role)` cuando el usuario ya tiene perfil.
- Falta un punto de entrada claro desde la ficha del miembro en `/teams` para gestionarlo.

### Cambios

1. En la tarjeta/menú contextual de cada miembro en `/teams` añadir una nueva acción: **"Gestionar acceso a artistas"**.
2. Esa acción abre un nuevo diálogo `ManageArtistAccessDialog` con:
   - Lista de todos los artistas del workspace (checkboxes).
   - Marcados los artistas a los que el miembro ya tiene binding.
   - Un selector de rol por artista: `ARTIST_MANAGER`, `ARTIST_COLLABORATOR`, `ARTIST_VIEWER` (los valores ya soportados por el enum existente).
   - Botón Guardar que inserta/elimina filas en `artist_role_bindings` según los cambios.
3. Validación: solo OWNER / TEAM_MANAGER del workspace pueden abrir este diálogo (siguiendo las RLS ya endurecidas en la migración Phase 2).

### Resultado visible

Para dar a "Perfil Test" acceso a un artista:
1. En `/teams`, abrir el menú "⋯" del miembro Perfil Test.
2. Pulsar **"Gestionar acceso a artistas"**.
3. Marcar el/los artistas que debe ver y elegir el rol (Manager / Colaborador / Viewer).
4. Guardar. A partir de ese momento Perfil Test verá únicamente los datos de esos artistas.

---

## Detalles técnicos (resumen)

- **Archivos a modificar**:
  - `src/pages/Teams.tsx`: cambiar el `Input` (líneas 1729-1736) por un `Combobox` basado en `Command` + `Popover` con opciones de `TEAM_CATEGORIES`. Añadir entrada de menú "Gestionar acceso a artistas" en cada tarjeta de miembro.
  - `src/lib/teamCategories.ts`: añadir Business Manager, Director Artístico, Booker, A&R, Road Manager, Mánager Personal.
  - `src/components/teams/ManageArtistAccessDialog.tsx` (nuevo): diálogo con lista de artistas y rol por artista, leyendo/escribiendo en `artist_role_bindings`.
- **Base de datos**: no requiere migraciones — `artist_role_bindings` y enum de roles ya existen.
- **Permisos**: las RLS endurecidas en Phase 2 ya permiten que solo OWNER/TEAM_MANAGER inserten en `artist_role_bindings`. Se respeta el modelo actual.

---

## Fuera de alcance

- No tocamos roles de workspace (Owner / Team Manager / Member) — eso ya está en su sitio.
- No alteramos las políticas RLS aplicadas en Phase 2.
