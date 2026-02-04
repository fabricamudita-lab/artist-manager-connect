
# Plan: Gestor de Equipos Intuitivo

## Problema Actual

1. **Confusión conceptual**: El boton "Crear Equipo" en `/teams` crea un artista (inserta en tabla `artists`), lo cual mezcla dos conceptos diferentes
2. **Sin gestion de equipos**: No existe forma de eliminar, editar o duplicar equipos desde la pagina Teams
3. **Dropdown confuso en perfil de artista**: Muestra "00 Management" como opcion de filtro junto a artistas, lo cual no tiene sentido en ese contexto

## Solucion Propuesta

### Cambio 1: Separar conceptos claros

| Concepto | Donde se gestiona | Descripcion |
|----------|-------------------|-------------|
| **Artistas** | Mi Management (`/mi-management`) | Roster de artistas del management |
| **Equipos** | Equipos (`/teams`) | Grupos de personas (pueden o no estar vinculados a artistas) |

### Cambio 2: Redisenar pagina Teams con Gestor de Equipos

Agregar una seccion superior "Gestor de Equipos" con tarjetas para cada equipo que permitan:

```text
+---------------------------------------------------------+
| EQUIPOS                                                 |
| Gestiona tu equipo por categorias y artistas            |
+---------------------------------------------------------+
| [Gestor de Equipos]                                     |
|                                                         |
| +------------------+  +------------------+               |
| | 00 Management    |  | M00DITA          |               |
| | 3 miembros       |  | 5 miembros       |               |
| | [Editar] [Eliminar]| | [Editar] [Eliminar]|            |
| +------------------+  +------------------+               |
|                                                         |
| [+ Nuevo Equipo]                                        |
+---------------------------------------------------------+
| [Dropdown: Filtrar por equipo]                          |
| [...miembros del equipo seleccionado...]                |
+---------------------------------------------------------+
```

Acciones disponibles por equipo:
- **Ver**: Seleccionar para filtrar miembros
- **Editar**: Cambiar nombre, descripcion
- **Eliminar**: Borrar el equipo (con confirmacion)
- **Duplicar**: Crear copia del equipo

### Cambio 3: Remover "Crear Equipo" de Teams

El boton "Crear Equipo" en `/teams` actualmente crea artistas, lo cual es confuso. Opciones:

**Opcion A (Recomendada)**: Cambiar para crear "equipos genericos" (nueva tabla `teams`)
**Opcion B**: Remover el boton y crear equipos solo desde Mi Management

### Cambio 4: En perfil de artista, solo mostrar equipo del artista

Remover la opcion "00 Management" del dropdown en la pagina de perfil de artista. Esta opcion solo tiene sentido en la pagina general de Equipos, no dentro del contexto de un artista especifico.

## Implementacion Tecnica

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Teams.tsx` | Agregar seccion "Gestor de Equipos" con tarjetas, acciones de editar/eliminar |
| `src/components/CreateTeamDialog.tsx` | Cambiar para crear equipos genericos o redirigir a crear artista |
| `src/pages/ArtistProfile.tsx` | Remover logica de "00 Management" del dropdown de equipos |

### Nuevos componentes

| Componente | Proposito |
|------------|-----------|
| `EditTeamDialog.tsx` | Dialog para editar nombre/descripcion de equipo |
| `TeamCard.tsx` | Tarjeta de equipo con acciones rapidas |

### Flujo de eliminacion de equipo

1. Usuario hace clic en "Eliminar" en una tarjeta de equipo
2. Aparece dialogo de confirmacion: "Eliminar equipo X? Los miembros no seran eliminados, solo desvinculados."
3. Al confirmar:
   - Si es artista: eliminar de tabla `artists` (cascade borra `contact_artist_assignments`)
   - Mostrar toast de confirmacion

### Base de datos

Si se desea separar completamente "Equipos" de "Artistas", se necesitaria:

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES workspaces(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Sin embargo, para una implementacion mas rapida, se puede mantener la tabla `artists` como fuente de equipos y solo mejorar la UX de gestion.

## Resultado Esperado

1. **Pagina Teams** tendra un gestor visual con todas las acciones CRUD para equipos
2. **Mi Management** seguira siendo el lugar para crear nuevos artistas
3. **Perfil de Artista** mostrara solo el equipo relevante para ese artista sin opciones confusas
