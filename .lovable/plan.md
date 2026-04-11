

## Mostrar presupuestos de lanzamientos en la vista del Proyecto

### Problema
Los presupuestos creados desde un lanzamiento (release) tienen `budgets.project_id = NULL`. Se vinculan al proyecto indirectamente a traves de `releases.project_id`. El componente `ProjectLinkedBudgets` solo busca `budgets.project_id = projectId`, por lo que nunca muestra estos presupuestos.

### Solucion
Ampliar la query en `ProjectLinkedBudgets` para incluir tambien los presupuestos cuyos releases pertenecen al proyecto.

### Cambio tecnico

**Archivo: `src/components/project-detail/ProjectLinkedBudgets.tsx`**

1. Primero, obtener los IDs de releases del proyecto:
```sql
SELECT id FROM releases WHERE project_id = :projectId
```

2. Luego, buscar presupuestos que cumplan cualquiera de estas condiciones:
   - `budgets.project_id = projectId` (vinculacion directa)
   - `budgets.release_id IN (releaseIds)` (vinculacion via release)
   - Presupuestos en `budget_release_links` que apunten a esos releases

3. Deduplicar resultados (un presupuesto podria aparecer por ambas vias).

4. Opcionalmente, mostrar un indicador sutil de donde viene cada presupuesto (ej: nombre del release asociado).

### Riesgos
- Ninguno. Es una query de lectura ampliada. No modifica datos ni afecta otros modulos.

### Archivo modificado
- `src/components/project-detail/ProjectLinkedBudgets.tsx`

