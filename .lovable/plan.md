

## Fix: Input pierde foco al escribir en ArtistInfoDialog

### Problema
`Field` y `TextareaField` están definidos como componentes inline dentro de `ArtistInfoDialog` (líneas 263-287). Cada cambio en `formData` re-renderiza el componente padre, lo que recrea las definiciones de `Field`/`TextareaField`. React interpreta esto como componentes nuevos, desmonta los anteriores y monta nuevos — el input pierde el foco.

### Solución
Extraer `Field` y `TextareaField` fuera de `ArtistInfoDialog` como componentes independientes con props explícitas (`editing`, `formData`, `artistData`, `onChange`). Al ser referencias estables, React los reconcilia correctamente y no pierde el foco.

### Archivo afectado
`src/components/ArtistInfoDialog.tsx` — mover las definiciones de `Field` (línea 263) y `TextareaField` (línea 276) fuera del cuerpo de `ArtistInfoDialog`, pasando como props: `editing`, `value`, `displayValue`, `onChange`, `label`, `icon`, `placeholder`.

Cambio localizado, sin migraciones ni nuevos archivos.

