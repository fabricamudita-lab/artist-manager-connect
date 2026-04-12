

## KPI Cards: 3 fijos + 3 configurables

### Cambio
Los primeros 3 KPIs (Total Ofertas, Confirmados, En Negociación) pasan a ser fijos con título estático. Solo los 3 últimos mantienen el desplegable `<Select>` para elegir entre las 7 métricas restantes.

### Archivo: `src/components/booking-detail/KpiStatsBar.tsx`

1. **Slots fijos (posiciones 0-2)**: Renderizar con un `<p>` de texto estático en lugar del `<Select>`. Claves fijas: `totalOfertas`, `confirmados`, `negociacion`.
2. **Slots configurables (posiciones 3-5)**: Mantienen el `<Select>` actual pero solo ofrecen las 7 métricas no fijas como opciones: `feeTotalConf`, `internacionales`, `next30`, `cobrosPendientes`, `conversion`, `feeMedia`, `realizados`.
3. **Persistencia**: `localStorage('booking_kpi_config')` guarda solo las 3 claves configurables (posiciones 3-5). Los defaults configurables son `feeTotalConf`, `internacionales`, `next30`.
4. **Migración**: Si hay config antigua de 6 slots, se toman solo las últimas 3 posiciones (validando que no sean claves fijas).

