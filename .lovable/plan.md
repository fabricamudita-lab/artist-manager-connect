

## Plan: Auto-detectar y bloquear el tipo de licencia IP según el lanzamiento

### Contexto

En `IPLicenseGenerator.tsx` ya existe el estado `recordingType` (`single` | `album`) y un selector manual en el Step 0. Cuando se accede desde un lanzamiento (ruta `/releases/:id/contratos`), el `release.type` (`single`, `ep`, `album`) ya está disponible. Mapeo natural:
- `single` → `single`
- `ep` / `album` → `album`

Hay que:
1. Pre-seleccionar `recordingType` según `release.type` cuando hay release de contexto.
2. Bloquear el selector (disabled) para que no se pueda elegir otro tipo incompatible.
3. Mostrar un texto informativo explicando que el tipo viene determinado por el lanzamiento.

### Exploración pendiente

Necesito ver `IPLicenseGenerator.tsx` para confirmar:
- Cómo recibe el release (prop `releaseId`, `release`, o lookup interno).
- Dónde está el `Select` de `recordingType` en el Step 0.
- Si ya existe el `useEffect` de auto-detección (lo mencionaba la memoria) — si existe, reforzarlo + añadir el `disabled`.

### Cambios previstos

| Archivo | Cambio |
|---|---|
| `src/components/IPLicenseGenerator.tsx` | (a) En el `useEffect` que se dispara al cargar release, setear `recordingType` derivado de `release.type`. (b) Pasar `disabled` al `<SelectTrigger>` del tipo cuando hay release vinculado. (c) Añadir `<p>` con texto: "Tipo determinado por el lanzamiento seleccionado". |

### Comportamiento resultante

- **Desde un lanzamiento** (`/releases/:id/contratos`): el tipo se fija automáticamente y no se puede cambiar.
- **Desde Documentos generales** (sin release): el selector sigue siendo editable como hasta ahora.

### Memoria

Actualizar `mem://contracts/ip-license-generator` para añadir: "El tipo (single/album) se autodetecta y bloquea cuando el contrato se crea desde un lanzamiento (release.type → recordingType)."

