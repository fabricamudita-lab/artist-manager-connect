
# Mejora: Categorías ocultas visibles de inmediato con un solo clic para recuperarlas

## Problema actual

La sección "Categorías ocultas" funciona pero requiere **dos pasos**:
1. Clic en el acordeón para expandirlo
2. Clic en "Mostrar" para recuperar la categoría

El usuario quiere recuperarla con **un solo clic**.

## Solución

Eliminar el acordeón colapsable. En su lugar, mostrar las categorías ocultas **siempre visibles** en una franja compacta al final de la lista. Cada fila tiene directamente el icono de ojo para restaurar con un solo clic.

```
┌─────────────────────────────────────────────────────┐
│  👁 CATEGORÍAS OCULTAS                              │
├─────────────────────────────────────────────────────┤
│  $ ARTISTA PRINCIPAL              [👁 Mostrar →]   │
│  🎵 COMUNICACIÓN                  [👁 Mostrar →]   │
└─────────────────────────────────────────────────────┘
```

## Cambio técnico — solo 1 bloque de código

**Archivo:** `src/components/BudgetDetailsDialog.tsx`  
**Líneas:** 3816–3860

Se elimina:
- El estado `showHiddenAccordion` y el botón toggle
- El `{showHiddenAccordion && (…)}` condicional

Se sustituye por:
- Una sección siempre visible con encabezado fijo `"CATEGORÍAS OCULTAS (N)"`
- Cada categoría en una fila compacta con icono + nombre + **botón Eye directo**
- El botón dispara directamente `setHiddenCategories` → delete sin pasos intermedios

También se puede eliminar el estado `showHiddenAccordion` (línea 272) ya que deja de usarse.

## Resultado visual

Antes: acordeón colapsado → expandir → "Mostrar" (2 clics)  
Después: lista directa → clic en 👁 (1 clic)

Sin cambios en base de datos. Sin nuevos archivos.
