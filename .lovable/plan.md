

## Plan: Añadir filtro de ordenación en Discografía

### Contexto
La página `/releases` tiene la toolbar `ReleasesFiltersToolbar` con filtros (búsqueda, estado, tipo, artista, avanzados). Falta un control de **ordenación**.

### Exploración pendiente
- Confirmar dónde se aplica el orden actual: probablemente en `src/pages/Releases.tsx` (o similar) sobre el array antes de renderizar.
- Verificar campos disponibles en `releases`: `title`, `release_date`, `created_at`, `updated_at`, `status`, `type`.

### Cambios

**1. `ReleasesFiltersToolbar.tsx`**
- Ampliar `ReleasesFiltersState` con `sortBy: string` (default `'release_date_desc'`).
- Añadir un `<Select>` "Ordenar por" junto al de Artista, con opciones:
  - Fecha de publicación (más reciente / más antigua)
  - Fecha de creación (más reciente / más antigua)
  - Alfabético (A–Z / Z–A)
  - Estado
- No añadir badge ni contar en `activeFilterCount` (es ordenación, no filtro). Sí incluirlo en `clearFilters` reseteando al default.

**2. Página consumidora (Releases)**
- Aplicar `sortBy` con un `useMemo` ordenando el array filtrado. Manejar nulls al final en fechas.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/components/releases/ReleasesFiltersToolbar.tsx` | Añadir campo `sortBy` + Select de ordenación |
| `src/pages/Releases.tsx` (o donde se consume) | Aplicar el orden con `useMemo` |

