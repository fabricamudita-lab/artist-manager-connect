

## Plan: Validación clara de campos obligatorios en CreateBookingWizard

### Contexto

El wizard `CreateBookingWizard` (usado en `/booking`) actualmente solo deshabilita el botón "Siguiente/Crear" cuando faltan campos obligatorios (`canProceed()`), sin decir **qué** falta. El usuario quiere:
1. Aviso explícito de qué campos faltan.
2. Asteriscos `*` en todos los campos obligatorios.
3. **Hora y Fee NO obligatorios en fase Interés**, sí obligatorios en fase Oferta+.

Las peticiones extra (índices DB, Zod backend, paginación, RLS, esquema) **no aplican** aquí: esto es validación de UI sobre un formulario que ya inserta en `booking_offers` (tabla existente con RLS). No se crean tablas, no hay listados nuevos, no hay endpoint backend nuevo. Lo digo por transparencia para no inflar el cambio.

### Reglas de obligatoriedad por fase

La fase se determina por `dealData.estado` mapeado a `phase` (línea 283-289):
- `pendiente` → `interes`
- `oferta` → `oferta`
- `negociacion`, `confirmado` → exigen lo mismo que oferta+

| Campo | Interés | Oferta / Negociación / Confirmado |
|---|---|---|
| Fecha | ✱ | ✱ |
| Venue **o** Festival/Ciclo | ✱ (uno de los dos) | ✱ |
| Contacto/Buyer | ✱ | ✱ |
| Artista | ✱ | ✱ |
| **Hora** | opcional | ✱ |
| **Fee / Door split %** | opcional | ✱ |

(Confirmado ya tiene reglas adicionales en `bookingValidations.ts` — no se tocan.)

### Cambios en `src/components/CreateBookingWizard.tsx`

1. **Función `getMissingFields()`**: recorre los 3 pasos y devuelve lista de campos faltantes con etiqueta legible, considerando la fase elegida en step Deal (o asumiendo Interés mientras no se haya pasado por step Deal).
2. **Reemplazar `canProceed()`** para usar la nueva lógica condicional por fase.
3. **Asteriscos `*`**: añadir en `Hora` y `Fee/Door split` solo cuando `estado !== 'pendiente'` (renderizado condicional). El resto de obligatorios ya tienen `*`, salvo:
   - `Contacto` en step Buyer (añadir `*` al label "Seleccionar Promotor/Buyer").
4. **`handleSubmit`**: al inicio, si `getMissingFields()` no está vacío, mostrar `toast` destructivo con el mensaje:
   > "Faltan campos obligatorios: Fecha, Hora, Fee" (lista concreta) y **no** insertar.
5. **Botón "Siguiente"**: al pulsarlo con campos faltantes del paso actual, mostrar `toast` listando qué falta en ese paso (en vez de quedarse mudo y deshabilitado). Mantenerlo habilitado para que el toast pueda dispararse.
6. **Banner inline opcional** (ligero): debajo del título de cada paso, si hay faltantes, un `<div>` rojo con la lista. Mejora UX sin reescribir el layout.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/CreateBookingWizard.tsx` | Validación condicional por fase, asteriscos dinámicos, toast con lista concreta, banner inline |

Sin cambios de schema, sin migración, sin edge functions.

