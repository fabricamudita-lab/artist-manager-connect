
# Auto-calcular Nº cápsulas RRSS como videoclips × 3

## Situación actual

En `CreateReleaseBudgetDialog.tsx`, líneas 276–277:

```tsx
const [nVideoclips, setNVideoclips] = useState(0);
const [nCapsulasRRSS, setNCapsulasRRSS] = useState(0);
```

Ambos campos son completamente independientes. El usuario tiene que rellenar las cápsulas manualmente.

## Solución

### 1. Flag `capsulasManuales`

Añadir un estado booleano que indique si el usuario ha tocado el campo de cápsulas manualmente:

```tsx
const [capsulasManuales, setCapsulasManuales] = useState(false);
```

### 2. `useEffect` de sincronización

Cuando `nVideoclips` cambia y el usuario **no** ha sobreescrito las cápsulas, actualizar automáticamente:

```tsx
useEffect(() => {
  if (!capsulasManuales) {
    setNCapsulasRRSS(nVideoclips * 3);
  }
}, [nVideoclips, capsulasManuales]);
```

### 3. Handler manual para el campo de cápsulas

Cuando el usuario escribe en el input de cápsulas, activar el flag manual:

```tsx
onChange={e => {
  setCapsulasManuales(true);
  setNCapsulasRRSS(parseInt(e.target.value) || 0);
}}
```

### 4. Botón de reset (opcional pero recomendado)

Un pequeño icono ↺ junto al input de cápsulas que al pulsarlo vuelve al valor automático (`nVideoclips × 3`) y limpia el flag manual. Solo aparece cuando `capsulasManuales = true` y el valor actual difiere del automático:

```tsx
{capsulasManuales && nCapsulasRRSS !== nVideoclips * 3 && (
  <button
    onClick={() => { setCapsulasManuales(false); setNCapsulasRRSS(nVideoclips * 3); }}
    title="Restaurar valor automático"
  >
    <RotateCcw className="h-3 w-3" />
  </button>
)}
```

### 5. Reset al abrir el diálogo

Al resetear el formulario (cuando el diálogo se cierra/abre), también resetear `capsulasManuales` a `false`.

## Archivos a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**:

- Añadir `const [capsulasManuales, setCapsulasManuales] = useState(false);` junto a los demás estados (~línea 277)
- Añadir `useEffect` de sincronización (~línea 340, antes de los `useMemo`)
- Modificar el `onChange` del input `nCapsulasRRSS` para activar el flag (~línea 1132)
- Añadir botón reset ↺ dentro del `<div>` del campo cápsulas
- Incluir `setCapsulasManuales(false)` en la función de reset del formulario

## Comportamiento resultante

| Acción del usuario | Resultado |
|---|---|
| Cambia videoclips a 4 | Cápsulas se actualiza automáticamente a 12 |
| Cambia videoclips a 0 | Cápsulas = 0 automáticamente |
| Escribe 10 en cápsulas manualmente | Cápsulas queda en 10, deja de seguir a videoclips |
| Pulsa ↺ | Cápsulas vuelve a videoclips × 3 |
| Cambia videoclips tras edición manual | Cápsulas NO cambia (respeta la edición manual) |
