
# Plan: Mostrar etiquetas claras para Publishing y Master en Audio

## Problema Actual

En la pestaña "Derechos" del diálogo de créditos de Audio, ambos componentes `TrackRightsSplitsManager` muestran el nombre de la canción (ej: "roto") en lugar de mostrar claramente:
- **Derechos de Autor** (Publishing) - icono ámbar
- **Royalties Master** (Master) - icono azul

## Solución

Modificar el componente `TrackRightsSplitsManager` para mostrar un título descriptivo que indique el tipo de derecho:

| Tipo | Etiqueta actual | Nueva etiqueta |
|------|-----------------|----------------|
| `publishing` | (título de la canción) | **Derechos de Autor** |
| `master` | (título de la canción) | **Royalties Master** |

## Cambios Técnicos

### Archivo: `src/components/releases/TrackRightsSplitsManager.tsx`

Modificar líneas 127-130 para reemplazar el título del track por una etiqueta descriptiva del tipo de derecho:

```typescript
// Antes (línea 128):
<p className="font-medium text-sm">{track.title}</p>

// Después:
<p className="font-medium text-sm">
  {type === 'publishing' ? 'Derechos de Autor' : 'Royalties Master'}
</p>
```

## Resultado Visual Esperado

En la pestaña "Derechos" del diálogo de Audio:

```text
┌─────────────────────────────────────────────────┐
│ Derechos                                        │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ 📄 Derechos de Autor           [0%] [v]   │   │
│ │    0 participantes                        │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ 🎵 Royalties Master         [100%] [v]    │   │
│ │    2 participantes                        │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/releases/TrackRightsSplitsManager.tsx` | Cambiar título de `track.title` a etiqueta descriptiva del tipo |
