

## Aplicar el diseno del mockup v3 a las pestanas del proyecto

El archivo `moodita_proyectos_v3.jsx` contiene un prototipo completo con un diseno visual muy especifico para cada pestana. Hay que adaptar los 5 componentes de pestana existentes para que reproduzcan fielmente ese diseno, usando Tailwind/Shadcn UI en lugar de inline styles.

---

### 1. Workflows Tab - Rediseno completo

**Archivo: `src/components/project-detail/ProjectWorkflowsTab.tsx`**

Cambios principales respecto al estado actual:
- **Banner**: Cambiar de `border-primary/20 bg-primary/5` a `bg-blue-500/8 border-blue-500/20` con texto azul claro para el titulo
- **Stepper interactivo**: Los circulos de fase deben ser **botones clickables** (el mockup muestra `onClick` para cambiar estado). Cada circulo:
  - Completado: borde verde tenue + check verde dentro, sin fill
  - Actual: circulo con fill del color del estado + punto negro pequeno centrado
  - Futuro: circulo con borde gris, vacio
- **Labels de fase**: 9px, `whitespace-nowrap`, colores segun estado
- **Preview de acciones**: Fondo `bg-green-500/6` con borde `border-green-500/15`, chips truncados a 40 caracteres con "..."
- **Workflow triggers mejorados**: Usar el `WORKFLOW_TRIGGERS` del mockup que incluye `resp` (responsable), `plazo` y `prio` por cada accion, no solo texto plano. Actualizar `NEXT_ACTIONS_MAP` a este formato enriquecido
- **Layout entidad**: Icono 22px + titulo 13px bold + subtitulo "Label . fecha . modulo"

---

### 2. Pulso Tab - Ajustes de fidelidad

**Archivo: `src/components/project-detail/ProjectPulseTab.tsx`**

Ajustes para coincidir con el mockup:
- **KPI Cards**: Padding 14px, emoji 20px, valor 28px font-weight 900, label 12px bold, subtitle 10px muted. Colores del valor contextuales (verde si 0, rojo/ambar si >0)
- **Proximas Acciones**: Background `bg-background` (T.bg) para cada item de tarea, borde fino, punto de 8px (no 2px). Mostrar la entidad vinculada como chip con color e icono del tipo. Mostrar responsable como texto muted. Badges URGENTE/BLOQUEADA en 10px bold
- **Imprevistos activos**: Borde izquierdo de 3px segun impacto. Titulo + badge de impacto en la misma fila. Descripcion truncada a 100 chars + "..."
- **Dudas sin respuesta**: Cards con borde izquierdo ambar si urgente, icono circular (24px) con emoji, texto de pregunta, chip de entidad + "dirigida a" + badge urgente
- **Resumen economico**: Anadir seccion al final con 4 KPIs financieros (fee confirmado, syncs en negociacion, total en negociacion, cobrado vs pendiente) - calcular desde linkedEntities

---

### 3. Imprevistos Tab - Rediseno segun mockup

**Archivo: `src/components/project-detail/ProjectIncidentsTab.tsx`**

Cambios:
- **Header**: Reemplazar boton "Nuevo" por fila con 3 indicadores de estado en linea (Abiertos: punto rojo + N, En resolucion: punto ambar + N, Resueltos: punto verde + N) + boton "+ Registrar imprevisto" a la derecha
- **Cards de imprevisto**: Borde izquierdo de 3px coloreado segun impacto (no el borde completo). Titulo + badge impacto + badge estado en la misma fila
- **Opciones de resolucion**: Anadir campo `acciones_posibles` (array de strings) a cada imprevisto. Mostrar como lista con flechas "→" antes de cada opcion
- **Acciones**: "Marcar en resolucion" (outline) y "Marcar resuelto" (primary) segun estado actual
- **Resueltos**: Ocultar dentro de `<details>` / Collapsible con "Mostrar N resueltos"
- **Form de creacion**: Inline dentro de una Card (no un Dialog), con borde rojo tenue, campos de titulo, descripcion (textarea), select de impacto, input de responsable

---

### 4. Dudas Tab - Rediseno segun mockup

**Archivo: `src/components/project-detail/ProjectQuestionsTab.tsx`**

Cambios:
- **Header**: Reemplazar por fila con conteos inline "N urgentes . N sin respuesta . N respondidas" + boton "+ Anadir duda" a la derecha
- **Cards de duda**: Borde izquierdo de 3px (ambar si urgente, gris si normal). Icono circular 24px con emoji (exclamacion si urgente, bocadillo si normal). Texto de pregunta. Chips: entidad vinculada + "dirigida a" + responsable + badge URGENTE
- **Acciones**: Boton "Respondida" (primary small) a la derecha de cada duda
- **Respondidas**: Ocultar dentro de `<details>` / Collapsible con opacidad reducida
- **Form de creacion**: Inline Card (no Dialog), con borde ambar tenue. Textarea para pregunta, input "dirigida a", input "responsable", checkbox "Es urgente (bloquea una decision)"

---

### 5. Workflow Toast (nuevo componente)

**Nuevo archivo: `src/components/project-detail/WorkflowToast.tsx`**

Cuando se cambia el estado de una entidad desde el Workflows tab, mostrar un toast/panel flotante en la esquina inferior derecha con:
- Icono + titulo de la transicion (ej: "Show confirmado")
- Subtitulo: "Se han activado N acciones automaticamente"
- Lista de acciones con punto de color segun prioridad, texto, responsable + plazo, y chip de prioridad
- Botones: "Anadir al checklist" (primary) + "Ignorar" (ghost)

---

### Resumen de archivos a modificar

| Archivo | Tipo de cambio |
|---------|----------------|
| `src/components/project-detail/ProjectWorkflowsTab.tsx` | Reescritura - stepper interactivo, triggers enriquecidos |
| `src/components/project-detail/ProjectPulseTab.tsx` | Ajustes de estilo + seccion financiera |
| `src/components/project-detail/ProjectIncidentsTab.tsx` | Rediseno - inline form, borde izquierdo, opciones resolucion |
| `src/components/project-detail/ProjectQuestionsTab.tsx` | Rediseno - inline form, borde izquierdo, layout mejorado |
| `src/components/project-detail/WorkflowToast.tsx` | **Nuevo** - toast de transicion de workflow |

No se modifican tablas de base de datos ni `ProjectDetail.tsx` (los props ya estan correctos).

