

## KPI Cards configurables con menú desplegable

### Concepto
Extender el sistema del 6o KPI card a las 6 tarjetas. Cada una tendrá un desplegable para elegir qué métrica mostrar. Se guardan las 6 selecciones en `localStorage` y se restauran al volver.

### Pool de métricas disponibles (10 opciones)
Cada tarjeta puede mostrar cualquiera de estas:

| Clave | Etiqueta | Valor | Color |
|-------|----------|-------|-------|
| `totalOfertas` | Total Ofertas | Conteo total | gris |
| `confirmados` | Confirmados | Conteo fase confirmado | verde |
| `negociacion` | En Negociación | Conteo fase negociación | ámbar |
| `feeTotalConf` | Fee Total Confirmados | Suma fee confirmados+facturados | azul |
| `internacionales` | Internacionales | Conteo `es_internacional` | púrpura |
| `next30` | Próximos 30 días | Confirmados próximos 30 días | teal |
| `cobrosPendientes` | Cobros Pendientes | Realizados >7 días sin cobrar | teal |
| `conversion` | Tasa de Conversión | % ofertas → confirmado+ | teal |
| `feeMedia` | Fee Medio | Promedio fee confirmados | teal |
| `realizados` | Realizados | Conteo fase realizado | teal |

### Diseño visual
- Cada tarjeta mantiene su estilo visual actual por defecto (colores distintivos por métrica)
- El título se reemplaza por un `<Select>` compacto (igual que el 6o card actual)
- Al cambiar la métrica, el color del borde y fondo se adapta a la métrica seleccionada

### Defaults y persistencia
- **Valores por defecto** (idénticos al estado actual): Total Ofertas, Confirmados, En Negociación, Fee Total Confirmados, Internacionales, Próximos 30 días
- Se guarda un array en `localStorage('booking_kpi_config')` con las 6 claves
- Si no hay nada guardado, usa los defaults

### Seguridad / Riesgos mitigados
- Sin cambios en datos ni lógica de negocio, solo presentación
- Si una clave guardada no existe (por actualización futura), se revierte al default de esa posición
- Los cálculos son los mismos que ya existen, solo se extraen a una función reutilizable

### Cambio técnico (1 archivo)

**`src/components/BookingKanban.tsx`**:
1. Crear un mapa `KPI_METRICS` con las 10 métricas: clave, label, función de cálculo, y estilos (color borde/fondo/texto)
2. Reemplazar los 6 `<div>` hardcodeados por un `.map()` sobre un array de 6 slots
3. Estado `kpiConfig` (array de 6 claves) inicializado desde `localStorage` con fallback a defaults
4. Cada slot renderiza un `<Select>` + el valor calculado, usando los estilos de la métrica seleccionada
5. Eliminar el estado `customKpiMetric` anterior (se absorbe en el nuevo sistema)

