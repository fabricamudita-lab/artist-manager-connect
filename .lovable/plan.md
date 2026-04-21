

## Plan: Separar pipeline (no confirmado) de contabilidad real en Finanzas

### Diagnóstico
Hoy en `Finanzas`:
- **CobrosTab** muestra **todos** los `booking_offers` con `fee > 0` independientemente de su fase, mezclando ofertas en `interés`, `oferta` o `negociación` (que NO son ingresos asegurados) con bookings `confirmado`/`realizado`. Estos importes se suman al "Pendiente de Cobro" inflando las cifras.
- **useFinanzasPanel** ya filtra parcialmente (solo cuenta `realizado`/`confirmado` en `cobrosPendientes`) pero los KPIs y el panel no distinguen visualmente entre **comprometido** (firmado) y **previsto** (pipeline).
- **PagosTab/Gastos**: los `budget_items` con `is_provisional = true` ya existen en el modelo pero se suman al total de gastos sin distinguirlos en KPIs principales.

### Terminología contable a aplicar
| Concepto actual | Nuevo nombre | Definición |
|---|---|---|
| Cobros de bookings confirmados/realizados | **Cobros comprometidos** (Accounts Receivable) | Bookings con `phase ∈ {confirmado, realizado, facturado}` o cobros manuales `pendiente`/`cobrado` |
| Cobros de ofertas no confirmadas | **Pipeline de ingresos** (Forecast / Revenue Pipeline) | Bookings con `phase ∈ {interés, oferta, negociación, propuesta}` |
| Gastos `is_provisional = false` | **Gastos comprometidos** (Committed expenses) | Partidas firmadas |
| Gastos `is_provisional = true` | **Gastos previstos** (Estimated / Pending confirmation) | Partidas estimadas pendientes de confirmar |
| Beneficio Neto actual (mezcla) | **Resultado contable** (solo comprometidos) + **Resultado proyectado** (incluye pipeline) | Dos vistas separadas |

### Cambios

**1. `useFinanzasPanel.ts` — separar series**
- Definir constantes: `CONFIRMED_PHASES = ['confirmado','realizado','facturado']`, `PIPELINE_PHASES = ['interes','interés','oferta','negociacion','negociación','propuesta']`.
- Reemplazar el cálculo actual de `cobrosPendientes` por dos derivados:
  - `cobrosComprometidos` (AR): bookings en `CONFIRMED_PHASES` con `cobro_estado != cobrado_completo` + cobros manuales `pendiente`/`parcial`/`vencido`.
  - `pipelineIngresos` (forecast): bookings en `PIPELINE_PHASES` con `fee > 0`. **NO se suma** a `cobrosComprometidos` ni a `ingresosBrutos`.
- Reemplazar `gastosComprometidos` por:
  - `gastosComprometidos` = solo `confirmedItems` (sin provisionales).
  - `gastosPrevistos` = solo `provisionalItems`.
- Reemplazar `beneficioNeto` por:
  - `resultadoContable = ingresosBrutos - gastosComprometidos` (solo cosas firmadas, lo único auditable).
  - `resultadoProyectado = (ingresosBrutos + cobrosComprometidos + pipelineIngresos) - (gastosComprometidos + gastosPrevistos)` (escenario completo).
- Devolver además `pipelineCount` (nº de ofertas no confirmadas) para el badge.

**2. `FinanzasPanelTab.tsx` — UI con dos capas**
- KPI principal "Resultado": muestra `resultadoContable` arriba grande, y debajo en texto pequeño `Proyectado: €X (incluye pipeline)`.
- KPI "Cobros pendientes" → renombrar a **"Por cobrar (comprometido)"** mostrando solo `cobrosComprometidos`. Añadir mini-fila debajo: `+ €X en pipeline (N ofertas) →` que linka a `/booking?phase=interes,oferta,negociacion`.
- KPI "Gastos comprometidos" → mostrar `gastosComprometidos` arriba y `+ €X previstos (provisional)` en texto secundario en ámbar.
- Tooltip/info icon explicando: "Solo se contabilizan cobros y gastos confirmados. El pipeline y los gastos provisionales se muestran aparte para previsiones."

**3. `CobrosTab.tsx` — filtrar y separar**
- En el query `bookingCobros`, filtrar por phase: solo incluir bookings con `phase ∈ CONFIRMED_PHASES` por defecto.
- Añadir un toggle/tab nuevo arriba junto a los filtros de tipo: **"Comprometidos"** (default) | **"Pipeline"** | **"Todos"**.
  - "Comprometidos": cobros manuales + bookings confirmados/realizados/facturados.
  - "Pipeline": solo bookings en interés/oferta/negociación, con badge ámbar "No confirmado" y sin sumar a las tarjetas superiores.
  - "Todos": ambos juntos pero con la columna estado mostrando claramente la fase.
- Las **4 tarjetas resumen** ("Total Cobrado", "Pendiente de Cobro", "Vencido", "Próximos 30 días") solo cuentan **comprometidos** independientemente del filtro activo. Añadir una 5ª tarjeta más sutil: **"Pipeline (no contabilizado)"** con icono ámbar y texto pequeño "€X en N ofertas en negociación".
- En cada fila de pipeline mostrar badge ámbar `Pipeline · {phase}` en lugar del badge de status actual.

**4. `PagosTab.tsx` — análogo para gastos**
- Separar visualmente partidas con `is_provisional = true` con badge ámbar `Previsto` y excluirlas del total "Pagos pendientes" del header.
- Añadir tarjeta secundaria "Gastos previstos (sin confirmar)" sumando solo provisionales.

**5. Documentación visual**
- Añadir en la cabecera del Panel un pequeño legend con dos píldoras de color:
  - 🟢 **Comprometido** = contabilidad real
  - 🟡 **Previsto / Pipeline** = forecast, no se suma

### Edge cases
- Bookings `cancelado`/`rechazado` siguen excluidos de todo (ya lo hace `closedStatuses`).
- Cobros manuales en tabla `cobros` sin `booking_id` siempre se consideran comprometidos (el usuario los introdujo manualmente).
- Si un booking está en pipeline pero alguien creó un `cobro` manual ligado a él, gana el cobro manual (comprometido).

### Archivos
| Archivo | Cambio |
|---|---|
| `src/hooks/useFinanzasPanel.ts` | Separar pipeline vs comprometido en ingresos y gastos; nuevos derivados `pipelineIngresos`, `gastosPrevistos`, `resultadoContable`, `resultadoProyectado` |
| `src/components/finanzas/FinanzasPanelTab.tsx` | KPIs muestran comprometido grande + previsto/pipeline en secundario; legend de colores |
| `src/components/finanzas/CobrosTab.tsx` | Filtrar bookings por phase; nuevo selector Comprometidos/Pipeline/Todos; tarjeta extra "Pipeline" |
| `src/components/finanzas/PagosTab.tsx` | Separar gastos provisionales en KPI propio con badge ámbar |

