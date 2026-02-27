

## Tres correcciones en el Wizard de Cronograma

### 1. Cerrar dropdown de tipo de video al seleccionar

El Popover del selector de video (lineas 259-299) no es controlado, por lo que no se cierra al hacer clic en una opcion. Se convertira en un Popover controlado con estado `videoPopoverOpen` y se cerrara en el `onClick` de cada opcion.

**Archivo**: `src/components/releases/CronogramaSetupWizard.tsx`
- Anadir estado `videoPopoverOpen` en `SingleRowEditor`
- Pasar `open` y `onOpenChange` al Popover del video
- En el `onClick` de cada opcion, cerrar el popover tras actualizar el valor

### 2. Calendario abre en el mes de la fecha seleccionada

Actualmente el calendario no recibe `defaultMonth`, por lo que siempre abre en el mes actual aunque la fecha seleccionada sea de otro mes. Se anadira la prop `defaultMonth={row.date}` al componente `Calendar` dentro de la fila de cada single (linea 249). Lo mismo aplica a los calendarios del paso 1 (release date y physical date).

**Archivo**: `src/components/releases/CronogramaSetupWizard.tsx`
- En el Calendar del single (linea 249): anadir `defaultMonth={row.date}`
- En el Calendar de release date (linea 440): anadir `defaultMonth={releaseDate}`
- En el Calendar de physical date (linea 462): anadir `defaultMonth={physicalDate}`

### 3. Territorio Principal como selector multiple

Cambiar de `Select` (seleccion unica) a un sistema de checkboxes/badges que permita seleccionar multiples territorios. El estado `territory` pasara de `string` a `string[]`.

**Archivo**: `src/components/releases/CronogramaSetupWizard.tsx`
- Cambiar estado `territory` de `string` a `string[]` (inicializado como `[]`)
- Reemplazar el componente `Select` por un Popover con checkboxes para cada territorio
- Mostrar los territorios seleccionados como badges en el boton trigger
- Actualizar `handleGenerate` para pasar `territory` como `string[]` (o join con coma para compatibilidad)

**Archivo**: `src/lib/releaseTimelineTemplates.ts`
- Cambiar el tipo de `territory` en `ReleaseConfig` de `string` a `string[]` (si existe como tipado)

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/releases/CronogramaSetupWizard.tsx` | Popover controlado para video, defaultMonth en calendarios, territorio multiple |
| `src/lib/releaseTimelineTemplates.ts` | Actualizar tipo de territory a `string[]` si aplica |

