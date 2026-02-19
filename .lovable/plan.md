
# Unificar la mezcla dentro del bloque de Productor

## Problema actual

Bajo el selector de Productor/es hay **dos toggles independientes y separados**:

1. `¿El productor incluye mezcla?` — toggle simple (sin segundo toggle de "Producción propia/Derivado")
2. `¿Mezcla externa?` — aparece solo si el toggle 1 está OFF, con su selector de técnico

Esto crea una experiencia confusa: el usuario tiene que entender que son excluyentes y que el segundo depende del primero.

## Solución propuesta

Fusionar los dos toggles en **un único bloque de mezcla** lógicamente agrupado bajo el productor:

```
Productor/es
  [selector de productores]

  ┌─ Mezcla ──────────────────────────────────────┐
  │  ¿El productor incluye mezcla?  [toggle ON/OFF] │
  │                                                  │
  │  Si está OFF →                                   │
  │    ¿Mezcla externa?  [toggle ON/OFF]             │
  │    Si está ON → selector de técnico              │
  └──────────────────────────────────────────────────┘
```

Visualmente, el bloque de mezcla se presenta como una tarjeta/sub-sección anidada con borde izquierdo o fondo diferenciado, dejando claro que la mezcla externa solo tiene sentido cuando el productor NO la incluye.

## Lógica de estados (sin cambios)

Los estados existentes se mantienen exactamente igual:
- `includesMix` / `setIncludesMix`
- `externalMix` / `setExternalMix`
- `externalMixEngineer` / `setExternalMixEngineer`

Solo cambia la **presentación visual** del bloque.

## Cambio técnico

En `CreateReleaseBudgetDialog.tsx`, líneas 1075–1098, reemplazar los toggles sueltos por un bloque con cabecera de subsección:

```tsx
{/* Mezcla — agrupado bajo producción */}
<div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mezcla</h5>
  
  <ToggleRow
    label="¿El productor incluye mezcla?"
    checked={includesMix}
    onChange={(v) => { setIncludesMix(v); if (v) { setExternalMix(false); setExternalMixEngineer(null); } }}
  />
  
  {!includesMix && (
    <div className="pl-3 border-l-2 border-border space-y-2">
      <ToggleRow
        label="¿Mezcla externa?"
        checked={externalMix}
        onChange={(v) => { setExternalMix(v); if (!v) setExternalMixEngineer(null); }}
      />
      {externalMix && (
        <div className="space-y-1.5 pl-4 border-l-2 border-primary/30">
          <Label className="text-xs">Técnico de mezcla externo</Label>
          <SingleProducerSelector
            value={externalMixEngineer}
            onChange={setExternalMixEngineer}
            artistId={release?.artist_id}
            placeholder="Seleccionar técnico..."
          />
        </div>
      )}
    </div>
  )}
</div>
```

## Archivo a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**, líneas 1075–1098 — cambio puramente visual/estructural, sin modificar estados ni lógica.
