

## Capital Gestionado: desglose contextual según filtro de artista

### Problema
Cuando se filtra por un artista específico, al hacer clic en "Capital Gestionado" se abre el panel mostrando **todos** los artistas. No tiene sentido ver el desglose por artista cuando ya has filtrado por uno.

### Solución
Comportamiento condicional del panel "Capital Gestionado":

- **Sin filtro (todos los artistas)**: se muestra el panel actual — desglose por artista (sin cambios).
- **Con artista filtrado**: se muestra un **desglose por tipo de presupuesto** del artista seleccionado (Concierto, Producción, Videoclip, Campaña, etc.), con barras de progreso, importes y conteo de presupuestos por tipo.

### Cambios técnicos

**1. Nuevo componente `src/components/finanzas/CapitalByTypePanel.tsx`**
- Panel lateral (Sheet) con título "Capital — [Nombre Artista]"
- Agrupa los presupuestos del artista por `type`
- Muestra por cada tipo: icono/color, nombre, cantidad de presupuestos, importe total, barra proporcional
- Total al final

**2. `src/pages/Budgets.tsx`**
- Pasar `filterArtist` al handler de `handleCardClick`
- Si `filterArtist !== 'all'`: abrir `CapitalByTypePanel` en vez de `CapitalByArtistPanel`
- Pasar los budgets ya filtrados y el nombre del artista al nuevo panel

**3. `src/components/finanzas/CapitalByArtistPanel.tsx`**
- Sin cambios (sigue funcionando cuando no hay filtro de artista)

### Resultado
Con filtro de artista activo, el panel muestra información relevante (distribución del capital por tipo de proyecto) en vez de redundar con un solo artista en la lista.

