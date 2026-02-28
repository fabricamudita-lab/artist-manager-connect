

## Indicador de checklists multiples

Cuando haya mas de una checklist en el proyecto, se mostrara un badge numerico junto al nombre de la checklist activa en el boton selector. Esto sirve como recordatorio visual de que existen otras listas ademas de la que se esta viendo.

### Que se vera

El boton selector actual muestra: `[icono] General [v]`

Con el cambio, cuando haya 2+ listas mostrara: `[icono] General [2] [v]`

El badge sera un circulo pequeno con el numero total de checklists, usando el estilo de badge secundario existente (similar al que ya se usa en el Centro de Tareas).

### Cambio tecnico

**Archivo**: `src/components/ProjectChecklistManager.tsx`

En el boton `DropdownMenuTrigger` (~linea 1287-1291), se anadira un `Badge` condicional que solo aparece cuando `checklists.length > 1`, mostrando el total de listas. Algo como:

```
<Button variant="outline" size="sm" className="gap-1.5 font-semibold">
  <ListChecks className="w-4 h-4" />
  {activeChecklist?.name || 'Checklist'}
  {checklists.length > 1 && (
    <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1 text-[10px]">
      {checklists.length}
    </Badge>
  )}
  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
</Button>
```

Un solo archivo, una linea de cambio. Rapido y limpio.
