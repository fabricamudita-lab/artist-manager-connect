

## Rediseñar "Artistas para Distribución" con campos separados y búsqueda

### Problema actual
El componente lista todas las personas creditadas con un dropdown cada una. El usuario quiere un diseño con dos campos separados: **Main Artist** y **Featuring**, cada uno con un desplegable buscable donde seleccionar entre los nombres de los créditos.

### Nuevo diseño

```text
┌─ Artistas para Distribución ─────────────────┐
│                                               │
│  Main Artist                                  │
│  ┌─────────────────────────────────────┐      │
│  │ 🔍 Buscar...                  ▾     │      │
│  │  ☑ Vicente López                    │      │
│  │  ☐ Tramel Levantine                 │      │
│  │  ☐ Leyre                            │      │
│  └─────────────────────────────────────┘      │
│  [Vicente López] [x]                          │
│                                               │
│  Featuring                                    │
│  ┌─────────────────────────────────────┐      │
│  │ 🔍 Buscar...                  ▾     │      │
│  └─────────────────────────────────────┘      │
│                                               │
│  Vista: Vicente López                         │
└───────────────────────────────────────────────┘
```

### Cambios

**`src/components/releases/CreditedArtistRoles.tsx`** — reescribir la UI:

1. **Dos secciones**: "Main Artist" y "Featuring", cada una con un Popover + Command (searchable combobox) que lista los nombres de `creditedPeople`
2. **Multi-selección**: Cada combobox permite seleccionar varios nombres. Los seleccionados aparecen como badges debajo con botón de eliminar
3. **Filtrado cruzado**: Un nombre asignado como Main no aparece en la lista de Featuring y viceversa
4. **Lógica existente**: Reutilizar `handleRoleChange` — al seleccionar un nombre se llama con `'main'` o `'featuring'`, al deseleccionar con `'none'`
5. **Usar `Command`/`CommandInput`/`CommandItem`** del proyecto (cmdk) para la búsqueda, dentro de un `Popover` — mismo patrón que `ArtistSelector.tsx`

### Componentes utilizados
- `Popover` + `Command` + `CommandInput` + `CommandList` + `CommandItem` (patrón existente en `ArtistSelector.tsx`)
- `Badge` con botón X para los seleccionados
- `Label` para los encabezados "Main Artist" y "Featuring"

Un solo archivo modificado: `CreditedArtistRoles.tsx`

