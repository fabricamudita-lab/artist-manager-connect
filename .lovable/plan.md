

# Plan: Optimizar Grid de Miembros - Eliminar Secciones Vacías

## Problema Actual

Como se ve en la imagen, cuando una categoría tiene solo 1 miembro:
- Ocupa toda una fila (con el heading de categoría + el avatar)
- El resto del espacio horizontal queda vacío
- Se repite el problema para cada categoría pequeña (Tour Manager, Booking, etc.)
- Mucho scroll vertical innecesario

## Solucion Propuesta

Cambiar la logica de visualizacion segun el filtro seleccionado:

```text
ANTES (Todas las categorias):
+----------------------------------------------------------+
| Tour Manager [1]                                         |
| [Avatar TM]                                              |
|                                                          |
| Booking [1]                                              |
| [Avatar MP]                                              |
|                                                          |
| Tour Manager [1]                                         |
| [Avatar TM]                                              |
+----------------------------------------------------------+

DESPUES (Todas las categorias):
+----------------------------------------------------------+
| Todos los miembros (15)                                  |
| [TM] [MP] [TM] [JB] [ER] [KS] [L] [PB] [SC] [MR]        |
| [RM] [CN] [PA] [JC] [AL]                                |
+----------------------------------------------------------+

DESPUES (Filtro especifico "Banda"):
+----------------------------------------------------------+
| Banda (7)                                                |
| [JB] [ER] [KS] [L] [PB] [SC] [MR]                       |
+----------------------------------------------------------+
```

### Cambios de Comportamiento

| Filtro | Antes | Despues |
|--------|-------|---------|
| "Todas" | Grid por cada categoria | Un unico grid con todos |
| Categoria X | Grid de esa categoria | Grid de esa categoria (igual) |

### Beneficios

1. **Mejor uso del espacio**: Avatares llenan las columnas disponibles
2. **Menos scroll**: Todo visible de un vistazo
3. **Distincion visual**: El rol/categoria se muestra debajo del nombre en cada card
4. **Filtro rápido**: El dropdown sirve para filtrar cuando se necesita ver una categoria especifica

## Implementacion Tecnica

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Teams.tsx` | Cambiar logica de renderizado segun filtro seleccionado |

### Logica de Renderizado

```tsx
// En Teams.tsx - seccion de Members Grid/List

{selectedCategoryFilter === 'all' ? (
  // Vista unificada: todos los miembros en un solo grid
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Users className="w-5 h-5 text-primary" />
      <h3 className="text-lg font-semibold">Todos los miembros</h3>
      <Badge variant="secondary">{totalMembersCount}</Badge>
    </div>
    <TeamMemberGrid
      members={allMembersFlattened}  // Todos los miembros combinados
      onMemberClick={...}
      // ... resto de props
    />
  </div>
) : (
  // Vista filtrada: solo la categoria seleccionada
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <CategoryIcon className="w-5 h-5 text-primary" />
      <h3 className="text-lg font-semibold">{selectedCategory.label}</h3>
      <Badge variant="secondary">{filteredMembers.length}</Badge>
    </div>
    <TeamMemberGrid
      members={filteredMembers}
      onMemberClick={...}
      // ... resto de props
    />
  </div>
)}
```

### Construccion de Lista Unificada

```tsx
// Combinar todos los miembros de todas las categorias en un solo array
const allMembersFlattened = useMemo(() => {
  const members: Member[] = [];
  const addedIds = new Set<string>();
  
  filteredCategories.forEach(category => {
    const categoryMembers = buildGridMembers(category.value);
    categoryMembers.forEach(member => {
      if (!addedIds.has(member.id)) {
        addedIds.add(member.id);
        members.push(member);
      }
    });
  });
  
  return members;
}, [filteredCategories, buildGridMembers]);
```

### Card con Rol Visible

Dado que ya no hay headers de categoria, cada TeamMemberCard ya muestra el rol debajo del nombre, lo cual es suficiente para identificar la funcion de cada miembro.

## Resultado Esperado

1. **Espacio optimizado**: Grid de 10 columnas llenandose horizontalmente
2. **Vision rapida**: Todos los miembros visibles sin scroll excesivo
3. **Filtro funcional**: Dropdown para ver solo una categoria cuando sea necesario
4. **Sin redundancia**: Cada miembro aparece una sola vez

