

## Editar nombre en créditos vinculados + actualización masiva en el release

### Problema
Cuando un crédito está vinculado a un contacto (`contact_id`), el campo de nombre no es editable (línea 929-938 de `ReleaseCreditos.tsx`). El usuario necesita poder controlar el nombre legal que aparece en los documentos, independientemente del nombre del contacto.

### Cambios

**1. `src/pages/release-sections/ReleaseCreditos.tsx` — Hacer editable el nombre siempre**

En `SortableCreditRow` (líneas 926-938), eliminar la condición que bloquea la edición del nombre cuando hay `contact_id`. El input de nombre debe mostrarse siempre, tanto con contacto vinculado como sin él. También eliminar la condición `!hasContact` en `handleSave` (línea 914).

**2. `src/pages/release-sections/ReleaseCreditos.tsx` — Detección de duplicados y actualización masiva**

Modificar la mutación `updateCredit` (líneas 480-493) para que, cuando el campo `name` cambie:

1. Buscar en todas las pistas del release otros créditos con el mismo nombre antiguo:
   ```sql
   SELECT id FROM track_credits 
   WHERE track_id IN (SELECT id FROM tracks WHERE release_id = :releaseId)
   AND name = :oldName
   AND id != :currentCreditId
   ```

2. Si encuentra coincidencias, mostrar un diálogo de confirmación:
   - "Se encontraron X créditos más con el nombre 'Joan Nitu' en este disco. ¿Quieres actualizarlos todos a 'Joan Nitu López'?"
   - Botón "Actualizar todos" → actualiza todos los créditos coincidentes
   - Botón "Solo este" → actualiza solo el crédito actual

3. Para implementar el diálogo, añadir un estado `pendingBulkUpdate` con `{oldName, newName, matchingIds[], currentCreditId, fullData}` y un `AlertDialog` que se muestra cuando hay una actualización pendiente.

**3. Componente de diálogo de confirmación**

Añadir un `AlertDialog` dentro del componente `TrackAccordion` (o a nivel del componente principal) que se renderice cuando `pendingBulkUpdate` no sea null. Al confirmar "Actualizar todos", ejecutar un `Promise.all` de updates para todos los IDs coincidentes, e invalidar las queries de todos los tracks del release.

### Flujo
```text
Editar crédito → Cambiar nombre → Guardar
  → Query: ¿hay más créditos con el nombre anterior en este release?
  → Sí → AlertDialog: "¿Actualizar los X créditos restantes?"
       → "Actualizar todos" → batch update → invalidate queries
       → "Solo este" → update individual → invalidate query
  → No → update individual normal
```

### Detalle técnico
- El `releaseId` ya está disponible via `useParams` en el componente padre
- Los `tracks` del release ya se cargan con `useTracks(releaseId)`
- La búsqueda de duplicados se hace client-side si ya tenemos los créditos cargados por track, o server-side con una query directa a Supabase

