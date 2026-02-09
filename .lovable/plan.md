

# Plan: Dashboard de Perfil(es) en Equipos

## Resumen

Crear un boton en la barra de herramientas de Equipos que permita seleccionar uno o varios perfiles y abrir un "Dashboard de Perfil" completo. Este dashboard mostrara toda la actividad vinculada: presupuestos, bookings, solicitudes, sincronizaciones, hojas de ruta, canciones/creditos, proyectos y transacciones.

## Cambios en la experiencia de usuario

1. **Seleccion multiple**: Anadir checkboxes a las tarjetas de miembros (grid/list/free) para seleccionar uno o varios perfiles
2. **Barra de accion**: Cuando hay perfiles seleccionados, mostrar una barra flotante con el boton "Ver Dashboard" y el conteo de seleccionados
3. **Dialog Dashboard**: Un dialog a pantalla casi completa con pestanas por tipo de recurso, mostrando datos agregados de todos los perfiles seleccionados

## Datos a consultar por contact_id

| Tabla | Relacion | Que muestra |
|-------|----------|-------------|
| `budget_items` | `contact_id` | Partidas de presupuesto vinculadas |
| `booking_offers` | texto `tour_manager`/`contacto` | Conciertos/ofertas |
| `booking_availability_responses` | `contact_id` | Respuestas de disponibilidad |
| `solicitudes` | `contact_id`, `promotor_contact_id` | Solicitudes vinculadas |
| `song_splits` | `collaborator_contact_id` | Splits de canciones |
| `track_credits` | `contact_id` | Creditos de tracks |
| `track_master_splits` | `contact_id` | Splits master |
| `track_publishing_splits` | `contact_id` | Splits editoriales |
| `sync_offers` | `contact_id`, `requester_contact_id` | Ofertas de sync |
| `project_team` | `contact_id` | Proyectos asignados |
| `royalty_splits` | `contact_id` | Splits de royalties |
| `transactions` | `contact_id` | Transacciones/facturas |
| `roadmaps` | via booking vinculado | Hojas de ruta |

## Archivos a crear/modificar

### 1. Nuevo: `src/components/ContactDashboardDialog.tsx`

Dialog principal con:
- Header mostrando los perfiles seleccionados (nombre, avatar, rol)
- Pestanas: Todo, Presupuestos, Bookings, Solicitudes, Sincronizaciones, Canciones/Creditos, Proyectos, Transacciones
- Cada pestana consulta la tabla correspondiente filtrando por los `contact_id` seleccionados
- Indicadores de pendientes (solicitudes pendientes, presupuestos en borrador, etc.)
- Links directos a cada recurso para navegar al detalle

### 2. Modificar: `src/pages/Teams.tsx`

- Anadir estado `selectedMemberIds: Set<string>` para la seleccion multiple
- Pasar prop `selectable` y `selected` a los componentes de vista (grid/list/free)
- Mostrar barra flotante cuando hay seleccion activa con boton "Ver Dashboard"
- Integrar el nuevo `ContactDashboardDialog`

### 3. Modificar: `src/components/TeamMemberCard.tsx`

- Anadir prop opcional `selectable` y `selected`
- Mostrar checkbox cuando `selectable=true`
- Callback `onSelect(id)` al hacer click en checkbox

### 4. Modificar: `src/components/TeamMemberGrid.tsx`

- Propagar las props de seleccion a cada tarjeta

### 5. Modificar: `src/components/TeamMemberList.tsx`

- Propagar las props de seleccion a cada fila

### 6. Modificar: `src/components/TeamMemberFreeCanvas.tsx` / `DraggableMemberCard.tsx`

- Propagar las props de seleccion a cada tarjeta draggable

## Detalle tecnico del Dashboard Dialog

```text
+--------------------------------------------------+
| Dashboard de Perfil                         [X]   |
| [Avatar] Pol Batlle  [Avatar] Maria Lopez         |
|--------------------------------------------------|
| Todo | Presupuestos | Bookings | Solicitudes | ...|
|--------------------------------------------------|
| [Cards con cada recurso vinculado]                |
| - Nombre del recurso                              |
| - Estado (badge)                                  |
| - Fecha                                           |
| - Link al detalle                                 |
+--------------------------------------------------+
```

Cada seccion mostrara:
- Conteo total y desglose por estado
- Lista de items con acceso directo
- Indicador visual de items pendientes/urgentes

## Flujo de seleccion

1. El usuario hace click en el checkbox de una o varias tarjetas
2. Aparece una barra flotante inferior: "3 perfiles seleccionados | [Ver Dashboard] [Limpiar]"
3. Al pulsar "Ver Dashboard" se abre el dialog con datos agregados
4. Se puede deseleccionar todo con "Limpiar" o haciendo click en los checkboxes

