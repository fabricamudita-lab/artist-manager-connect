

## Mejorar la presentación del Label Copy en Solicitudes

### Problema
El resumen del Label Copy se guarda como texto plano en `observaciones` y se muestra como un bloque de texto corrido ilegible. Necesita estructura visual clara por canción con créditos organizados.

### Solución — 2 cambios

**1. Guardar el resumen como JSON estructurado** — `ReleaseCreditos.tsx`

En vez de guardar texto plano en `observaciones`, guardar un JSON en `descripcion_libre` (o en `observaciones` con un prefijo `JSON:`) que contenga la estructura:

```json
{
  "type": "label_copy",
  "release": { "title": "...", "artist": "...", "type": "ep", "upc": "..." },
  "tracks": [
    {
      "number": 1,
      "title": "Amor constante...",
      "isrc": "...",
      "credits": [
        { "role": "Letrista", "name": "Francisco de Quevedo" },
        { "role": "Compositor", "name": "Alejandro Estruch" }
      ]
    }
  ]
}
```

Se guardará como string JSON en `observaciones` con un prefijo identificador (ej. `<!--LABEL_COPY_JSON-->`) para poder detectarlo y renderizarlo de forma especial.

**2. Renderizar el Label Copy con formato visual** — `SolicitudDetailsDialog.tsx`

En la sección de "Observaciones y Notas", detectar si `observaciones` contiene el prefijo JSON de Label Copy. Si es así, parsear el JSON y renderizar:

- Header con título del release, artista, tipo y UPC
- Lista de tracks como cards individuales con:
  - Número + título + badge ISRC
  - Créditos agrupados por rol en columnas o lista ordenada
  - Cada rol con su badge de color

Si NO contiene el prefijo (solicitudes antiguas), mostrar el texto plano como hasta ahora (retrocompatibilidad).

### Archivos
- `src/pages/release-sections/ReleaseCreditos.tsx` — cambiar generación del resumen a JSON
- `src/components/SolicitudDetailsDialog.tsx` — añadir renderizado visual del Label Copy

