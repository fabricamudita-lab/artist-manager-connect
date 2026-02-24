
## Rediseno del Proyecto segun el mockup original

### Cambios en el Header (ProjectDetail.tsx, lineas ~1157-1260)

**Progreso + Badges de alerta inline**
- Debajo del titulo/artista/fechas, anadir una barra de progreso de tareas completadas con el porcentaje a la derecha
- A la derecha del porcentaje, mostrar 3 badges de alerta en linea:
  - `🔥 X urgentes` (rojo) - tareas urgentes no completadas
  - `⚡ X imprevistos` (verde/emerald) - incidentes abiertos
  - `❓ X dudas` (borde outline) - dudas sin respuesta
- Los badges solo aparecen si el conteo es > 0

**Botones del header**
- Cambiar "Vincular entidad" a "Vincular" con icono de link (mas compacto, estilo outline con borde primary)
- Mantener "+ Crear" como boton solido verde/primary

---

### Reorganizacion de Tabs (ProjectDetail.tsx, lineas ~1460-1536)

Nuevo orden de tabs segun el mockup:
1. **Pulso** (con badge de alertas criticas)
2. **Workflows** (con icono ⚡)
3. **Checklist** (con badge de conteo de tareas pendientes) -- mover el ChecklistManager dentro del tab
4. **Imprevistos** (con badge de abiertos)
5. **Dudas** (con badge de abiertas)
6. **Cronograma**
7. **Finanzas**
8. **Archivos**

Tabs a eliminar de la lista visible (su contenido se redistribuye):
- "Vista General" (su info ya esta en Pulso y en el header)
- "Contratos", "Solicitudes", "Presupuestos", "Aprobaciones", "Notas" se mueven como sub-secciones dentro de Finanzas o se mantienen pero al final

Mover `ProjectChecklistManager` de su posicion actual (linea 1454) a dentro del `TabsContent value="checklist"`.

---

### Rediseno del tab Pulso (ProjectPulseTab.tsx)

Cambio completo del layout para coincidir con el mockup:

**5 KPI Cards en una fila** (grid de 5 columnas):
1. 💚 Salud del proyecto - `30%` / "Necesita atencion" (con icono de corazon verde, valor en color segun salud)
2. 🔥 Tareas urgentes - `2` / "de 5 pendientes"
3. 🚧 Tareas bloqueadas - `2` / "esperando otra accion"
4. ⚡ Imprevistos abiertos - `2` / "1 criticos"
5. ❓ Dudas sin respuesta - `3` / "2 urgentes"

Cada card tiene:
- Icono grande (emoji) arriba a la izquierda
- Valor numerico grande debajo en color contextual (verde, rojo, ambar, etc.)
- Titulo en texto blanco/foreground debajo
- Subtitulo en muted-foreground

**Seccion inferior en 2 columnas**:

**Columna izquierda: "PROXIMAS ACCIONES"**
- Header con titulo en uppercase tracking-wider y badge de conteo
- Lista de tareas pendientes ordenadas por urgencia/fecha
- Cada tarea muestra:
  - Punto de color segun prioridad (rojo = urgente, azul = normal)
  - Titulo de la tarea + nombre de entidad vinculada
  - Badge de la entidad (ej: "Sala El Sol -- Madrid") con icono
  - Etapa (Produccion, Admin) + badge URGENTE si aplica + badge BLOQUEADA si aplica
  - Fecha a la derecha

**Columna derecha: "IMPREVISTOS ACTIVOS"**
- Header en uppercase con badge de conteo (color rojo/destructive)
- Cards de imprevistos con:
  - Titulo
  - Badge de severidad (Alto = ambar, Critico = rojo)
  - Descripcion truncada
  - Categoria + fecha

**Debajo: "DUDAS SIN RESPUESTA"**
- Header en uppercase con badge de conteo
- Lista similar de dudas pendientes

---

### Detalles tecnicos

**Archivos a modificar:**

1. **`src/pages/ProjectDetail.tsx`**
   - Header: Anadir Progress bar + badges de alerta despues de la seccion de fechas/equipo (antes de los botones de accion)
   - Tabs: Reorganizar el orden, anadir tab "checklist", mover ChecklistManager dentro del tab
   - Cambiar texto "Vincular entidad" a "Vincular"

2. **`src/components/project-detail/ProjectPulseTab.tsx`**
   - Reescritura completa del layout para coincidir con el mockup
   - 5 KPI cards con emojis grandes y valores coloridos
   - Seccion "Proximas Acciones" con tareas del proyecto y sus entidades vinculadas
   - Seccion "Imprevistos Activos" mostrando los incidentes abiertos inline
   - Seccion "Dudas sin respuesta" mostrando preguntas abiertas inline
   - Pasar `linkedEntities` como prop para mostrar el contexto de cada tarea

3. **No se crean archivos nuevos ni se modifican tablas** - todo es reorganizacion visual de datos existentes
