
# Filtrar formatos por artista del presupuesto

## El problema

En `BudgetDetailsDialog.tsx`, la función `fetchAvailableFormats` (línea 935) carga **todos** los formatos activos de **todos los artistas** del roster. En la captura se ve "Cuarteto" y "Duo" de Vic Mirallas apareciendo en un presupuesto de PLAYGRXVND (Klaus Stroink), lo cual no tiene sentido.

## La solución

Un cambio de una sola línea: añadir `.eq('artist_id', budget.artist_id)` al query de Supabase para que solo se carguen los formatos del artista vinculado al presupuesto actual.

## Cambio técnico

**Archivo:** `src/components/BudgetDetailsDialog.tsx`

**Línea actual (~948):**
```ts
.eq('is_active', true)
.order('name');
```

**Línea modificada:**
```ts
.eq('is_active', true)
.eq('artist_id', budget.artist_id)
.order('name');
```

Esto filtra en la base de datos directamente, sin cambios de estado ni lógica adicional.

## Caso borde: presupuesto sin artista

Si `budget.artist_id` es `null` (presupuesto genérico sin artista asignado), el query devolverá 0 resultados, lo que es el comportamiento correcto ya que no hay un artista específico del que cargar formatos. El empty state existente ya maneja esto mostrando "No hay formatos disponibles".

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/BudgetDetailsDialog.tsx` | Añadir `.eq('artist_id', budget.artist_id)` en `fetchAvailableFormats` |

Un cambio mínimo, quirúrgico, sin efectos secundarios.
