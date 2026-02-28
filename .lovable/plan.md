

## Rediseno del cabezal de metricas (no-concierto)

### Resumen
Reemplazar las 6 metricas actuales del cabezal (para tipos produccion/campana/videoclip) por 4 metricas correctamente calculadas, con un popover fiscal en "Comprometido".

### Cambios en `src/components/BudgetDetailsDialog.tsx`

**Seccion afectada**: Solo el bloque `else` del cabezal (lineas ~2842-2925), que aplica a tipos no-concierto. No se toca la tabla de elementos ni el bloque de concierto.

#### 1. Nuevas variables de calculo (dentro del IIFE, lineas ~2772-2784)

Anadir tras las variables existentes:

```text
pagado = suma de items con billing_status === 'pagada' (subtotal neto)
comprometido = suma de items con billing_status !== 'pagada' y is_provisional !== true (subtotal neto)
provisionalTotal = suma de items con is_provisional === true y billing_status !== 'pagada' (subtotal neto)
facturasCobradas = count de items con billing_status === 'pagada'
disponible = budgetAmount - pagado - comprometido - provisionalTotal
disponiblePct = budgetAmount > 0 ? (disponible / budgetAmount) * 100 : 0
```

Los totales fiscales (IVA, IRPF, total con IVA) ya se calculan en `calculateGrandTotals()` y se reutilizan para el popover.

#### 2. Reemplazar las 6 tarjetas por 4 tarjetas

**grid-cols-6** cambia a **grid-cols-4**

Las 4 tarjetas, de izquierda a derecha:

| # | Titulo | Valor | Subtexto | Estilo |
|---|--------|-------|----------|--------|
| 1 | CAPITAL | budgetAmount (editable, mantener icono lapiz) | "Presupuesto total" | Azul (como esta) |
| 2 | PAGADO | pagado | "X facturas cobradas" | Verde |
| 3 | COMPROMETIDO + icono info | comprometido + provisionalTotal | Linea 1: "euroX confirmado . euroX provisional" (provisional en ambar) | Ambar |
| 4 | DISPONIBLE | disponible | "EXCEDIDO" si negativo, sino "Por consumir" | Semaforo: verde (>15%), ambar (0-15%), rojo (<0) |

#### 3. Popover fiscal en COMPROMETIDO

Se anade un icono `Info` (lucide-react) junto al titulo "COMPROMETIDO". Al hacer hover muestra un `Popover` (o `HoverCard`) con:

- Total IVA soportado: totals.iva
- Total IRPF retenido: totals.irpf  
- Total a pagar (con IVA): totals.total

Se usan los componentes `Popover`/`HoverCard` ya importados en el proyecto.

#### 4. Elementos eliminados del cabezal

- "PRESUPUESTO PLANIF." / "AVANCE PAGADO" (segunda tarjeta actual)
- "TOTAL A FACTURAR" con desglose IVA/IRPF (se mueve al popover)
- "% EJECUTADO" (sexta tarjeta actual)

#### 5. Lo que NO se toca

- Bloque de concierto (lineas 2796-2841)
- Botones de descarga y expandir
- Campo editable del capital
- Titulo y subtitulo
- Tablas de elementos y pestanas
- Chip de categorias ocultas
