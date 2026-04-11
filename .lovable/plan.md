

## Persistir filtro de artista al cambiar pestañas en Finanzas

### Problema
Cada sub-ruta de `/finanzas/*` monta una instancia independiente de `FinanzasHub` (hay 6 `<Route>` separados en `App.tsx`). Al navegar entre pestañas, React desmonta el componente anterior y monta uno nuevo, reseteando `useState('all')`.

### Solución
Persistir `selectedArtist` en `sessionStorage` para que sobreviva al remontaje del componente.

### Cambio técnico

**Archivo: `src/pages/FinanzasHub.tsx`**

Reemplazar:
```typescript
const [selectedArtist, setSelectedArtist] = useState('all');
```

Por:
```typescript
const [selectedArtist, setSelectedArtist] = useState(() => {
  return sessionStorage.getItem('finanzas-artist-filter') || 'all';
});

const handleArtistChange = (value: string) => {
  setSelectedArtist(value);
  sessionStorage.setItem('finanzas-artist-filter', value);
};
```

Y actualizar el `<ArtistFilter onChange={...}>` para usar `handleArtistChange` en vez de `setSelectedArtist`.

Un solo archivo, ~5 líneas cambiadas. El filtro se mantiene mientras dure la sesión del navegador y se resetea al cerrar la pestaña.

