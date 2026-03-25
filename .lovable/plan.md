

## Deduplicar contactos y unificar etiquetas

### Problema
Cuando se añaden créditos en lanzamientos, el sistema crea un contacto NUEVO por cada rol (ej. "Leyre" como Compositor, "Leyre" como Letrista, "Leyre" como Autor = 3 contactos separados). Además, la vista de Agenda solo muestra UNA categoría por tarjeta (`contact.category`), ignorando el array `team_categories` de `field_config`.

### Solución en 2 partes

---

**1. Evitar duplicados al crear créditos** — `src/pages/release-sections/ReleaseCreditos.tsx`

En la mutación `createCredit`, cuando no hay `contact_id` y se va a crear un contacto nuevo, primero buscar si ya existe un contacto con el mismo nombre (`name`) creado por el mismo usuario:

```text
Si existe contacto con mismo nombre + created_by:
  → Reutilizar ese contact_id
  → Mergear la nueva team_category en su field_config.team_categories
  → Añadir el role al campo role (si es diferente, concatenar con ", ")
Si NO existe:
  → Crear nuevo (comportamiento actual)
```

Esto evita que se creen duplicados futuros.

---

**2. Mostrar todas las categorías en la tarjeta** — `src/pages/Agenda.tsx`

En la vista de grid, actualmente se muestra un solo `Badge` con `contact.category`. Cambiar para que:

- Se lean las `team_categories` de `field_config` (array)
- Se muestren como múltiples badges en la tarjeta
- Si no hay `team_categories`, se use `category` como fallback
- Mostrar el `role` debajo del nombre (ya se hace), que puede tener múltiples roles separados por coma

También ajustar el filtro de categoría para que busque tanto en `contact.category` como en `field_config.team_categories`.

---

**3. Script de limpieza de duplicados existentes** — one-time merge

Crear una función en `ReleaseCreditos.tsx` o ejecutar lógica al cargar la agenda que detecte contactos duplicados (mismo `name`, mismo `created_by`) y los fusione:

- Conservar el contacto más antiguo (menor `created_at`)
- Unificar `team_categories` de todos los duplicados
- Unificar `role` concatenando roles únicos
- Reasignar `contact_artist_assignments` al contacto conservado
- Reasignar `track_credits.contact_id` al contacto conservado
- Eliminar los duplicados

Esto se ejecutará como botón o automáticamente al detectar duplicados.

### Archivos a modificar
- `src/pages/release-sections/ReleaseCreditos.tsx` — dedup al crear créditos
- `src/pages/Agenda.tsx` — mostrar múltiples categorías, filtro por team_categories
- Nuevo: `src/lib/deduplicateContacts.ts` — función de merge de duplicados existentes

### Resultado
- Cada persona = 1 sola tarjeta con todas sus categorías (Compositor, Letrista, Banda, etc.)
- Los créditos futuros reutilizan contactos existentes
- Los duplicados actuales se fusionan automáticamente

