

## Plan: Limitar opciones del selector según contexto

### Problema
Actualmente el `ContractTypeSelector` muestra siempre las dos opciones (Booking + IP License) en todos los contextos. En la sección de contratos de un lanzamiento discográfico, solo debería aparecer la opción de Licencia de Propiedad Intelectual.

### Cambios

**1. `src/components/ContractTypeSelector.tsx`**
- Añadir prop opcional `showBooking?: boolean` (default `true`)
- Condicionar la renderización de la card "Contrato de Booking" a `showBooking`
- Si solo hay una opción visible, se sigue mostrando el diálogo (para consistencia y extensibilidad futura)

**2. `src/pages/release-sections/ReleaseContratos.tsx`**
- Pasar `showBooking={false}` al `ContractTypeSelector`

**3. Sin cambios en:**
- `src/pages/Documents.tsx` — sigue mostrando ambas opciones
- `src/components/booking-detail/BookingDocumentsTab.tsx` — sigue mostrando ambas opciones

