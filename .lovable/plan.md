## Objetivo

En los modales del calendario (popover de lanzamiento y popover de booking), el nombre del artista debe ser un enlace clicable que navegue al perfil del artista (`/artistas/:id`) y cierre el modal.

## Cambios

### 1. `src/components/calendar/ReleaseDayPopover.tsx` (líneas 45-47)

Convertir el nombre del artista en `<Link>` cuando exista `release.artist_id`:

```tsx
{release.artist?.name && (
  <p className="text-sm text-muted-foreground">
    Artista:{' '}
    {release.artist_id ? (
      <Link
        to={`/artistas/${release.artist_id}`}
        onClick={() => onOpenChange(false)}
        className="text-foreground font-medium hover:text-primary hover:underline transition-colors"
      >
        {release.artist.name}
      </Link>
    ) : (
      <span className="text-foreground">{release.artist.name}</span>
    )}
  </p>
)}
```

### 2. `src/pages/Calendar.tsx` (líneas 1341-1347, popover de booking)

Convertir el nombre del artista en `<Link>` usando `selectedBookingOffer.artist_id` (ya cargado en la query de `fetchBookingOffers`):

```tsx
{selectedBookingOffer.artists && (
  <div className="flex items-center gap-3 text-sm">
    <span className="font-medium">Artista:</span>
    {selectedBookingOffer.artist_id ? (
      <Link
        to={`/artistas/${selectedBookingOffer.artist_id}`}
        onClick={() => setSelectedBookingOffer(null)}
        className="text-primary hover:underline"
      >
        {selectedBookingOffer.artists.stage_name || selectedBookingOffer.artists.name}
      </Link>
    ) : (
      <span>{selectedBookingOffer.artists.stage_name || selectedBookingOffer.artists.name}</span>
    )}
  </div>
)}
```

`Link` de `react-router-dom` ya está importado en ambos archivos. Ruta verificada: `/artistas/:id` definida en `src/App.tsx`.

Sin cambios de base de datos.
