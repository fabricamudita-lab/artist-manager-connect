

## Hacer que la sección de presupuestos respete el modo de vista (filas/grid)

### Problema

`DriveBudgetsSection` siempre muestra los presupuestos como tarjetas en grid, ignorando el toggle grid/list de Carpetas.

### Cambios

**1. `DriveBudgetsSection.tsx` — Aceptar prop `viewMode`**

- Añadir prop `viewMode: 'grid' | 'list'` con default `'grid'`
- En modo `grid`: mantener el layout actual de tarjetas
- En modo `list`: renderizar como tabla/filas dentro de un `Card` con `divide-y`, mostrando icono + nombre + tipo + estado + fee en una sola fila horizontal (consistente con cómo se muestran los archivos en modo lista)

**2. `Carpetas.tsx` — Pasar `viewMode` al componente**

- Cambiar la línea 952: `<DriveBudgetsSection artistId={selectedArtist.id} viewMode={viewMode} />`

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/drive/DriveBudgetsSection.tsx` | Añadir prop `viewMode` y renderizado condicional lista/grid |
| `src/pages/Carpetas.tsx` | Pasar `viewMode` como prop |

