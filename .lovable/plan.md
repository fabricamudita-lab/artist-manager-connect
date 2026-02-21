
# Mejoras a la pagina Finanzas

5 cambios aditivos sin eliminar codigo existente. El objetivo es que los datos financieros sean mas claros, confiables y accionables.

---

## 1. Explicar el 0.00 con contexto temporal

Cuando `totalEarnings === 0` pero `songsCount > 0`, la card "Total Royalties" muestra un mensaje confuso. Se anade un subtexto educativo condicional.

### Cambios en `src/pages/Finanzas.tsx`

En la 1a card (Total Royalties, lineas 54-63):
- Si `totalEarnings === 0 && songsCount > 0`: cambiar el subtexto de "Ingresos fonograficos" a "Los royalties tardan 2-6 meses en llegar tras la publicacion"
- Si `totalEarnings === 0 && songsCount === 0`: subtexto "Registra canciones para empezar"
- Si `totalEarnings > 0`: mantener "Ingresos fonograficos" (sin cambio)

Tambien anadir un icono `Info` con tooltip en la card cuando el valor es 0 y hay canciones, para reforzar que es normal.

---

## 2. Fusionar tabs: de 6 a 3

Las 6 tabs actuales se reorganizan en 3 tabs principales. Todo el contenido se conserva, solo cambia la agrupacion.

### Nueva estructura de tabs

| Tab | Contenido | Sub-tabs internas |
|---|---|---|
| **Ganancias** | Overview + Canciones + Earnings + Tendencias | "Resumen" (FinanzasOverview + EarningsTrends inlined), "Canciones & Splits" (SongSplitsManager), "Por Plataforma" (PlatformEarningsManager) |
| **Presupuestos** | FinanzasPresupuestos | Sin cambio, misma tab |
| **Pagos a Artistas** | LiquidacionCalculator + PaymentTracker | "Liquidacion" (LiquidacionCalculator), "Historial de Pagos" (PaymentTracker) |

### Cambios en `src/pages/Finanzas.tsx`

- Reemplazar los 6 `TabsTrigger` por 3: `ganancias`, `presupuestos`, `pagos`
- Cada `TabsContent` que tiene sub-secciones usa un `Tabs` interno (mismo patron que BookingFilesDocsTab)
- El tab "ganancias" es el default (cambiando `activeTab` de `'overview'` a `'ganancias'`)
- La tab "Resumen" dentro de Ganancias renderiza `FinanzasOverview` seguido de `EarningsTrends` (ambos en el mismo scroll, sin sub-tab separada para tendencias)
- Importar `Tooltip` y `TooltipContent`/`TooltipTrigger` de los UI components

### Tab "Pagos a Artistas"

- Renombrar "Liquidacion" a "Pagos a Artistas" con tooltip descriptivo
- El tooltip dice: "Gestiona cuanto y cuando cobran tus artistas y colaboradores"
- Dentro: sub-tabs "Calculadora" (LiquidacionCalculator) y "Historial" (PaymentTracker)
- `PaymentTracker` ya se importa pero no se usa en Finanzas (solo en Royalties). Se anade aqui como sub-tab

---

## 3. Renombrar "Liquidacion" (ya cubierto en punto 2)

El tab se llama "Pagos a Artistas" con icono `Users` y tooltip explicativo. No hay cambio adicional.

---

## 4. Sparkline en la card "Total Royalties" del header

Anadir un mini area chart (recharts `AreaChart`, 80x32px) dentro de la 1a card del header que muestra los ultimos 6 meses de ganancias.

### Cambios en `src/pages/Finanzas.tsx`

- Importar `usePlatformEarnings` y `useSongs` de `useRoyalties`
- Importar `AreaChart, Area, ResponsiveContainer` de recharts
- Calcular `monthlyData` (ultimos 6 meses) con un `useMemo` similar al de `EarningsTrends`
- Renderizar un `ResponsiveContainer` de 80x32 dentro de la card, al lado del valor numerico
- El sparkline usa `fill="url(#sparkGradient)"` con color primario al 20% de opacidad
- Sin ejes, sin tooltip, sin grid -- solo la linea de tendencia

---

## 5. Cards financieras con color segun estado

Las 4 cards del header pasan de tener todas el mismo estilo a usar colores semanticos.

### Cambios en `src/pages/Finanzas.tsx`

| Card | Condicion color | Borde/Acento |
|---|---|---|
| Total Royalties | Si > 0: verde. Si == 0 con canciones: azul (informativo). Si == 0 sin canciones: gris | `border-l-4` con color correspondiente |
| Canciones | Siempre azul (neutral informativo) | `border-l-4 border-l-blue-500` |
| Colaboradores | Siempre violeta | `border-l-4 border-l-violet-500` |
| Reproducciones | Si > 0: verde. Si == 0: gris | `border-l-4` condicional |

Se anade un `border-l-4` a cada card con el color semantico. El icono de la card tambien cambia de `text-muted-foreground` al color correspondiente.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Finanzas.tsx` | Tabs fusionadas (6 a 3 con sub-tabs), sparkline en header, cards con color semantico, subtexto educativo en 0.00, tooltip en Pagos a Artistas |

No se tocan: `FinanzasOverview`, `EarningsTrends`, `LiquidacionCalculator`, `PlatformEarningsManager`, `SongSplitsManager`, `PaymentTracker`, `FinanzasPresupuestos`. Todos se reusan tal cual.
