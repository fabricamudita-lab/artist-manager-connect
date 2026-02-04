

# Plan: Gestor de Equipos en Panel Lateral

## Estado: ✅ IMPLEMENTADO

El dropdown de equipos ahora muestra "Editar Equipos" en lugar de "Nuevo Equipo", y al hacer clic se abre un panel lateral con el gestor de equipos.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/TeamManagerSheet.tsx` | **Creado** - Panel lateral con lista de equipos y acciones CRUD |
| `src/components/TeamDropdown.tsx` | Cambiado "Nuevo Equipo" por "Editar Equipos" |
| `src/pages/Teams.tsx` | Integrado el nuevo panel |

## Flujo de Usuario

1. Usuario hace clic en dropdown de Equipo
2. Selecciona "Editar Equipos" al final
3. Se abre panel lateral con lista de equipos
4. Puede hacer clic en "Nuevo Equipo" o usar el menú de 3 puntos para Editar/Duplicar/Eliminar
