

# Fix: Error "MPEGMode is not defined" en lamejs

## Problema

La libreria `lamejs@1.2.1` tiene un bug conocido con bundlers modernos como Vite: las variables globales internas (como `MPEGMode`) no se exportan correctamente en modo ESM, causando un `ReferenceError` al crear el `Mp3Encoder`.

## Solucion

Reemplazar `lamejs` por `@breezystack/lamejs`, un fork mantenido que:
- Corrige el bug de `MPEGMode is not defined`
- Incluye declaraciones TypeScript nativas (no necesitamos `src/types/lamejs.d.ts`)
- Es compatible con Vite/ESM

## Cambios

| Archivo | Accion |
|---|---|
| `package.json` | Reemplazar `lamejs` por `@breezystack/lamejs` |
| `src/types/lamejs.d.ts` | Eliminar (el fork incluye sus propios tipos) |
| `src/utils/audioConverter.ts` | Cambiar el import de `lamejs` a `@breezystack/lamejs` |

### Detalle de cambios

1. **package.json**: Quitar `lamejs` y `@types/lamejs`, anadir `@breezystack/lamejs`
2. **audioConverter.ts**: Linea 1 cambia de `import lamejs from 'lamejs'` a `import { Mp3Encoder } from '@breezystack/lamejs'` y ajustar la linea del encoder a `new Mp3Encoder(...)` en vez de `new lamejs.Mp3Encoder(...)`
3. **lamejs.d.ts**: Eliminar el archivo de tipos manual ya que el fork trae los suyos

