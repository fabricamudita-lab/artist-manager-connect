

## Ampliar Automatizaciones con Knowledge Base Completa

### Resumen
El documento define automatizaciones para todos los modulos que actualmente estan vacios o incompletos. De las ~50 automatizaciones descritas en el documento, ya hay 21 implementadas. Se anadiran ~30 nuevas.

### Nuevas automatizaciones por modulo

**Booking (6 nuevas)**
- `booking_offer_at_risk`: Oferta en riesgo (+5 dias sin movimiento en Interes, diferente de la existente de +3 dias)
- `booking_formal_offer_no_response`: Oferta formal sin respuesta del promotor (+7 dias)
- `booking_offer_no_rider`: Oferta sin rider adjunto al enviar oferta formal
- `booking_accommodation_pending`: Alojamiento sin confirmar (14 dias antes)
- `booking_event_reminder`: Recordatorio general del evento al equipo (7 dias antes)
- `booking_real_expenses_missing`: Gastos reales no registrados (+3 dias post-evento)

**Hojas de Ruta (4 nuevas)**
- `roadmap_production_incomplete`: Produccion tecnica sin completar (21 dias antes)
- `roadmap_travel_incomplete`: Logistica de viaje y alojamiento sin completar (14 dias antes)
- `roadmap_send_to_promoter`: Enviar HdR definitiva al promotor (3 dias antes)
- `roadmap_event_day_reminder`: Enviar HdR al artista el dia del evento

**Finanzas (4 nuevas)**
- `finance_sgae_quarterly`: Liquidacion de SGAE esperada sin registrar (trimestral)
- `finance_uncategorized_expenses`: Gastos de gira sin categorizar (mensual)
- `finance_quarterly_tax_prep`: Recordatorio de preparacion fiscal (inicio trimestre)
- `finance_annual_review`: Recordatorio de revision contable anual

**Presupuestos (4 nuevas)**
- `budget_tour_missing`: Gira con conciertos confirmados sin presupuesto de gira
- `budget_deviation_alert`: Desviacion real vs presupuestado mayor del 15%
- `budget_project_start`: Recordatorio de crear presupuesto al iniciar proyecto
- `budget_project_close`: Recordatorio de comparar presupuesto vs real al cerrar proyecto

**Discografica (3 nuevas)**
- `release_distributor_delivery`: Entrega al distribuidor pendiente (4 semanas antes)
- `release_spotify_pitch`: Pitch a Spotify editorial pendiente (7 semanas antes)
- `release_artwork_pending`: Artwork sin aprobar (6 semanas antes)

**Sincronizaciones (5 nuevas)**
- `sync_contract_unsigned`: Contrato de sync sin firma (+7 dias)
- `sync_request_no_response`: Solicitud de sync sin respuesta (+3 dias)
- `sync_materials_pending`: Entrega de materiales pendiente (+2 dias tras confirmar)
- `sync_payment_pending`: Pago de sync pendiente (+30 dias)
- `sync_check_rights`: Brief recibido, consultar disponibilidad de derechos

**Artistas (7 nuevas - modulo actualmente vacio)**
- `artist_bio_outdated`: Bio no actualizada en +18 meses
- `artist_photos_outdated`: Fotos de prensa no actualizadas en +18 meses
- `artist_no_release`: Sin lanzamiento en los ultimos 12 meses
- `artist_no_concerts`: Sin conciertos en los proximos 60 dias
- `artist_contract_expiry`: Contrato de management proximo a vencer (90 dias antes)
- `artist_contract_anniversary`: Aniversario de contrato, recordatorio de revision
- `artist_quarterly_tax`: Declaracion trimestral de autonomos pendiente

### Cambios tecnicos

**Archivo a modificar: `src/lib/automationDefinitions.ts`**
- Anadir las ~33 nuevas definiciones al array `AUTOMATIONS`
- Cada una con sus valores por defecto extraidos del documento (trigger days, rol, industry tip, CTA label)
- Marcar como `recommended: true` las que el documento marca con icono rojo, y `recommended: false` las verdes

No se requieren cambios en la base de datos, hook ni UI: el sistema existente renderiza dinamicamente desde el array de definiciones.

### Total final
De 21 automatizaciones actuales a ~54 automatizaciones, cubriendo completamente los 7 modulos del Knowledge Base.
