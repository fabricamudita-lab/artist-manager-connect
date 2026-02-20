

# Reestructuración del Detalle de Booking

5 mejoras para simplificar la pantalla y priorizar la información crítica.

---

## 1. Fusionar Documents + Archivos en una sola tab

**Problema**: Dos tabs separadas para conceptos similares (Documents = contratos/riders generados; Archivos = explorador de carpetas del Drive). El usuario tiene que adivinar dónde está cada cosa.

**Solución**: Una sola tab **"Archivos & Docs"** con dos sub-secciones internas usando un mini-tab o collapsible.

### Cambios

**`src/pages/BookingDetail.tsx`**:
- Eliminar las tabs `documents` y `drive` del `TabsList`
- Reemplazarlas por una sola tab `files` con label "Archivos & Docs"
- El `TabsContent` de `files` renderiza un nuevo componente `BookingFilesDocsTab`
- El `TabsList` pasa de `grid-cols-6` a `grid-cols-5`

**Nuevo archivo `src/components/booking-detail/BookingFilesDocsTab.tsx`**:
- Componente wrapper que contiene un mini `Tabs` interno con dos sub-tabs:
  - **"Contratos & Docs"** -- renderiza `BookingDocumentsTab`
  - **"Explorador"** -- renderiza `BookingDriveTab`
- Recibe todas las props necesarias para ambos componentes hijos
- Los componentes `BookingDocumentsTab` y `BookingDriveTab` no se modifican internamente

---

## 2. Mover Viabilidad al header (Quick Stats Bar)

**Problema**: "Viabilidad 3/3" es información de decision que esta enterrada al fondo del sidebar. Es lo primero que un manager mira para decidir si avanza con un booking.

**Solución**: Reemplazar la 4a tarjeta del Quick Stats Bar (Facturacion, que es menos urgente) por un indicador de Viabilidad, y mover Facturacion al Overview tab.

### Cambios

**`src/pages/BookingDetail.tsx`**:
- Quick Stats Bar: Reemplazar la 4a card (Facturacion) por Viabilidad:
  - Muestra `X/3` con colores (verde si 3/3, ambar si parcial, gris si 0)
  - Clickable: hace scroll a `viabilityRef` en el sidebar
  - Solo visible en fases `negociacion`, `confirmado`, `facturado`; en fases anteriores muestra Facturacion como estaba
- Mover la info de "Facturacion" al `BookingOverviewTab` como un campo mas en el Deal Summary

**`src/components/booking-detail/BookingOverviewTab.tsx`**:
- Anadir el campo `estado_facturacion` al interface de props
- Mostrar "Estado Facturacion" en el Deal Summary card, junto a Contrato

---

## 3. Reemplazar "Gastos Est. -" por placeholder activo

**Problema**: La tarjeta muestra "Gastos Est. -" cuando no hay datos, comunicando "incompleto" sin aportar valor.

**Solución**: Si `gastos_estimados` es null/0, mostrar un boton "+Estimar gastos" que abre el dialog de edicion. Si tiene valor, mostrar normalmente.

### Cambios

**`src/pages/BookingDetail.tsx`**:
- En la 2a card del Quick Stats Bar (Gastos Est.):
  - Si `booking.gastos_estimados` tiene valor: mostrar como ahora
  - Si no tiene valor: mostrar un boton con icono `+` y texto "Estimar gastos" que llama a `setShowEditDialog(true)` para abrir el formulario de edicion del booking

---

## 4. Unificar notas con toggle de privacidad

**Problema**: "Notas del Artista" (campo `info_comentarios`, texto plano visible para el artista) y "Notas Internas" (campo `notas`, JSON array, solo equipo) estan separadas en dos cards que conceptualmente hacen lo mismo.

**Solución**: Una sola card "Notas" con un selector de visibilidad. Las notas internas (thread de mensajes del equipo) se mantienen como estan. Las "notas del artista" se convierten en un campo tipo "Notas visibles" con un indicador claro.

### Cambios

**`src/components/booking-detail/BookingOverviewTab.tsx`**:
- Eliminar el grid de 2 columnas con las dos cards de notas
- Reemplazar por una sola card "Notas" que contiene:
  - Un `Tabs` interno con dos sub-tabs:
    - **"Equipo"** (icono candado) -- renderiza `BookingNotes` (el thread interno existente, sin cambios)
    - **"Artista"** (icono ojo) -- renderiza el textarea de notas del artista con su boton guardar
  - Cada tab tiene un subtitulo aclaratorio: "Solo visible para el equipo" / "Visible para el artista"
- El componente `BookingNotes` no cambia internamente
- El grid pasa a ser una sola card de ancho completo

---

## 5. Reordenar sidebar por urgencia

**Problema**: El orden actual es Disponibilidad, Viabilidad, Archivos Vinculados, Historial. La Viabilidad ya se mueve al header (punto 2), asi que queda espacio.

**Sololucion**: Reordenar el sidebar con la logica de "lo que bloquea primero":

1. **Disponibilidad del Equipo** (bloquea el show si alguien no puede)
2. **Viabilidad** (se mantiene aqui como detalle expandible, aunque el resumen ya esta en el header)
3. **Archivos Vinculados** (contexto rapido)
4. **Historial** (consulta historica, lo menos urgente)

### Cambios

**`src/pages/BookingDetail.tsx`**:
- El sidebar ya tiene este orden exacto (lineas 614-639). **No hay cambio necesario** -- ya esta ordenado por urgencia. Lo que faltaba era subir Viabilidad al header (punto 2), que ya se resuelve.

---

## Resumen de archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/BookingDetail.tsx` | Fusionar 2 tabs en 1, Quick Stats viabilidad, placeholder gastos activo, sidebar sin cambio de orden |
| `src/components/booking-detail/BookingFilesDocsTab.tsx` | **Nuevo**: wrapper con sub-tabs Contratos y Explorador |
| `src/components/booking-detail/BookingOverviewTab.tsx` | Unificar notas con tabs internas, anadir campo facturacion |

Sin tocar: `BookingDocumentsTab`, `BookingDriveTab`, `BookingNotes`, `ViabilityChecksCard`, `AvailabilityStatusCard`, `BookingFilesWidget`, `BookingHistorySection`. Todos se reusan tal cual.

