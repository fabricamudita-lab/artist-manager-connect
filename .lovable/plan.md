
# Plan: Unificar Créditos, Autoría y Royalties

## Contexto del Problema

Actualmente existe confusión y desincronización entre tres conceptos relacionados:

1. **Créditos** (`ReleaseCreditos.tsx`) - Lista de todos los colaboradores de una canción
2. **Derechos de Autor / Publishing** (`ReleasePresupuestos.tsx`) - Porcentajes para compositores, letristas, editoriales  
3. **Royalties Master** (`ReleasePresupuestos.tsx`) - Porcentajes para productores, intérpretes, sello

El problema raíz es que ambas secciones escriben/leen de la misma tabla `track_credits`, pero:
- Créditos guarda roles capitalizados (`"Productor"`)
- Presupuestos busca roles en minúsculas (`"productor"`)
- Hay roles que no aparecen en ambos lados (ej: `"Vocalista"` no está en Créditos)

## Solución Propuesta

Establecer **una única fuente de verdad** (`track_credits`) con una **lista de roles unificada** que ambas secciones compartan.

### Arquitectura Final

```text
┌─────────────────────────────────────────────────────────────┐
│                      track_credits                           │
│   Tabla única con: name, role, percentage, contact_id        │
└─────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   CRÉDITOS     │   │  DERECHOS AUTOR │   │ ROYALTIES MASTER│
│ (Todos)        │   │  (Publishing)   │   │   (Fonograma)   │
│                │   │ compositor      │   │ productor       │
│ Muestra todos  │   │ letrista        │   │ interprete      │
│ los créditos   │   │ co-autor        │   │ vocalista       │
│ con/sin %      │   │ arreglista      │   │ featured        │
│                │   │ editorial       │   │ sello           │
│                │   │                 │   │ mezclador       │
│                │   │ (Solo con %)    │   │ masterizador    │
│                │   │                 │   │                 │
│                │   │ (Solo con %)    │   │ (Solo con %)    │
└────────────────┘   └─────────────────┘   └─────────────────┘
```

## Cambios Técnicos

### 1. Crear constantes compartidas de roles

Crear un nuevo archivo `src/lib/creditRoles.ts` con:

- Lista unificada de roles con `value` (lowercase) y `label` (display)
- Clasificación en categorías: `publishing` vs `master`
- Función helper para obtener el label de un role

### 2. Actualizar ReleaseCreditos.tsx

- Importar roles desde el archivo compartido
- Cambiar el formato de roles de strings simples a `{value, label}`
- Guardar roles en minúsculas con el `value`
- Mostrar el `label` en la UI
- Añadir badge visual indicando si el crédito es "Autoría" o "Master" según su rol

### 3. Actualizar ReleasePresupuestos.tsx  

- Importar roles desde el archivo compartido
- Eliminar la definición duplicada de `CREDIT_ROLES`
- Asegurar consistencia en el filtrado

### 4. Actualizar TrackRightsSplitsManager.tsx

- Importar roles desde el archivo compartido
- Simplificar la lógica de filtrado usando las categorías predefinidas
- Mostrar en cada crédito si está "vinculado" (tiene contact_id)

### 5. Normalización de datos existentes (Migración)

Crear una migración SQL para normalizar los roles existentes a minúsculas:

```sql
UPDATE track_credits 
SET role = LOWER(role) 
WHERE role != LOWER(role);
```

## Flujo de Usuario Final

1. **En Créditos**: Usuario añade colaboradores con sus roles. Puede asignar porcentaje opcional.
2. **En Presupuestos > Derechos de Autor**: Se muestran automáticamente los créditos con roles de autoría (compositor, letrista, etc.) que tengan porcentaje. Usuario puede editar porcentajes.
3. **En Presupuestos > Royalties Master**: Se muestran automáticamente los créditos con roles de master (productor, intérprete, etc.) que tengan porcentaje. Usuario puede editar porcentajes.

Cualquier edición en una sección se refleja instantáneamente en las otras (son la misma data).

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/creditRoles.ts` | **Crear** - Constantes compartidas de roles |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Usar roles compartidos, guardar en lowercase |
| `src/pages/release-sections/ReleasePresupuestos.tsx` | Usar roles compartidos, eliminar duplicados |
| `src/components/releases/TrackRightsSplitsManager.tsx` | Usar roles compartidos |
| Migración SQL | Normalizar roles existentes a lowercase |

## Mejoras UX Adicionales

- En la sección de Créditos, añadir un indicador visual (badge de color) que muestre si el crédito es de tipo "Autoría" (ámbar) o "Master" (azul)
- Mostrar el porcentaje directamente en la lista de créditos si existe
- Añadir tooltip explicando qué significa cada categoría
