

## Presupuestos compartidos entre varios lanzamientos (Many-to-Many)

### Problema
Actualmente `budgets.release_id` es un campo singular: un presupuesto solo puede vincularse a un lanzamiento. Si dos EPs se grabaron el mismo día y comparten producción, hay que duplicar el presupuesto o elegir a cuál vincularlo.

### Solución
Crear una tabla puente `budget_release_links` para permitir relación muchos-a-muchos entre presupuestos y lanzamientos. Mantener `release_id` como vínculo primario por compatibilidad, y usar la tabla puente para vínculos adicionales.

### Cambios

**1. Migración de base de datos**
- Crear tabla `budget_release_links`:
  ```sql
  CREATE TABLE public.budget_release_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id uuid REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(budget_id, release_id)
  );
  ```
- RLS: authenticated users can manage.
- Migrar datos existentes: insertar un registro en `budget_release_links` por cada `budgets.release_id` que no sea null.

**2. Modificar `ReleasePresupuestos.tsx` (query de presupuestos vinculados)**
- Cambiar `fetchLinkedBudgets` para buscar presupuestos tanto por `release_id = id` como por la tabla puente `budget_release_links`.
- Usar dos queries y combinar resultados (deduplicados por `budget_id`).

**3. Modificar `CreateReleaseBudgetDialog.tsx` (al crear presupuesto)**
- Añadir opción "Vincular presupuesto existente de otro lanzamiento" con un selector que muestre presupuestos del mismo artista tipo `produccion_musical`.
- Si se elige vincular uno existente, insertar en `budget_release_links` en vez de crear un nuevo presupuesto.

**4. Añadir opción de vincular presupuesto existente desde la vista de presupuestos del release**
- Botón "Vincular presupuesto existente" junto a "Nuevo presupuesto".
- Popover/Dialog que liste presupuestos del artista (tipo producción) con búsqueda.
- Al seleccionar, insertar en `budget_release_links`.
- Mostrar badge "Compartido" en presupuestos que aparezcan en más de un lanzamiento.

**5. Efecto espejo**
- No se necesita lógica especial: al ser el mismo registro en `budgets`, cualquier edición desde cualquier release se refleja automáticamente.
- Mostrar indicador visual "Compartido con: [EP X, EP Y]" en la cabecera del presupuesto cuando tenga múltiples releases vinculados.

### Flujo visual

```text
ReleasePresupuestos (EP "ChromatisM")
──────────────────────────────────────
[+ Nuevo presupuesto]  [🔗 Vincular existente]

┌─────────────────────────────────────────┐
│ Producción ChromatisM + NOX   [Compartido]│
│ €3.200   ● En curso                      │
│ 📎 También en: NOX                       │
└─────────────────────────────────────────┘

Click "Vincular existente":
┌──────────────────────────────────┐
│ Presupuestos de Klaus Stroink    │
│ 🔍 Buscar...                     │
│                                  │
│ ○ Prod. NOX (€2.800) - NOX      │
│ ○ Prod. Masters (€1.500) - sin   │
│                                  │
│ [Cancelar] [Vincular]            │
└──────────────────────────────────┘
```

### Archivos modificados
- Nueva migración SQL (tabla `budget_release_links`)
- `src/pages/release-sections/ReleasePresupuestos.tsx`
- `src/components/releases/CreateReleaseBudgetDialog.tsx`
- `src/components/BudgetDetailsDialog.tsx` (indicador "Compartido con")

