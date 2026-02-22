
# Scroll nativo y persistencia de generos musicales

Dos cambios puntuales para que la lista de generos se pueda recorrer con scroll del raton y los datos se guarden correctamente.

---

## 1. Scroll nativo en la lista de generos

El `ScrollArea` de Radix no esta calculando bien la altura dentro del Popover anidado en un Dialog. Se reemplaza por un `div` con `overflow-y-auto` nativo, que funciona de forma fiable en todos los contextos.

### Cambio en `src/components/GenreCombobox.tsx`

Reemplazar:
```tsx
<ScrollArea className="max-h-60">
  <div className="p-1">
    ...
  </div>
</ScrollArea>
```

Por:
```tsx
<div className="max-h-60 overflow-y-auto overscroll-contain p-1">
  ...
</div>
```

Tambien se puede eliminar el import de `ScrollArea` ya que deja de usarse.

---

## 2. Persistencia en base de datos

La persistencia YA funciona correctamente sin cambios adicionales:

- `ArtistInfoDialog` pasa `formData.genre` al `GenreCombobox` como `value`
- `GenreCombobox` llama `onValueChange` con el string de generos separados por coma (ej. `"Jazz, Techno"`)
- `handleSave` en `ArtistInfoDialog` ejecuta `supabase.from('artists').update({ genre: formData.genre })` que guarda el string completo en la columna `genre` de la tabla `artists`

No se requiere ningun cambio para la persistencia. El usuario solo necesita pulsar "Guardar Cambios" tras seleccionar los generos.

---

## Archivo afectado

| Archivo | Cambio |
|---|---|
| `src/components/GenreCombobox.tsx` | Reemplazar `ScrollArea` por `div` con `overflow-y-auto` nativo, eliminar import no usado |
