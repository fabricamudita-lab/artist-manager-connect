

## Mejora de "Equipo involucrado" en ProjectDetail

### Problema actual
La seccion "Equipo involucrado" muestra una lista plana de miembros sin organizacion. Cuando hay equipo asignado, no se agrupa por roles ni categorias, dificultando ver quien hace que en el proyecto.

### Solucion

Redisenar la seccion de equipo para:
1. Agrupar miembros por su rol en el proyecto
2. Mostrar avatares compactos con indicadores de tipo (perfil vs contacto)
3. Permitir edicion de rol inline
4. Mostrar miembros sin rol bajo "Sin rol asignado"

### Cambios

#### 1. Mejorar la query de datos (`ProjectDetail.tsx` - linea ~882)

Ampliar la query de `project_team` para traer mas datos del contacto/perfil:
- De contactos: `name, stage_name, category, role` (el campo `role` del contacto como referencia)
- De perfiles: `full_name, stage_name, avatar_url`

Esto permite mostrar avatares reales y usar la categoria/rol del contacto como informacion complementaria.

#### 2. Actualizar el estado de `team` para incluir mas campos

Cambiar la interfaz del estado `team` para incluir:
- `type`: 'profile' | 'contact' (para diferenciar visualmente)
- `contactRole`: rol del contacto en la agenda (ej: "Tecnico de sonido")
- `projectRole`: rol asignado en este proyecto especificamente
- `avatarUrl`: para mostrar avatar real si existe
- `category`: categoria del contacto (ej: "tecnico", "management")

#### 3. Redisenar la seccion de equipo (lineas 1397-1486)

Reemplazar la lista plana con una vista agrupada:

- **Agrupacion por rol de proyecto**: los miembros se agrupan segun el campo `role` de `project_team`. Cada grupo muestra un encabezado con el nombre del rol y el numero de miembros.
- **Miembros sin rol**: aparecen bajo la seccion "Sin rol asignado" al final.
- **Vista compacta por defecto**: avatares en miniatura (32px) con nombre y rol del contacto como subtitulo.
- **Acciones**: menu contextual con "Editar rol en proyecto", "Ver perfil" y "Quitar del equipo".
- **Boton "Anadir miembro"** siempre visible al final.

Layout visual:
```text
Equipo involucrado                    [Users icon]
--------------------------------------------
Direccion (2)
  [Avatar] Maria Garcia - Manager
  [Avatar] Juan Lopez - Director artistico

Produccion (1)  
  [Avatar] Ana Martin - Tecnico de sonido

Sin rol asignado (1)
  [Avatar] Carlos Ruiz

[+ Anadir miembro]
```

### Detalle tecnico

**Query ampliada:**
```typescript
supabase.from('project_team')
  .select('id, role, profile_id, contact_id, profiles:profile_id(full_name, stage_name, avatar_url), contacts:contact_id(name, stage_name, category, role)')
  .eq('project_id', id)
```

**Agrupacion en el render:**
```typescript
const groupedTeam = useMemo(() => {
  const groups = new Map<string, typeof team>();
  team.forEach(member => {
    const key = member.role || '__no_role__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(member);
  });
  // Sort: named roles first, "sin rol" last
  const sorted = [...groups.entries()].sort((a, b) => {
    if (a[0] === '__no_role__') return 1;
    if (b[0] === '__no_role__') return -1;
    return a[0].localeCompare(b[0]);
  });
  return sorted;
}, [team]);
```

**Archivos modificados:**
- `src/pages/ProjectDetail.tsx`: ampliar query, actualizar estado team, redisenar seccion de equipo con agrupacion por roles

No se necesitan migraciones de base de datos ni componentes nuevos.
