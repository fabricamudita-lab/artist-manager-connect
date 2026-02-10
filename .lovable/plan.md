
# Mejorar textos descriptivos en los filtros de Contactos

## Problema

Los tres selectores de filtro muestran "Todas", "Todas" y "Todos" cuando no hay filtro activo, sin indicar a que corresponde cada uno. El usuario no puede distinguirlos a simple vista.

## Solucion

Cambiar el texto de la opcion "all" (valor por defecto) en cada selector para que incluya una pista contextual:

| Selector | Texto actual | Texto nuevo |
|----------|-------------|-------------|
| Categoria | Todas | Todas las categorias |
| Ciudad | Todas | Todas las ciudades |
| Grupo | Todos | Todos los grupos |
| Etiqueta | Todas | Todas las etiquetas |

## Cambio

| Archivo | Detalle |
|---------|---------|
| `src/pages/Agenda.tsx` | Cambiar el texto de los 4 `SelectItem value="all"` en las lineas 363, 383, 397 y 418 |
