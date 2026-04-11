
## Fix: enlaces de alertas no navegan correctamente

### Problema
En `FinanzasPanelTab.tsx`, los botones de alerta usan `navigate('/finanzas?tab=presupuestos')` y `navigate('/finanzas?tab=cobros')`, pero el sistema de pestañas usa rutas basadas en path (`/finanzas/presupuestos`, `/finanzas/cobros`), no query params.

### Solución
Cambiar las dos llamadas a `navigate` en las líneas 114 y 121:

- Línea 114: `navigate('/finanzas?tab=cobros')` → `navigate('/finanzas/cobros')`
- Línea 121: `navigate('/finanzas?tab=presupuestos')` → `navigate('/finanzas/presupuestos')`

### Archivo
- `src/components/finanzas/FinanzasPanelTab.tsx` (2 líneas)
