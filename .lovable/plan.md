
# Alertas de incongruencia en BookingDetail

## Contexto

En la vista de detalle de un booking, si hay inconsistencias entre la fase/estado y la fecha o las aprobaciones, el usuario no recibe ninguna indicacion visual. Ejemplos:
- Un booking en "Negociacion" cuya fecha ya paso hace semanas deberia estar facturado o al menos confirmado.
- Un booking "Confirmado" que no tiene la disponibilidad o viabilidad completada.

## Cambio

En `src/pages/BookingDetail.tsx`, justo debajo de los badges de fase/artista (linea ~267, tras el cierre del div de badges), agregar un bloque de alertas condicionales:

### Alerta 1: Fase atrasada respecto a la fecha
- **Condicion**: La fecha del booking es anterior a hoy Y la fase es `interes`, `oferta` o `negociacion` (fases que no deberian tener eventos pasados).
- **Mensaje**: Icono AlertTriangle + "Este evento ya paso (fecha). Deberia estar en fase Confirmado o Facturado."
- **Estilo**: Banner amber/warning con borde, debajo del header.

### Alerta 2: Confirmado sin viabilidad completa
- **Condicion**: La fase es `confirmado` Y alguna de las 3 aprobaciones de viabilidad es `false`.
- **Mensaje**: Icono AlertTriangle + "Este evento esta confirmado pero faltan aprobaciones de viabilidad (X/3)."
- **Estilo**: Banner amber/warning.

### Alerta 3: Confirmado sin disponibilidad (opcional, si el dato esta disponible)
- Se evalua si se puede detectar disponibilidad pendiente desde los datos ya cargados.

## Detalle tecnico

- Solo se modifica `src/pages/BookingDetail.tsx`.
- Se importa `AlertTriangle` (ya importado) y `Alert`/`AlertDescription` de `@/components/ui/alert`.
- Las alertas se renderizan como `Alert` con `variant="destructive"` y estilos amber, dentro del bloque del header despues de las fechas opcionales.
- Logica de fecha pasada: `booking.fecha && new Date(booking.fecha + 'T23:59:59') < new Date()` y `['interes','oferta','negociacion'].includes(booking.phase)`.
- Logica de viabilidad incompleta: `booking.phase === 'confirmado' && !(booking.viability_manager_approved && booking.viability_tour_manager_approved && booking.viability_production_approved)`.
