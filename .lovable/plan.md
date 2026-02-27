

## Mejoras en el Paso 2 del Wizard: Videoclips, Focus Track y 6+ personalizable

### 1. Input numerico para "6+"

Actualmente al pulsar "6+" se fija `numSongs = 6`. En su lugar, al pulsar "6+" se mostrara un campo `Input` numerico (type="number", min=6) que permite escribir el numero exacto de canciones. Los botones 1-5 siguen funcionando igual.

**Archivo**: `src/components/releases/CronogramaSetupWizard.tsx`
- Anadir estado `showCustomSongs: boolean` (se activa al pulsar "6+")
- Cuando `showCustomSongs` es true, mostrar un `Input` numerico al lado del boton "6+" activo
- El boton "6+" queda visualmente activo mientras el input esta visible
- Al pulsar cualquier boton 1-5, se desactiva `showCustomSongs`

### 2. Toggle de videoclip por single

Cada fila de single (`SingleRowEditor`) tendra un toggle/switch adicional "Con videoclip" que indica si ese single va acompanado de un videoclip.

**Cambios**:
- Ampliar `SingleRow` con campo `hasVideo: boolean`
- En `SingleRowEditor`, anadir un pequeno toggle con icono de Video junto a la fecha opcional
- Ampliar `SingleConfig` en `releaseTimelineTemplates.ts` con `hasVideo?: boolean`
- Pasar el valor al `handleGenerate`

### 3. Selector de Focus Track

Para albums y EPs (cuando `numSongs >= 3`), mostrar un selector de "Focus Track" -- la cancion principal que recibira mas atencion promocional. Se muestra como un combobox que lista los tracks del release.

**Cambios**:
- Anadir estado `focusTrackId: string | undefined` en el wizard principal
- Mostrar el selector solo cuando `numSongs >= 3` (albums/EPs)
- Usar el mismo combobox de tracks (con opcion de crear) reutilizando el patron de `SingleRowEditor`
- Ampliar `ReleaseConfig` con `focusTrackId?: string`
- Pasar el valor al `handleGenerate`

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/releases/CronogramaSetupWizard.tsx` | Input numerico para 6+, toggle videoclip en singles, selector focus track |
| `src/lib/releaseTimelineTemplates.ts` | Anadir `hasVideo?: boolean` a `SingleConfig` y `focusTrackId?: string` a `ReleaseConfig` |

### Detalle de UI del Paso 2 resultante

```text
[Numero de canciones]
  [1] [2] [3] [4] [5] [6+] [___input___]

[Focus Track (solo si >= 3 canciones)]
  Combobox: "Seleccionar focus track..."

[Singles a lanzar antes del album]
  [0] [1] [2] [3] ...

[Configurar Singles]
  1. [Vincular a cancion...] [Con videoclip toggle] [Fecha opcional]
  2. [Vincular a cancion...] [Con videoclip toggle] [Fecha opcional]
```

### Lo que NO cambia
- La logica de generacion de tareas
- Los IDs, estimatedDays, orden de workflows
- La funcionalidad de crear tracks desde el combobox
- Los pasos 1 y 3 del wizard

