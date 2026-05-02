## El conflicto que detectaste (tienes razón)

Hoy conviven dos campos que parecen permisos pero significan cosas distintas:

| Campo | Dónde vive | Qué controla hoy |
|---|---|---|
| **Rol funcional** (`contacts.role`) | Diálogo "Editar rol funcional" | Permisos reales por módulo (Bookings, Cashflow, Contratos…) — vía `functional_role_default_permissions` + overrides |
| **Rol por artista** (`artist_role_bindings.role`: Manager / Booking Agent / Producer…) | Diálogo "Gestionar acceso a artistas" | **Solo scope de visibilidad** (a qué artistas accede). El `role` del binding NO se usa para calcular permisos de módulo. |

El problema UX: el segundo selector se llama "rol" y ofrece Manager / Booking Agent / etc., así que el usuario piensa legítimamente que está re-definiendo permisos por artista — y entra en contradicción con el rol funcional global ("Agente de Booking" vs "Manager en Klaus").

**Regla de negocio que propones (y que adoptamos):**
> El **rol funcional manda siempre**. El binding por artista solo dice "tiene acceso o no" a ese artista. No puede haber dos roles distintos para el mismo perfil.

## Solución

### 1. Single source of truth = rol funcional
En `artist_role_bindings`, el campo `role` deja de ser editable desde la UI. Se rellena automáticamente derivándolo del rol funcional del miembro mediante un mapeo fijo:

```text
Rol funcional              →  artist_role_bindings.role
─────────────────────────     ──────────────────────────
Mánager Personal           →  ARTIST_MANAGER
Agente de Booking          →  BOOKING_AGENT
Productor                  →  PRODUCER
Sello / Label              →  LABEL
Editorial / Publisher      →  PUBLISHER
A&R                        →  AR
Técnico / Roadie           →  ROADIE_TECH
(cualquier otro / vacío)   →  ARTIST_OBSERVER
```

Cuando el usuario cambia el rol funcional en "Editar rol funcional", actualizamos en cascada todos los bindings existentes de ese miembro.

### 2. Rediseño del diálogo "Gestionar acceso a artistas"
- **Quitar el `<Select>` de rol** de cada fila.
- Dejar solo el **checkbox de acceso** (sí / no) por artista, agrupado en "Mi Roster" / "Colaboradores" como ya está.
- En la cabecera del diálogo mostrar un banner informativo:
  > "Este miembro accederá a los artistas marcados con el rol **{rolFuncional}**. Para cambiar su rol, edita el rol funcional."
- Mantener el botón "Editar rol funcional" como atajo.

### 3. Diálogo "Editar rol funcional" — aclaración visual
Añadir bajo el selector de rol funcional una nota:
> "Este rol se aplica también a todos los artistas a los que tenga acceso."

### 4. Lógica de guardado
- En `ManageArtistAccessDialog.handleSave`: al insertar un binding, usar `mapFunctionalRoleToBindingRole(member.functional_role)` en lugar del valor del select.
- En `updateFunctionalRole` (Teams.tsx): después de guardar el `contacts.role`, ejecutar un `UPDATE artist_role_bindings SET role = <nuevo_mapeado> WHERE user_id = <miembro>`.
- Invalidar el cache de permisos (`invalidatePermissionsCache`) tras ambos cambios — el realtime ya escucha `artist_role_bindings`.

### 5. Migración one-shot (datos existentes)
Para los bindings ya creados con un `role` que no coincide con el rol funcional actual del usuario, ejecutar una migración SQL que los reescriba al rol mapeado del rol funcional vigente. Si un usuario no tiene rol funcional asignado, queda como `ARTIST_OBSERVER`.

## Archivos a tocar

- `src/components/teams/ManageArtistAccessDialog.tsx` — quitar Select de rol, añadir banner, simplificar `handleSave`.
- `src/pages/Teams.tsx` — en `updateFunctionalRole`, propagar el nuevo rol a `artist_role_bindings`. Pasar el rol funcional actual del miembro al `ManageArtistAccessDialog`.
- `src/lib/permissions/roleMapping.ts` (nuevo) — helper `mapFunctionalRoleToBindingRole(roleName: string | null): ArtistRole`.
- Migración SQL — `UPDATE artist_role_bindings` realineando con el rol funcional vigente.

## Lo que NO cambia

- El sistema de permisos por módulo (`functional_role_*_permissions`) sigue intacto: el rol funcional define los permisos reales.
- El scope por artista (qué artistas ve cada miembro) sigue funcionando igual: lo controla la presencia/ausencia del binding.
- Los OWNER/TEAM_MANAGER siguen viendo todo (bypass).
