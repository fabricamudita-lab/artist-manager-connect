
# Vincular presupuestos completos a lanzamientos (releases)

## Que se hara

Conectar el sistema completo de presupuestos (`budgets` + `budget_items`) con los lanzamientos, permitiendo crear y gestionar presupuestos desde la seccion de Presupuestos de un release. Esto reemplaza la vista actual de partidas simples (`release_budgets`) con el sistema completo que ya se usa en los eventos de booking.

## Cambios en base de datos

1. **Agregar columna `release_id` a la tabla `budgets`**: referencia opcional a `releases(id)` con `ON DELETE SET NULL`, para vincular un presupuesto al disco.

## Cambios en el frontend

### 1. Actualizar `ReleasePresupuestos.tsx` (tab "Costes de Produccion")

- Reemplazar la logica actual que usa `release_budgets` por una nueva que consulte `budgets` filtrando por `release_id`.
- Mostrar una lista/tabla de presupuestos vinculados al release, cada uno con su nombre y totales.
- Boton "Nuevo Presupuesto" que abre `CreateBudgetDialog` preconfigurado con:
  - `type = 'produccion_musical'`
  - `release_id` ya asignado
  - `artist_id` heredado del release
  - Categorias por defecto para disco (produccion, mezcla, mastering, grabacion, musicos, arte, video, marketing, distribucion, legal)
- Al hacer clic en un presupuesto existente, abrir `BudgetDetailsDialog` con todo el sistema de partidas (budget_items), versiones, etc.
- Mantener las cards de resumen (Estimado, Real, Diferencia) sumando los totales de todos los budgets vinculados.
- Las tabs de "Derechos de Autor" y "Royalties Master" se mantienen sin cambios.

### 2. Actualizar `CreateBudgetDialog.tsx`

- Aceptar nuevo prop opcional `releaseId?: string`.
- Cuando se proporciona `releaseId`, guardar el valor en la columna `release_id` del nuevo presupuesto.
- Opcionalmente saltar el paso de seleccion de tipo (preseleccionar `produccion_musical`).

### 3. Actualizar `BudgetDetailsDialog.tsx`

- Sin cambios funcionales; solo asegurar que funcione correctamente cuando se abre desde el contexto de un release.

## Seccion tecnica

```text
-- Migracion SQL
ALTER TABLE budgets ADD COLUMN release_id uuid REFERENCES releases(id) ON DELETE SET NULL;
CREATE INDEX idx_budgets_release_id ON budgets(release_id);
```

- Hook nuevo o query inline en `ReleasePresupuestos.tsx`:
  `supabase.from('budgets').select('*').eq('release_id', releaseId)`
- Las partidas de la tabla `release_budgets` existente seguiran funcionando de forma paralela (no se elimina nada).
- El `CreateBudgetDialog` recibira `releaseId` y lo incluira en el INSERT.
