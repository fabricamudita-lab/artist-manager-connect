

# Sistema robusto de cascada de anclas

## Problema actual

Cuando mueves una tarea (ej. Grabacion), el sistema solo detecta las tareas **directamente** ancladas a ella (ej. Mezcla). Pero no detecta que Mastering depende de Mezcla, ni que Label Copy depende de Mastering. Resultado: solo se mueve un nivel, rompiendo la cadena.

Ademas, no hay logica para distinguir entre mover hacia adelante (posponer, potencialmente problematico) y mover hacia atras (adelantar, generalmente seguro).

## Solucion propuesta

### 1. Cascada recursiva completa

Reemplazar `getDependentTasks` por una funcion `getFullDependencyChain` que recorra recursivamente todo el arbol de dependencias:

```text
Grabacion
  └─ Mezcla
      └─ Mastering
          └─ Label Copy
```

Al mover Grabacion, el dialogo mostrara las 3 tareas dependientes en forma de arbol jerarquico.

### 2. Logica inteligente segun direccion

**Mover hacia adelante (posponer):**
- Mostrar dialogo de confirmacion con advertencia visual (icono amarillo/rojo)
- Indicar claramente "Esto pospondra X tareas"
- Las tareas con fecha limite proxima se marcan con un indicador de riesgo
- Por defecto, todas seleccionadas pero con advertencia

**Mover hacia atras (adelantar):**
- Solo propagar si la nueva fecha de la tarea padre queda **despues** del inicio de la tarea hija (es decir, si hay conflicto de solapamiento)
- Si la tarea padre se adelanta pero sigue terminando antes del inicio de la hija, no se necesita mover la hija (no hay conflicto)
- Si hay conflicto, mostrar dialogo indicando cuales tareas necesitan ajustarse

### 3. Dialogo mejorado con contexto visual

El dialogo `AnchorDependencyDialog` se enriquece con:
- Estructura de arbol indentada para ver la jerarquia
- Fechas actuales y nuevas fechas propuestas para cada tarea
- Indicador de riesgo (icono de alerta) en tareas que quedarian muy cerca de la fecha de lanzamiento
- Diferenciacion visual entre "posponer" (amarillo/rojo) y "adelantar" (verde/neutro)

### 4. Propagacion proporcional

Las tareas en cascada se mueven por el mismo delta de dias que la tarea origen, preservando los gaps relativos entre ellas.

## Detalle tecnico

### Archivo: `src/pages/release-sections/ReleaseCronograma.tsx`

**a) Nueva funcion `getFullDependencyChain`:**
- Recorre recursivamente `workflows` buscando tareas cuyo `anchoredTo` incluya el ID actual
- Excluye tareas con `customStartDate` (fecha manual, no se propaga)
- Devuelve un arbol plano con nivel de profundidad para la UI
- Proteccion contra ciclos con un Set de IDs visitados

**b) Nueva logica en `handleTaskDateUpdate`:**
- Calcular `daysDelta`
- Obtener cadena completa con `getFullDependencyChain`
- Si `daysDelta > 0` (posponer): mostrar dialogo con todas las dependencias en cascada
- Si `daysDelta < 0` (adelantar): filtrar solo las tareas donde haya conflicto real (la nueva fecha fin del padre > inicio de la hija) y mostrar dialogo solo si hay conflictos
- Si no hay dependientes afectados: aplicar directamente sin dialogo

**c) Actualizar `handleAnchorConfirm`:**
- Aplicar el delta a todas las tareas seleccionadas de la cadena completa, no solo las directas

**d) Mejorar `AnchorDependencyDialog`:**
- Agregar prop `direction` ('adelante' | 'atras')
- Agregar prop `depth` a cada tarea dependiente para mostrar indentacion
- Agregar prop `newDate` calculada para cada tarea
- Mostrar badge de riesgo si la nueva fecha queda a menos de 7 dias del lanzamiento
- Mostrar las fechas: fecha actual (tachada) y nueva fecha propuesta

### Archivo: `src/components/lanzamientos/AnchorDependencyDialog.tsx`

Actualizar la interfaz y el renderizado:
- `DependentTask` ahora incluye `depth`, `currentDate`, `newDate`
- Renderizar con indentacion visual por nivel (`ml-{depth * 4}`)
- Mostrar fechas comparativas (antes/despues)
- Icono de advertencia para tareas que se posponen cerca del release

