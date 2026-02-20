
# Mejora: Ocultar categorías del panel de Gestión cuando están ocultas

## Problema

El panel "Gestión de Categorías" (que aparece al hacer clic en el botón de gestión) muestra **todas** las categorías, incluidas las que el usuario ha ocultado con el icono 👁. Esto crea inconsistencia: la categoría desaparece de la vista principal pero sigue apareciendo en el gestor.

## Solución

Un cambio de **una sola línea** en `BudgetDetailsDialog.tsx`.

**Línea 2932 — antes:**
```tsx
{sortCategoriesWithPriority(budgetCategories).map((category, index) => (
```

**Línea 2932 — después:**
```tsx
{sortCategoriesWithPriority(budgetCategories).filter(c => !hiddenCategories.has(c.id)).map((category, index) => (
```

Esto hace que el panel de gestión y la vista principal estén siempre sincronizados: si una categoría está oculta, no aparece en ninguno de los dos sitios. Para recuperarla, el usuario usa la sección "Categorías ocultas" que ya está al final de la vista principal.

## Comportamiento resultante

| Zona | Categoría visible | Categoría oculta |
|---|---|---|
| Vista principal (acordeón) | ✅ Visible | ❌ Oculta |
| Panel Gestión de Categorías | ✅ Visible | ❌ Oculta |
| Sección "Categorías ocultas" | ❌ No aparece | ✅ Visible con botón Mostrar |

## Archivo afectado

| Archivo | Línea | Cambio |
|---|---|---|
| `src/components/BudgetDetailsDialog.tsx` | 2932 | Añadir `.filter(c => !hiddenCategories.has(c.id))` |

Sin cambios en base de datos. Sin nuevos archivos. Cambio quirúrgico de una línea.
