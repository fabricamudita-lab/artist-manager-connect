
## Navegacion contextual desde el Centro de Tareas con resaltado visual

### Que cambia

Cuando el usuario hace clic en "Ir a Cronograma" (o cualquier seccion) desde el Centro de Tareas, la pagina destino recibira un parametro `?alert=<alertId>` en la URL. Cada seccion leera ese parametro y ejecutara una accion contextual:

### Mapeo de alertas a acciones

| Alert ID | Seccion | Accion |
|---|---|---|
| `cronograma-upcoming` | Cronograma | Abre todas las secciones, hace scroll a las tareas proximas a vencer y las resalta con un anillo pulsante |
| `cronograma-delayed` | Cronograma | Abre todas las secciones, hace scroll a las tareas retrasadas y las resalta |
| `cronograma-empty` | Cronograma | Abre automaticamente el wizard de creacion de cronograma |
| `credits-missing` | Creditos | Hace scroll al primer track sin creditos y lo resalta con un borde pulsante; muestra un banner superior "X canciones pendientes de inscribir creditos" |
| `audio-missing` | Audio | Hace scroll al primer track sin archivo de audio y lo resalta; muestra banner invitando a subir archivos |
| `budget-empty` | Presupuestos | Abre automaticamente el dialogo de crear presupuesto |
| `budget-over` | Presupuestos | Resalta la fila del resumen de totales con un borde de advertencia |
| `media-empty` | Imagen & Video | Resalta el boton "Subir Archivos" con un anillo pulsante |
| `epf-empty` | EPF | Resalta el boton "Subir Documento" con un anillo pulsante |

---

### Detalles tecnicos

**1. `src/components/releases/ReleaseTaskCenter.tsx`**
- Cambiar la firma de `onNavigate` de `(sectionId: string) => void` a `(sectionId: string, alertId?: string) => void`
- En el boton "Ir a seccion", pasar tambien el `alert.id`: `onClick={() => onNavigate(alert.section, alert.id)}`

**2. `src/pages/ReleaseDetail.tsx`**
- Actualizar `handleSectionClick` para aceptar un segundo parametro `alertId` opcional
- Navegar con query param: `navigate(\`/releases/\${id}/\${sectionId}\${alertId ? \`?alert=\${alertId}\` : ''}\`)`

**3. `src/pages/release-sections/ReleaseCronograma.tsx`**
- Leer `searchParams.get('alert')` al montar
- Si `alert === 'cronograma-upcoming'`: filtrar milestones que vencen en 7 dias, abrir sus secciones padre, hacer scroll y aplicar clase `ring-2 ring-amber-500 animate-pulse` durante 3 segundos
- Si `alert === 'cronograma-delayed'`: similar pero para tareas con `status === 'delayed'`, usando `ring-destructive`
- Si `alert === 'cronograma-empty'`: llamar a `setShowWizard(true)` automaticamente
- Limpiar el parametro despues de procesarlo

**4. `src/pages/release-sections/ReleaseCreditos.tsx`**
- Leer `searchParams.get('alert')`
- Si `alert === 'credits-missing'`: mostrar un banner ambar en la parte superior con el mensaje "Hay canciones pendientes de inscribir creditos. Las canciones sin creditos estan resaltadas abajo"
- Marcar visualmente (borde ambar pulsante) los acordeones de tracks que no tienen creditos registrados
- Hacer scroll automatico al primer track sin creditos
- Limpiar el parametro despues

**5. `src/pages/release-sections/ReleaseAudio.tsx`**
- Leer `searchParams.get('alert')`
- Si `alert === 'audio-missing'`: mostrar banner superior invitando a subir audio, resaltar los tracks sin versiones de audio con borde pulsante, scroll al primero
- Limpiar el parametro despues

**6. `src/pages/release-sections/ReleasePresupuestos.tsx`**
- Leer `searchParams.get('alert')`
- Si `alert === 'budget-empty'`: abrir automaticamente el dialogo `CreateReleaseBudgetDialog` (setear su estado open a true)
- Si `alert === 'budget-over'`: resaltar la fila de totales con borde rojo pulsante
- Limpiar el parametro despues

**7. `src/pages/release-sections/ReleaseImagenVideo.tsx`**
- Leer `searchParams.get('alert')`
- Si `alert === 'media-empty'`: aplicar clase de resaltado pulsante al boton "Subir Archivos" del empty state y al boton "Subir" del toolbar
- Limpiar el parametro despues

**8. `src/pages/release-sections/ReleaseEPF.tsx`**
- Leer `searchParams.get('alert')`
- Si `alert === 'epf-empty'`: aplicar clase de resaltado pulsante al boton "Subir Documento"
- Limpiar el parametro despues

### Patron de resaltado comun

Se usara un patron CSS consistente en todas las secciones:
- Clase temporal: `ring-2 ring-primary ring-offset-2 transition-all` (o `ring-amber-500` / `ring-destructive` segun severidad)
- Duracion: 3 segundos, luego se remueve
- Scroll: `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Se crea un hook utilitario `useAlertHighlight` en `src/hooks/useAlertHighlight.ts` que encapsula la logica comun:
  - Lee `searchParams.get('alert')`
  - Expone `alertId` y una funcion `highlightElement(selector, ringColor?)` que hace scroll + flash
  - Limpia el param automaticamente despues de procesarlo
