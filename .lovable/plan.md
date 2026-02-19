
# Por qué no aparece David Solans en "Owner interno"

## Diagnóstico exacto

El lanzamiento "La Flor de Déu" pertenece al artista **Pol Batlle Huedo** (`34ddc091`). Al inspeccionar la base de datos:

| Fuente | Resultado |
|--------|-----------|
| Contactos vinculados a Pol Batlle con `category='management'` | **0 resultados** |
| Contacto "David Solans Cortes" vinculado a Pol Batlle | Existe, pero con `category='produccion'` |
| Perfil de usuario "David Solans" (workspace owner) | Existe, pero no aparece porque el selector solo busca en `contacts`, no en `profiles` |
| `artist_role_bindings` para Pol Batlle | Vacío (David no está asignado formalmente como manager de este artista) |

Hay **tres problemas combinados**:

1. El selector de Owner solo busca en la tabla `contacts` filtrada por `category = 'management'`. No incluye a los **usuarios internos del workspace** (tabla `profiles`) que son los managers reales.
2. El contacto de David Solans para este artista tiene `category: produccion`, no `management`.
3. No hay mecanismo para que el "dueño del workspace" aparezca automáticamente como opción de owner.

## Solución

### Opción A (implementar): Owner ampliado con perfiles internos + contactos management

Ampliar el campo Owner para que incluya **dos fuentes**:

**Fuente 1 — Usuarios internos del workspace** (tabla `profiles`):
- Todos los usuarios con `active_role = 'management'` o `roles @> '{management}'`
- O cualquier usuario con `artist_role_bindings` para este artista (ARTIST_MANAGER, TEAM_MANAGER, OWNER)
- Marcados con icono de usuario interno

**Fuente 2 — Contactos externos con categoría management** (tabla `contacts`):
- Contactos vinculados al artista via `contact_artist_assignments` con `category = 'management'`
- Marcados con icono de contacto externo

Esta lógica garantiza que el Owner del workspace siempre aparezca y que los managers externos también sean seleccionables.

## Cambios técnicos

### `src/components/releases/ReleaseBudgetContactField.tsx`

Solo para `type === 'owner'`, ampliar `fetchOptions` para:

1. Hacer query a `profiles` donde `roles @> '{management}'` (todos los usuarios con rol management en el workspace)
2. Hacer query a `artist_role_bindings` para el `artistId` para obtener usuarios con roles de manager asignados específicamente a este artista
3. Combinar ambas listas, eliminando duplicados, y marcarlos como `source: 'interno'`
4. Seguir buscando contactos externos con `category = 'management'` vinculados al artista, marcados como `source: 'externo'`
5. Mostrar en la UI dos secciones: "Equipo interno" y "Contactos management"

El valor guardado seguirá siendo el UUID del contacto (para externos) o un identificador de perfil (para internos). Se necesitará guardar también el `name` en el metadata del presupuesto para mostrar correctamente en la vista sin ambigüedad.

### Estructura de opciones ampliada

```text
interface OwnerOption {
  id: string;          // contact.id o profile.user_id
  name: string;
  source: 'interno' | 'externo';
  avatarUrl?: string;
}
```

La UI mostrará:
- Sección "Equipo de management" → perfiles internos (con badge "interno")  
- Sección "Contactos externos" → contacts con category=management (con badge "externo")

### Dato guardado en el presupuesto

En `metadata` del presupuesto se guardará:
```json
{
  "owner_id": "uuid",
  "owner_name": "David Solans Cortes",
  "owner_source": "interno"
}
```

Esto evita depender del tipo de ID (contact vs profile) para mostrar el nombre en pantalla.

### Sin cambios en base de datos

Se reutilizan tablas existentes: `profiles`, `artist_role_bindings`, `contacts`, `contact_artist_assignments`.
