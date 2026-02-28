
## Ocultar releases archivados por defecto

Cambio simple: cuando el filtro de estado es "all" (por defecto), se excluyen los releases con status `archived`. Solo se muestran si el usuario selecciona explicitamente "Archivado" en el filtro de estado.

### Cambio tecnico

**Archivo**: `src/hooks/useReleasesSearch.ts`

En la query de Supabase (~linea 21), cuando `filters.status` es `'all'`, se anadira un filtro `.neq('status', 'archived')` para excluir archivados. Si el status es `'archived'`, se filtra normalmente con `.eq('status', 'archived')`. Cualquier otro valor sigue igual.

```
// Antes:
if (filters.status && filters.status !== 'all') {
  query = query.eq('status', filters.status);
}

// Despues:
if (filters.status === 'all') {
  query = query.neq('status', 'archived');
} else if (filters.status) {
  query = query.eq('status', filters.status);
}
```

Un solo archivo, 3 lineas cambiadas.
