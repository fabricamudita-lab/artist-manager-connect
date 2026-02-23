
# Simplificar la pagina de Proyectos

La pagina actual `/proyectos` muestra dos pestanas: "Por Artistas" y "Por Proyectos". El objetivo es eliminar las pestanas y mostrar directamente un listado de proyectos con filtros y acceso rapido con un solo clic.

---

## Cambios en `src/pages/Proyectos.tsx`

### 1. Eliminar las pestanas (Tabs)
Quitar la estructura de Tabs con "Por Artistas" / "Por Proyectos" y mostrar directamente la lista de proyectos.

### 2. Anadir barra de filtros
Reemplazar el area de pestanas por una barra horizontal de filtros:
- **Busqueda**: Campo de texto (ya existe)
- **Filtro por artista**: Select con los artistas disponibles (reutilizando la query existente)
- **Filtro por estado**: Select con opciones "Todos", "En curso", "Finalizado", "Archivado"
- **Filtro por fecha**: Ordenar por fecha de creacion (mas reciente / mas antiguo)

### 3. Mostrar tarjetas de proyecto clicables
Cada tarjeta de proyecto mostrara:
- Nombre del proyecto
- Artista asociado (si tiene)
- Estado (badge con color)
- Descripcion breve
- Stats resumidos (presupuestos, documentos, solicitudes)
- Al hacer clic navega a `/projects/{id}` (detalle del proyecto)

### 4. Boton "Nuevo Proyecto"
Mantener un boton visible para crear nuevos proyectos.

---

## Datos tecnicos

| Elemento | Detalle |
|---|---|
| Archivo | `src/pages/Proyectos.tsx` |
| Queries existentes reutilizadas | `proyectos-projects`, `proyectos-artists`, `project-stats` |
| Queries eliminadas | `artist-stats` (ya no se necesita) |
| Navegacion al clic | `navigate(/projects/${project.id})` (ya implementado en la tab actual) |
| Filtro de estado | Usa campo `status` de la tabla `projects` con valores `en_curso`, `finalizado`, `archivado` |
| Filtro de artista | Select con artistas obtenidos de la query existente |

Se mantiene la misma estructura visual (grid de cards) pero sin las pestanas, mostrando solo proyectos con filtros en linea.
