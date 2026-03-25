

## Hacer que los créditos de lanzamientos aparezcan como equipo del artista

### Problema
Cuando se añade un crédito en un lanzamiento (Compositor, Autoría, Producción, etc.), el contacto se crea y se vincula al artista via `contact_artist_assignments`, pero NO se marca como `is_team_member: true` en `field_config`. Por eso no aparecen en la página de Equipos.

### Solución
Modificar `src/pages/release-sections/ReleaseCreditos.tsx` en la mutación `createCredit` para que al crear o vincular un contacto desde créditos, se actualice su `field_config` con `is_team_member: true` y la categoría de equipo correspondiente.

### Cambios

**`src/pages/release-sections/ReleaseCreditos.tsx`**

1. Al **crear un contacto nuevo** (línea ~437-441), incluir `field_config` con `is_team_member: true` y `team_categories` mapeadas desde el rol del crédito:

| Categoría crédito | team_categories |
|---|---|
| compositor | `['compositor']` |
| autoria | `['letrista']` |
| produccion | `['produccion']` |
| interprete | `['banda']` |
| contribuidor | `['artistico']` |

2. Al **vincular un contacto existente** (que ya tenía `contact_id`), hacer un update para asegurar que `is_team_member: true` y que la categoría de equipo correspondiente se añada a `team_categories` sin sobreescribir las existentes. Esto requiere leer el `field_config` actual, mergear las categorías, y actualizar.

### Mapeo de categorías
```text
Crédito rol          →  team_categories value
─────────────────────────────────────────────
compositor           →  compositor
autoria (letrista)   →  letrista  
produccion           →  produccion / tecnico
interprete           →  banda / interprete
contribuidor         →  artistico
```

### Resultado
Todos los nombres que aparecen en créditos de lanzamientos de Leyre aparecerán automáticamente en su equipo, etiquetados con la categoría correspondiente.

