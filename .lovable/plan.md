

## Discrepancia en el conteo de equipo: 37 vs 1

### Problema
La ficha del artista (ArtistProfile) muestra "Equipo: 37" porque cuenta TODOS los contactos asignados a Leyre via `contact_artist_assignments`, sin filtrar por `is_team_member`. Incluye contactos de agenda, promotores, etc.

La página de Equipos (/teams) sí filtra correctamente: solo muestra contactos con `field_config.is_team_member === true`.

### Solución
Corregir la query en `ArtistProfile.tsx` (líneas 125-152) para que solo cuente contactos que sean miembros del equipo (`is_team_member: true`).

### Cambio

**`src/pages/ArtistProfile.tsx`** — Filtrar teamMembers por `is_team_member`

Después de obtener los contactos asignados al artista, filtrar solo los que tienen `field_config.is_team_member === true`:

```typescript
// Línea ~149, después de obtener data de contacts
return (data || []).filter(c => {
  const config = c.field_config as Record<string, any> | null;
  return config?.is_team_member === true;
}) as TeamMember[];
```

Además, incluir también a los workspace members (miembros con cuenta) en el conteo, ya que la página de Equipos los muestra. Actualmente el conteo solo mira contactos, no workspace members.

### Resultado
El número en la tarjeta "Equipo" coincidirá con lo que se ve en /teams al filtrar por ese artista.

