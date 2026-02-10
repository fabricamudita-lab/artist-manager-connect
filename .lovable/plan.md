

# Renombrar "Grupos" a "Equipos" en Contactos

## Cambios

Renombrar todas las referencias de "Grupos" a "Equipos" en la interfaz de Contactos (Agenda). Es un cambio puramente visual/de texto, la logica y datos subyacentes no cambian.

| Ubicacion en Agenda.tsx | Texto actual | Texto nuevo |
|---|---|---|
| Boton de gestion (~linea 334) | "Grupos" | "Equipos" |
| Placeholder del filtro (~linea 394) | "Grupo" | "Equipo" |
| Opcion por defecto del filtro (~linea 397) | "Todos los grupos" | "Todos los equipos" |

## Detalle tecnico

| Archivo | Cambio |
|---|---|
| `src/pages/Agenda.tsx` | Cambiar los 3 textos indicados arriba. Opcionalmente cambiar el icono `FolderOpen` por `Users` para mayor coherencia con el concepto de "Equipos". |

No se modifica la tabla `contact_groups` ni la logica de filtrado. Solo se actualizan los textos visibles al usuario.

