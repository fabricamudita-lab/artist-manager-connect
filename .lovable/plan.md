

## Tarjeta KPI configurable con menú desplegable

### Concepto
Añadir una 6a tarjeta KPI en el hueco de CityZen que permite al usuario elegir qué métrica mostrar mediante un pequeño desplegable. La selección se guarda en `localStorage` para que persista entre sesiones.

### Métricas disponibles
1. **Próximos 30 días** -- cuenta de eventos confirmados en los próximos 30 días
2. **Cobros Pendientes** -- eventos realizados con cobro pendiente (>7 días)
3. **Tasa de Conversión** -- % de ofertas que llegan a confirmado/facturado/realizado
4. **Fee Medio** -- fee promedio de los confirmados

### Cambio técnico (1 archivo)

**`src/components/BookingKanban.tsx`**:
- Añadir un estado `customKpiMetric` con 4 opciones, inicializado desde `localStorage`
- Después de la tarjeta "Internacionales" (línea 820), insertar una nueva tarjeta con:
  - Un `<Select>` pequeño en la cabecera (en lugar del título fijo)
  - El valor calculado debajo según la métrica seleccionada
  - Estilo con borde teal/cyan para diferenciarlo visualmente
- Guardar la selección en `localStorage('booking_custom_kpi')`

### Resultado visual
Las 6 tarjetas quedan: Total Ofertas | Confirmados | En Negociación | Fee Total | Internacionales | **[Desplegable]**

