## Sugerir dirección automáticamente desde el Venue

En el diálogo "Editar Booking" → pestaña **Ubicación**, sustituir el input plano de "Lugar / Dirección" por el componente `AddressAutocomplete` ya existente, que usa Google Places y sugiere direcciones combinando Venue + Ciudad + País.

### Comportamiento resultante
- Si el usuario tiene relleno **Venue** (ej. "Plaça del Carbó") + **Ciudad** ("Vic") + **País** ("España"), aparecerá automáticamente una **sugerencia de dirección** debajo del campo, con un botón "Usar" / "Sugerir" para aplicarla.
- El usuario puede seguir escribiendo manualmente para buscar otras direcciones (autocompletado típico de Google Places).
- Si no hay suficiente contexto, se comporta como un input normal.

### Cambios técnicos
**Archivo:** `src/components/booking-detail/EditBookingDialog.tsx` (líneas 690-697)

Reemplazar:
```tsx
<Input
  value={formData.lugar || ''}
  onChange={(e) => updateField('lugar', e.target.value)}
  placeholder="Dirección o ubicación específica"
/>
```

Por:
```tsx
<AddressAutocomplete
  value={formData.lugar || ''}
  onChange={(v) => updateField('lugar', v)}
  venue={formData.venue || ''}
  city={formData.ciudad || ''}
  country={formData.pais || ''}
  placeholder="Dirección o ubicación específica"
/>
```

Añadir el import correspondiente.

### Notas
- El componente `AddressAutocomplete` y la edge function `google-places-autocomplete` ya existen y funcionan (se usan en otras partes). No requiere infra nueva.
- Requiere que el secret `GOOGLE_PLACES_API_KEY` siga configurado en Supabase (ya lo está, dado que se usa en producción).
- Sólo dispara la búsqueda automática si Venue + Ciudad están rellenos y el campo Lugar está vacío, así que no molesta cuando ya hay dirección.