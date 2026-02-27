

## Deduplicar contactos en el selector de presupuestos

### Problema
Al crear "La Turbina" dos veces desde el formulario inline, ahora aparecen dos entradas identicas en la lista de contactos del selector. No hay control de duplicados ni al crear ni al mostrar.

### Solucion

**Archivo**: `src/components/BudgetContactSelector.tsx`

1. **Prevenir duplicados al crear**: Antes de insertar un nuevo contacto, buscar en la tabla `contacts` si ya existe uno con el mismo nombre (case-insensitive). Si existe, seleccionarlo directamente en vez de crear otro.

2. **Deduplicar la lista mostrada**: Como medida defensiva, filtrar contactos duplicados por nombre en la lista visible, manteniendo solo el primero de cada nombre. Esto cubre datos historicos que ya estan duplicados.

### Detalle tecnico

En `handleCreateContact`, antes del `insert`:
```typescript
const { data: existing } = await supabase
  .from("contacts")
  .select("id")
  .ilike("name", newName.trim())
  .limit(1)
  .maybeSingle();

if (existing) {
  onValueChange(existing.id);
  // cerrar sin crear
  return;
}
```

Para la lista visible, deduplicar por nombre al renderizar usando un `Set` de nombres ya mostrados, o mejor, deduplicar en el `useMemo` / despues del fetch con un filtro por nombre unico.

