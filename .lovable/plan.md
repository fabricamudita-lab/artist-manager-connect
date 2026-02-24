
## Rediseno completo del Motor de Workflows

El tab "Workflows" actual muestra un pipeline basado en etapas de tareas (Preparativos, Produccion, Cierre). El mockup muestra algo completamente diferente: un **motor de workflows centrado en entidades vinculadas**, donde cada entidad del proyecto muestra su fase actual en un stepper horizontal, con una previsualizacion de las tareas que se activaran al avanzar de fase.

---

### Diseno visual segun el mockup

**1. Banner explicativo (parte superior)**
- Card con fondo sutil y borde
- Titulo: "⚡ Motor de workflows"
- Texto: "Cuando cambias el estado de una entidad, el sistema detecta la transicion y activa automaticamente las tareas que corresponden segun el workflow de la industria musical. Pruebalo: cambia el estado de cualquier entidad abajo."

**2. Lista de entidades vinculadas con stepper de fases**

Cada entidad vinculada se muestra como una card/fila con:
- **Izquierda**: Emoji del tipo de entidad (ej: microfono para Show) + nombre en negrita (ej: "La Nau -- Barcelona") + subtitulo (tipo + fecha + entidad)
- **Derecha**: Stepper horizontal con las fases del tipo de entidad

Stepper visual para cada fase:
- **Completada**: Circulo verde con check blanco, label verde debajo
- **Actual**: Circulo grande relleno del color de la fase (azul para Interes, ambar para Negociacion, verde para Confirmado), label en color y negrita debajo
- **Futura**: Circulo vacio con borde gris, label gris debajo

Fases para tipo "show" (booking): Interes, Negociacion, Confirmado, Completado, Cancelado
Fases para tipo "release": Produccion, Masterizado, Distribucion, Lanzado
Fases para tipo "sync": Solicitud, Cotizacion, Negociacion, Licencia Firmada, Facturado

**3. Preview de "proximas acciones" (debajo de cada entidad)**

Si la entidad NO esta en su fase final, mostrar un recuadro con borde izquierdo de color:
- Texto: "Si avanzas a **[siguiente fase]**, se activaran:"
- Chips/badges con tareas que se activarian (truncadas con "...")
- Si hay mas de 3, mostrar "+X mas"

Las tareas sugeridas son estaticas por tipo de entidad y fase (hardcoded), representando best practices de la industria musical:
- Show: Interes -> Negociacion: "Enviar disponibilidad de fechas...", "Compartir rider tecnico...", "Solicitar condiciones economicas..."
- Show: Negociacion -> Confirmado: "Solicitar contrato firmado...", "Facturar anticipo del 50%...", "Anadir al plan de PR..."
- etc.

---

### Cambios tecnicos

**Archivo a modificar: `src/components/project-detail/ProjectWorkflowsTab.tsx`**

Reescritura completa:
- Cambiar props: recibir `linkedEntities` ademas de `tasks`, `budgets`, `solicitudes`
- Definir mapa de fases por tipo de entidad (ENTITY_PHASE_MAP)
- Definir mapa de acciones sugeridas por transicion (NEXT_ACTIONS_MAP)
- Determinar fase actual de cada entidad a partir de `entity_status`
- Renderizar el banner explicativo
- Renderizar cada entidad con su stepper horizontal y preview de acciones
- Estado vacio: si no hay entidades vinculadas, mostrar mensaje invitando a vincular

**Archivo a modificar: `src/pages/ProjectDetail.tsx`**

- Pasar `linkedEntities` como prop al `ProjectWorkflowsTab`:
  ```
  <ProjectWorkflowsTab
    tasks={tasks}
    budgets={budgets}
    solicitudes={solicitudes}
    linkedEntities={linkedEntities}
  />
  ```

No se crean archivos nuevos ni tablas. Es una reorganizacion visual del componente existente usando datos que ya estan disponibles.
