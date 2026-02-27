

## Reemplazar toggle de videoclip por selector de tipo de video

### Problema actual
El toggle de videoclip es un simple booleano (si/no). En la realidad, un single puede ir acompanado de distintos tipos de contenido audiovisual, cada uno con procesos de produccion muy diferentes:
- **Videoclip**: Pre-produccion, rodaje, edicion (proceso largo y costoso)
- **Visualiser**: Animacion sobre el audio, mas rapido de producir
- **Videolyric**: Video con letras animadas, el mas sencillo

### Cambios

**1. `src/lib/releaseTimelineTemplates.ts`**

- Crear tipo `VideoType = 'none' | 'videoclip' | 'visualiser' | 'videolyric'`
- Cambiar `hasVideo?: boolean` en `SingleConfig` por `videoType?: VideoType`
- Mantener `hasVideo: boolean` en `ReleaseConfig` (el toggle global del paso 1) pero tambien aceptar el tipo por single
- Anadir templates de tareas condicionales para visualiser y videolyric (mas cortos que videoclip):
  - Visualiser: Briefing creativo (3d), Produccion (7d), Entrega (2d)
  - Videolyric: Briefing + letra (2d), Produccion (5d), Entrega (1d)

**2. `src/components/releases/CronogramaSetupWizard.tsx`**

- Cambiar `hasVideo: boolean` en `SingleRow` por `videoType: VideoType`
- Reemplazar el boton toggle actual por un mini-selector con 4 opciones (popover o dropdown):
  - Sin video (icono tachado, estado por defecto)
  - Videoclip (icono camara)
  - Visualiser (icono ondas/sparkles)
  - Videolyric (icono texto/captions)
- El boton muestra el tipo seleccionado con color e icono correspondiente
- Actualizar `handleGenerate` para pasar `videoType` en vez de `hasVideo` en cada single

### UI del selector por single

```text
Single 1: [Vincular cancion...] [Videoclip v] [Fecha]
                                      |
                                  Dropdown:
                                  - Sin video
                                  - Videoclip
                                  - Visualiser
                                  - Videolyric
```

Cada opcion tendra un icono y color distintos:
- Sin video: gris, icono VideoOff
- Videoclip: verde, icono Video (como el actual)
- Visualiser: purpura, icono Sparkles
- Videolyric: azul, icono Captions

### Templates de tareas por tipo de video

| Tipo | Tareas generadas | Dias totales |
|---|---|---|
| Videoclip | Pre-produccion (7d) + Rodaje (3d) + Edicion (14d) + Entrega (2d) | ~26d |
| Visualiser | Briefing creativo (3d) + Produccion (7d) + Entrega (2d) | ~12d |
| Videolyric | Briefing + letra (2d) + Produccion (5d) + Entrega (1d) | ~8d |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/releaseTimelineTemplates.ts` | Nuevo tipo `VideoType`, actualizar `SingleConfig`, anadir templates de tareas para visualiser y videolyric |
| `src/components/releases/CronogramaSetupWizard.tsx` | Reemplazar toggle por dropdown de tipo de video en cada fila de single |

### Lo que NO cambia
- El toggle global "Incluir videoclip" del paso 1 (aplica al release en general)
- La logica de generacion de tareas base
- Los pasos 1 y 3 del wizard
- La vinculacion de tracks y focus track

