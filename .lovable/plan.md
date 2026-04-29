
## Problema

Al ensanchar el panel lateral de comentarios del contrato arrastrando la barra, la UI no aprovecha el espacio extra:

- La cita del texto seleccionado (amarillo) está truncada a **120 caracteres** sin importar el ancho (`DraftCommentsSidebar.tsx` línea 224). Si el comentario es sobre un párrafo entero, sólo se ve el inicio + "…".
- A partir de 520px, el panel pasa a **2 columnas** (`wideMode`, líneas 149/379/386). Eso reparte el contenido en columnas estrechas en vez de dar más ancho de lectura — exactamente lo contrario a lo que se pide.
- La tipografía y padding son fijos (`text-sm`, `text-xs`, `p-3`), así que el modo amplio no resulta más cómodo de leer.

## Solución

Hacer la UI realmente adaptativa al `sidebarWidth`, dando más texto y mejor lectura cuanto más ancho:

### 1. Sustituir `wideMode` por una escala de breakpoints internos

```ts
const isRoomy  = sidebarWidth >= 480;  // > móvil estándar
const isWide   = sidebarWidth >= 640;  // ya hay sitio cómodo
const isXWide  = sidebarWidth >= 820;  // panel "lectura"
```

### 2. Truncado adaptativo del `selected_text`

Reemplazar el `> 120` fijo por un límite dinámico:

```ts
const excerptLimit = isXWide ? 800 : isWide ? 480 : isRoomy ? 280 : 120;
```

Aplicar en línea 224 y, mientras estamos, mostrar el texto en un bloque con `whitespace-pre-wrap` y altura máxima con scroll suave (`max-h-40 overflow-auto`) para los casos extremos en que el párrafo siga siendo muy largo.

### 3. Quitar el layout en columnas y dejar tarjetas a ancho completo

En las dos llamadas a `wideMode ? 'columns-2 gap-3 space-y-3' : 'space-y-3'` (líneas 379 y 386), usar siempre `space-y-3` (una sola columna). El usuario quiere "leer más cantidad de texto", no más tarjetas a la vez. Como ahora todo va en una columna, también elimino la clase `break-inside-avoid` de la tarjeta.

### 4. Padding y tamaño de texto adaptativos

En `renderCommentCard`:
- Padding: `p-3` por defecto, `p-4` cuando `isWide`.
- Mensaje principal (`p.text-sm mt-0.5`, línea 233): `text-sm` por defecto, `text-base leading-relaxed` cuando `isWide` y mantener `whitespace-pre-wrap` para respetar saltos de línea de párrafos largos.
- Cita amarilla (`text-xs`): `text-sm` cuando `isRoomy`.

### 5. Limpiar la prop `wideMode`

Sustituir todos los usos por los nuevos breakpoints (`isRoomy`/`isWide`/`isXWide`).

## Archivo a modificar

- `src/components/contract-drafts/DraftCommentsSidebar.tsx` (líneas 149, 200-234, 379, 386).

Sin cambios de DB, props ni en `ContractDraftView` (`sidebarWidth` ya se está pasando correctamente).

## Resultado

- Panel angosto (~360 px): igual que ahora.
- Panel medio (~480-640 px): cita ampliada a 280-480 caracteres, texto del comentario más legible.
- Panel ancho/extra-ancho (≥640/820 px): cita casi completa (hasta 800 caracteres) con scroll si excede, tipografía mayor y tarjetas a todo el ancho — ideal para revisar párrafos enteros.
