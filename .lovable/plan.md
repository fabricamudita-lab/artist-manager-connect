
# Añadir subcategorías de formato físico en "Fabricación física"

## Problema actual

La sección de Fabricación física tiene un único toggle genérico `¿Fabricación física (vinilo/CD)?`. El usuario necesita especificar **qué tipo(s) de formato físico** se van a fabricar, ya que cada uno implica costes distintos.

## Solución

Cuando el toggle de Fabricación física esté **ON**, mostrar un bloque de selección múltiple con los formatos físicos habituales. Cada formato se puede marcar independientemente.

### Estructura visual propuesta

```
FABRICACIÓN FÍSICA
  ¿Fabricación física?  [toggle]  [Producción propia / Derivado]

  Si toggle ON:
  ┌─────────────────────────────────────────────────────────┐
  │  Formatos                                               │
  │  [x] Vinilo (LP/12")   [ ] Vinilo doble (2xLP)         │
  │  [ ] CD                [ ] Edición Deluxe               │
  │  [ ] Casete            [ ] Otros formatos               │
  └─────────────────────────────────────────────────────────┘
```

## Cambios técnicos

### 1. Nuevo estado

Añadir un array de formatos seleccionados junto a los estados existentes de fabricación (~línea 309):

```tsx
const [fisicoFormatos, setFisicoFormatos] = useState<string[]>([]);
```

Y la constante con los formatos disponibles:

```tsx
const FORMATOS_FISICOS = [
  { value: 'vinilo',        label: 'Vinilo (LP/12")' },
  { value: 'vinilo_doble',  label: 'Vinilo doble (2xLP)' },
  { value: 'cd',            label: 'CD' },
  { value: 'deluxe',        label: 'Edición Deluxe' },
  { value: 'cassete',       label: 'Casete' },
  { value: 'otros',         label: 'Otros formatos' },
];
```

### 2. UI condicional (~línea 1228–1232)

Reemplazar el `ToggleRow` simple por un bloque que incluye los checkboxes cuando el toggle está activo:

```tsx
<div className="space-y-3">
  <h4>Fabricación física</h4>
  <ToggleRow label="¿Fabricación física?" checked={fisico} onChange={setFisico} ... />

  {fisico && (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase">Formatos</Label>
      <div className="grid grid-cols-2 gap-2">
        {FORMATOS_FISICOS.map(f => (
          <label key={f.value} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={fisicoFormatos.includes(f.value)}
              onCheckedChange={(v) => {
                setFisicoFormatos(prev =>
                  v ? [...prev, f.value] : prev.filter(x => x !== f.value)
                );
              }}
            />
            <span className="text-sm">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  )}
</div>
```

### 3. Propagación al submit

Los formatos seleccionados se incluyen en los metadatos del presupuesto. En `handleSubmit`, añadir `fisicoFormatos` al objeto de metadata que ya se guarda en `budget_metadata`.

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:
- Añadir constante `FORMATOS_FISICOS` (~línea 88)
- Añadir estado `fisicoFormatos` (~línea 309)
- Reemplazar el bloque de Fabricación física (~línea 1228–1232) con la nueva UI anidada
- Incluir `fisicoFormatos` en la metadata del submit
