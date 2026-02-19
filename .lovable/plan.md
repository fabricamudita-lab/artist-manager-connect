
# Lógica condicional en toggles de Mezcla

## Situación actual

En el paso "Variables" hay dos toggles seguidos:

```
¿El productor incluye mezcla?  [ON]
¿Mezcla externa?               [OFF]
```

Y encima, el campo **Productor/es** siempre visible.

Hay dos problemas de UX:

1. Si `includesMix = true` (el productor incluye mezcla), mostrar "¿Mezcla externa?" no tiene lógica — son mutuamente excluyentes.
2. Si `externalMix = true` (la mezcla la hace alguien externo), debería aparecer un selector para vincular al **técnico de mezcla externo** — ese es el perfil que falta. El campo "Productor/es" sigue siendo válido (el productor sigue existiendo), pero necesita un campo extra para el responsable de la mezcla.

## Cambios a implementar

### 1. Ocultar "¿Mezcla externa?" cuando `includesMix = true`

Si el productor incluye la mezcla, no puede ser externa al mismo tiempo. Se añade una condición:

```tsx
<ToggleRow label="¿El productor incluye mezcla?" checked={includesMix} onChange={(v) => { setIncludesMix(v); if (v) setExternalMix(false); }} />
{!includesMix && (
  <ToggleRow label="¿Mezcla externa?" checked={externalMix} onChange={setExternalMix} />
)}
```

### 2. Mostrar selector de técnico de mezcla solo cuando `externalMix = true`

Cuando hay mezcla externa, aparece un `SingleProducerSelector` para seleccionar el técnico/estudio responsable:

```tsx
{externalMix && (
  <div className="space-y-1.5 pl-4 border-l-2 border-border ml-2">
    <Label className="text-xs">Técnico de mezcla externo</Label>
    <SingleProducerSelector
      value={externalMixEngineer}
      onChange={setExternalMixEngineer}
      artistId={release?.artist_id}
      placeholder="Seleccionar técnico..."
    />
  </div>
)}
```

### 3. Nuevo estado `externalMixEngineer`

Añadir estado:
```tsx
const [externalMixEngineer, setExternalMixEngineer] = useState<ProducerRef | null>(null);
```

Y incluirlo en el `metadata` al guardar, junto al resto de proveedores.

### 4. Reset al desactivar

Cuando `externalMix` se desactiva, limpiar `externalMixEngineer`:
```tsx
onChange={(v) => { setExternalMix(v); if (!v) setExternalMixEngineer(null); }}
```

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:

- Línea ~175: añadir `const [externalMixEngineer, setExternalMixEngineer] = useState<ProducerRef | null>(null);`
- Línea ~1009: modificar `ToggleRow` de `includesMix` para limpiar `externalMix` al activar
- Línea ~1010: envolver `ToggleRow` de `externalMix` en `{!includesMix && (...)}` con reset de `externalMixEngineer`
- Línea ~1011: añadir bloque condicional `{externalMix && ...}` con `SingleProducerSelector`
- En la función de generación de metadata: incluir `externalMixEngineer`

## Flujo resultante

```
¿El productor incluye mezcla? [ON]  → oculta "¿Mezcla externa?"
¿El productor incluye mezcla? [OFF] → muestra "¿Mezcla externa?"
  ¿Mezcla externa? [ON]             → muestra selector "Técnico de mezcla externo"
  ¿Mezcla externa? [OFF]            → sin selector adicional
```
