

# Auto-sugerir ubicacion y base de datos de ubicaciones

## Parte 1: Auto-rellenar ubicacion en Soundcheck y Show

Cuando el usuario selecciona el tipo de actividad "Soundcheck" o "Show", el campo ubicacion se rellena automaticamente con el `lugar` del booking vinculado (ej: "La Nau"). El usuario puede editarlo despues si lo desea.

### Cambio en `ScheduleBlock.tsx`

En el `InlineSelectCell` del `SortableScheduleRow`, cuando cambia `activityType` a `show` o `soundcheck`, si la ubicacion esta vacia, se rellena con `bookingInfo.venue`.

- Pasar `bookingInfo` como prop a `SortableScheduleRow`
- En el `onChange` del `InlineSelectCell` (donde ya se auto-rellena el titulo), agregar logica para auto-rellenar `location` con `bookingInfo.venue` si esta vacio y el tipo es `show` o `soundcheck`

## Parte 2: Tabla de ubicaciones para autocompletado

Crear una tabla `roadmap_locations` en Supabase que almacene ubicaciones usadas previamente, asociadas a un artista. Cuando el usuario escribe en el campo de ubicacion, se sugieren coincidencias.

### Esquema de la tabla

```text
roadmap_locations
- id: uuid (PK)
- artist_id: uuid (FK -> artist_profiles)
- name: text (nombre del lugar, ej: "La Nau", "Hotel Arts")
- category: text (opcional: venue, hotel, restaurant, airport, other)
- city: text (opcional)
- created_at: timestamptz
```

Con RLS habilitado y politica basada en el usuario autenticado.

### Cambio en el campo de ubicacion

Reemplazar el `InlineEditCell` de ubicacion por un componente con autocompletado:

- Al escribir 2+ caracteres, consultar `roadmap_locations` filtrado por `artist_id` y `name ilike '%texto%'`
- Mostrar sugerencias en un dropdown debajo del input
- Al seleccionar una sugerencia, rellenar el campo
- Al escribir un valor nuevo y salir del campo, guardar automaticamente la nueva ubicacion en `roadmap_locations`

### Nuevo componente `LocationAutocomplete`

Componente dentro de `src/components/roadmap-blocks/` que:
- Recibe `artistId`, `value`, `onChange`
- Usa `useQuery` para buscar ubicaciones con debounce
- Muestra un Popover con las sugerencias
- Inserta nuevas ubicaciones automaticamente al confirmar un valor que no existe

### Archivos a modificar/crear

1. **Nueva migracion SQL** - Crear tabla `roadmap_locations` con RLS
2. **Nuevo componente** `src/components/roadmap-blocks/LocationAutocomplete.tsx`
3. **`src/components/roadmap-blocks/ScheduleBlock.tsx`** - Pasar `bookingInfo` a `SortableScheduleRow`, auto-rellenar ubicacion en soundcheck/show, reemplazar `InlineEditCell` de ubicacion por `LocationAutocomplete`
4. **Actualizar tipos Supabase** si es necesario tras la migracion

