

## Convertir campo Mood a selector con opciones de Ditto

### Cambio
Reemplazar el `Input` de texto libre del campo "Mood / Estilo" por un `Select` con las 9 opciones exactas que exige Ditto:

- Chill
- Energetic
- Happy
- Fierce
- Meditative
- Romantic
- Sad
- Sexy
- None of these

### Archivos afectados

1. **`src/pages/release-sections/ReleasePitch.tsx`** — reemplazar el `<Input>` de mood por un `<Select>` con las 9 opciones
2. **`src/pages/PublicReleaseForm.tsx`** — mismo cambio en el formulario público

Cambio menor, solo UI — no requiere migración ni nuevos campos.

