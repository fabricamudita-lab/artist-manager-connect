
## Mostrar Hojas de Ruta vinculadas en la carpeta "Hojas de Ruta" del Drive

### Problema
Cuando navegas al explorador de archivos del evento y entras en la carpeta "Hojas de Ruta", solo ves una carpeta vacia. Deberia mostrar las hojas de ruta vinculadas al booking, igual que la carpeta "Presupuesto" muestra el presupuesto vinculado.

### Solucion
Replicar el patron existente de `budgetContext` / `isPresupuestoFolder` para crear un `roadmapContext` / `isHojasDeRutaFolder` en `FileExplorer.tsx`.

### Cambios en `src/components/drive/FileExplorer.tsx`

1. **Nueva query `roadmapContext`**: Detectar cuando el usuario esta en una carpeta llamada "Hojas de Ruta". Si lo esta, obtener el `booking_id` del metadata de la carpeta padre (la carpeta del evento), y buscar roadmaps vinculados via `tour_roadmap_bookings` y `tour_roadmaps` (legacy `booking_id`).

2. **Importar icono `MapIcon`** de lucide-react (o `Map`) y `useNavigate` de react-router-dom.

3. **Renderizar tarjetas de roadmaps vinculados** en las 3 vistas (empty, grid, list) siguiendo el mismo patron que el presupuesto:
   - Si hay roadmaps: mostrar una tarjeta por cada uno con nombre, estado (badge), resumen de bloques (viajes, hoteles, dias) y click para navegar a `/roadmaps/{id}`.
   - Si no hay roadmaps: mostrar tarjeta con boton "Crear Hoja de Ruta" que navega al detalle del booking (pestana Hoja de Ruta) donde ya existe esa funcionalidad.

### Detalles tecnicos

- La query buscara roadmaps combinando `tour_roadmap_bookings` (junction table) y `tour_roadmaps.booking_id` (legacy), igual que hace `BookingRoadmapTab`.
- Cada tarjeta mostrara: nombre, badge de estado (`borrador`/`publicado`), y resumen de bloques (X viajes, X hoteles, X dias).
- Click en la tarjeta navega a `/roadmaps/{roadmap.id}`.
- El boton de crear cuando no hay roadmaps redirigira al booking detail.
- No se necesitan cambios en base de datos.
