

## Fix: "Vinculado a" muestra release en vez de proyecto

### Problema
El presupuesto "Presupuesto - ChromatisM + Nox + Hobba" tiene ambos vínculos:
- `project_id` → PLAYGRXVND (proyecto)
- `release_id` → ChromatisM (lanzamiento)

La función `getVinculacion` (línea 144) prioriza el release sobre el proyecto, mostrando "ChromatisM" cuando el usuario espera ver "PLAYGRXVND". Además, el dropdown de edición inline solo controla `project_id`, así que hay una inconsistencia visual.

### Solución
Cambiar la prioridad en `getVinculacion` para mostrar el **proyecto** primero (ya que es el contenedor principal). Si no tiene proyecto, mostrar el release como fallback.

### Cambio (1 archivo, 2 líneas)

**`src/pages/Budgets.tsx`**, líneas 144-148:

```typescript
function getVinculacion(budget: Budget): { label: string; type: 'release' | 'project' } | null {
  if (budget.projects?.name) return { label: budget.projects.name, type: 'project' };
  if (budget.releases?.title) return { label: budget.releases.title, type: 'release' };
  return null;
}
```

Se invierte el orden: proyecto primero, release después. Así "Vinculado a" será coherente con lo que controla el dropdown de edición.

