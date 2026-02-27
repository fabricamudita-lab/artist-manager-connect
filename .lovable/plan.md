

## Cambiar "Importar desde Spotify" a "Importar desde plataforma"

### Concepto

Reemplazar el boton directo de Spotify por un flujo de dos pasos: primero el usuario elige la fuente de importacion, y luego se abre el flujo correspondiente. La pantalla inicial del drawer mostrara una cuadricula de plataformas organizadas en dos categorias.

### Pantalla inicial del drawer

```text
Importar discografia
Selecciona la fuente de datos

-- PLATAFORMAS DE DISTRIBUCION --
[Spotify]  [Ditto]  [Altafonte]  [The Orchard]
[Sony Music]  [DistroKid]  [TuneCore]  [CD Baby]

-- BASES DE DATOS DE DERECHOS --
[SGAE]  [AIE]  [AGEDI]  [BMAT]
[SoundExchange]  [ASCAP/BMI]

Cada tarjeta con icono/logo, nombre, y estado:
- "Disponible" (Spotify, que ya esta implementado)
- "Proximamente" (el resto, deshabilitado pero visible)
```

Al seleccionar Spotify se pasa directamente al flujo actual (URL + artista + seleccion + importacion). Las demas plataformas aparecen con badge "Proximamente" y deshabilitadas.

### Cambios tecnicos

#### 1. Renombrar y reestructurar `ImportSpotifyDialog.tsx` a `ImportPlatformDialog.tsx`

- Anadir un paso previo `'platform'` al tipo `Step`: `'platform' | 'input' | 'select' | 'importing' | 'done' | 'credentials-missing'`
- La pantalla `'platform'` muestra la cuadricula de fuentes
- Al elegir Spotify se pasa al paso `'input'` (el flujo actual sin cambios)
- Definir un array de plataformas con: `id`, `name`, `category` ('distribucion' | 'derechos'), `icon` (componente lucide o emoji), `available` (boolean), `description`
- El estado inicial del step pasa a ser `'platform'` en vez de `'input'`
- El titulo del drawer cambia a "Importar discografia" en el paso platform, y "Importar desde Spotify" cuando se entra al flujo de Spotify
- El boton "Volver" en el paso `'input'` regresa al paso `'platform'`

#### 2. Actualizar `Releases.tsx`

- Cambiar texto del boton de "Importar desde Spotify" a "Importar desde plataforma"
- Cambiar el icono de `Sparkles` a `Download` o `Import`
- Renombrar la referencia del componente

#### 3. Plataformas incluidas

**Distribucion:**
| Plataforma | Estado | Descripcion corta |
|---|---|---|
| Spotify | Disponible | Importa discografia publica via API |
| Ditto Music | Proximamente | Conecta tu cuenta de distribucion |
| Altafonte | Proximamente | Importa catalogo distribuido |
| The Orchard | Proximamente | Catalogo Sony/Orchard |
| DistroKid | Proximamente | Importa desde tu cuenta |
| TuneCore | Proximamente | Catalogo TuneCore |
| CD Baby | Proximamente | Catalogo CD Baby |

**Bases de datos de derechos:**
| Fuente | Estado | Descripcion corta |
|---|---|---|
| SGAE | Proximamente | Obras registradas en SGAE |
| AIE | Proximamente | Derechos de interpretes |
| AGEDI | Proximamente | Derechos de productores |
| BMAT | Proximamente | Monitorizacion de derechos |
| SoundExchange | Proximamente | Royalties digitales USA |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/releases/ImportSpotifyDialog.tsx` | Renombrar a ImportPlatformDialog, anadir paso 'platform' con cuadricula de fuentes |
| `src/pages/Releases.tsx` | Actualizar texto del boton e importacion del componente |

### Diseno visual

- Cada plataforma es una tarjeta clickeable con borde redondeado
- Las disponibles tienen hover y cursor pointer
- Las "Proximamente" tienen opacity reducida y badge gris
- Las categorias se separan con un subtitulo en texto pequeno y gris
- Al hacer click en una disponible, transiciona al flujo de esa plataforma

