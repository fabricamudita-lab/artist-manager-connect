

## Plan: Reemplazar "Top artistas por ingresos" cuando hay un artista seleccionado

### Diagnóstico
La tarjeta `Top artistas por ingresos` en `src/components/finanzas/FinanzasPanelTab.tsx` (≈ líneas 364-398) muestra el placeholder `Selecciona "Todos" para ver el ranking` cuando hay un artista filtrado. Es espacio desperdiciado — debería mostrar info útil del propio artista.

### Cambio
Cuando `artistId !== 'all'`, sustituir esa tarjeta por **"Desglose por concepto"** del artista seleccionado, basado en los mismos `periodCobros` que ya alimentan `sourceBreakdown`, pero pivotando por **categoría/concepto** (booking, royalties, sync, merchandising, otros) en lugar de por artista.

Contenido de la tarjeta nueva (modo artista único):
- Título: `Desglose de ingresos · {nombre artista}`
- Lista de top 5 conceptos con: emoji/color, label, importe (€), % sobre total del artista en el período, y mini barra de progreso (mismo estilo visual que el ranking actual para mantener consistencia).
- Si no hay ingresos en el período → mensaje `Sin ingresos de {artista} en este período` con CTA `Añadir cobro` que navega a `/finanzas/cobros`.

### Implementación
1. **`src/hooks/useFinanzasPanel.ts`**: añadir un nuevo derivado `artistConceptBreakdown: { concept, label, emoji, color, value, percentage }[]` que se calcula solo cuando `artistId !== 'all'`, agrupando `periodCobros` por concepto/origen. Reutilizar la misma paleta y labels que `sourceBreakdown`.
2. **`src/components/finanzas/FinanzasPanelTab.tsx`**: en la tarjeta de "Top artistas" añadir condicional:
   - `artistId === 'all'` → ranking actual (sin cambios).
   - `artistId !== 'all'` → render del desglose por concepto del artista, con título dinámico y CTA en empty state.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/hooks/useFinanzasPanel.ts` | Nuevo derivado `artistConceptBreakdown` para modo artista único |
| `src/components/finanzas/FinanzasPanelTab.tsx` | Render condicional en la tarjeta: ranking (todos) vs desglose por concepto (artista único) |

