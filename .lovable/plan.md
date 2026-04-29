## Por qué aparecen contactos sin lógica en "Aprobadores Requeridos"

`TeamMemberSelector` ya recibe el `artistId` y usa el hook `useTeamMembersByArtist`. El problema está en el filtro del hook (`src/hooks/useTeamMembersByArtist.ts`, líneas 160–182):

```ts
const managementCategories = ['management','tourmanager','booking','produccion','tecnico','legal','comunicacion'];
if (member.category && managementCategories.includes(member.category)) {
  return true; // se muestra SIEMPRE, sin importar el artista
}
```

Eso provoca que cualquier contacto cuya categoría sea una de esas (p. ej. "Pedro Inventado · legal", "Núria · otro" si tiene categoría legacy, "Transportes Miguel · tourmanager") se muestre en el selector aunque NO esté asignado al artista seleccionado. Por eso el listado parece arbitrario.

## Cambio

En `src/hooks/useTeamMembersByArtist.ts` quitar el bypass por categoría. La regla queda:

- **Workspace members (cuentas)** → siempre visibles (es el management interno).
- **Contactos** → visibles solo si:
  1. Están marcados explícitamente como management team (`field_config.is_management_team === true`), o
  2. Están asignados al artista vía `contact_artist_assignments`.

No se cambia nada más: el resto de usos del hook (RoadmapBlocks, etc.) se beneficia del mismo criterio coherente.

## Resultado

En "Aprobadores Requeridos" del formulario de solicitud, con un artista seleccionado, solo aparecerán:
- Los miembros del workspace (David Solans, Perfil Test, etc.).
- Los contactos del equipo de ese artista o marcados como management.

Los contactos sueltos por categoría (legal, tourmanager…) que no estén asignados al artista dejarán de aparecer.