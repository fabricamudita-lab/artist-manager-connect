

## Sugerencias Automaticas de Tareas en "Requiere Atencion"

Actualmente, la seccion "Requiere Atencion" del Dashboard detecta problemas (booking sin contrato, solicitud antigua, evento sin booking) pero solo muestra alertas pasivas. El objetivo es convertir cada alerta en una **sugerencia accionable** con un boton que permita resolver el problema directamente.

### Diseno

Cada tipo de atencion tendra una o mas **acciones sugeridas** asociadas:

| Tipo de alerta | Acciones sugeridas |
|---|---|
| Booking sin contrato | "Solicitar contrato", "Generar contrato" |
| Solicitud pendiente >48h | "Responder solicitud", "Rechazar solicitud" |
| Evento sin booking | "Crear booking para evento" |

### Cambios

**1. `src/components/dashboard/OwnerDashboard.tsx`**

- Ampliar la interfaz `AttentionItem` con un campo `suggestedActions`:
  ```text
  suggestedActions: { label: string; route: string; variant?: 'default' | 'outline' }[]
  ```

- Al construir cada `AttentionItem`, incluir las acciones sugeridas segun el tipo:
  - `booking_sin_contrato`: boton "Solicitar contrato" que navega a `/booking/{id}?tab=documentos` y boton "Generar contrato" que navega a `/booking/{id}?tab=documentos&action=generate`
  - `solicitud_antigua`: boton "Responder" que navega a `/solicitudes?id={id}&action=respond`
  - `evento_sin_roadmap`: boton "Crear booking" que navega a `/booking?nuevo=true&event_id={id}`

- Modificar el renderizado de cada item de atencion para mostrar los botones de accion sugerida debajo del texto, con estilo compacto (botones pequenos con iconos)

**2. Estilo visual**

- Cada item de atencion pasara de ser una fila simple a tener dos lineas: la alerta arriba y las acciones sugeridas abajo
- Los botones seran `size="sm"` con variante `outline` o `default` segun prioridad
- Iconos relevantes: FileText para contrato, Reply para responder, Plus para crear
- Se mantiene la navegacion con click en la fila completa, pero los botones de accion navegan a rutas especificas con parametros

### Resultado

- Las alertas del dashboard pasan de ser informativas a accionables
- Un click en "Solicitar contrato" lleva directamente a la pestana de documentos del booking
- Un click en "Responder" lleva a la solicitud con el dialogo de respuesta
- La seccion se convierte en un centro de tareas sugeridas inteligente
