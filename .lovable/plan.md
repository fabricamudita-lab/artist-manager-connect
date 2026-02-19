
# Mover "Fabricación física" de Logística a su propia sección

## Problema

En el paso 3 del wizard (Variables), la fila `¿Fabricación física (vinilo/CD)?` está agrupada bajo la sección **Logística**, junto a Transporte, Dietas y Hospedaje — que son conceptos de logística de tour/artista, no de producción física.

La fabricación de vinilo/CD es una categoría de producción totalmente distinta que ya tiene su propia sección en el sistema de partidas: `'Fabricación & logística'`.

## Solución

Extraer `¿Fabricación física (vinilo/CD)?` de la sección Logística y colocarla en una sección propia llamada **Fabricación física**, justo después de Logística (o donde tenga más sentido en el flujo).

### Antes:
```
LOGÍSTICA
  ¿Transporte?
  ¿Dietas?
  ¿Hospedaje?
  ¿Fabricación física (vinilo/CD)?   ← fuera de lugar
```

### Después:
```
LOGÍSTICA
  ¿Transporte?
  ¿Dietas?
  ¿Hospedaje?

FABRICACIÓN FÍSICA
  ¿Fabricación física (vinilo/CD)?   ← en su sección correcta
```

## Cambio técnico

Solo `src/components/releases/CreateReleaseBudgetDialog.tsx`, ~línea 1214–1221:

1. Quitar `<ToggleRow label="¿Fabricación física (vinilo/CD)?".../>` de dentro del `<div>` de Logística
2. Añadir un nuevo `<div className="space-y-3">` debajo con:
   - Cabecera `<h4>` con texto **"Fabricación física"**
   - La fila `ToggleRow` de fabricación

## Archivo a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`** — cambio mínimo de estructura JSX, sin tocar estados ni lógica.
