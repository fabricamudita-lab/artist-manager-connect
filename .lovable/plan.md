

# Simplificar "Mi Management" — Solo Artistas

Eliminar la tab "Equipo Management" de la página `/mi-management`. Esta funcionalidad ya existe en la página de Equipos (con el dropdown "00 Management"), por lo que es redundante aquí.

---

## Cambios en `src/pages/MyManagement.tsx`

1. **Eliminar el componente `Tabs`** completo (TabsList, TabsTrigger, TabsContent) y mostrar directamente el contenido del roster de artistas sin wrapper de tabs.

2. **Eliminar la query `managementTeam`** y todo el bloque de la tab "team" (el grid de miembros, el empty state, el botón "Gestionar en Contactos").

3. **Eliminar la stat "Equipo"** del array `stats` (la que muestra `managementTeam.length` con icono `Users`).

4. **Limpiar imports** no utilizados: `Tabs, TabsContent, TabsList, TabsTrigger`, `UserPlus`, `Users` (si ya no se usa en otro sitio).

El resultado: la página muestra directamente el header, las stats (sin "Equipo"), y el grid de artistas — sin tabs, sin contenido de equipo.

