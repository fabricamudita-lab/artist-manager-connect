

# Plan: Rediseño Visual Intuitivo de Equipos

## Problema Actual

La vista actual de equipos y miembros tiene varios problemas de usabilidad:

1. **Grid de cards monotonico**: Todas las cards tienen el mismo estilo, dificultando distinguir entre tipos de miembros
2. **Avatares con poco contraste**: Todos los avatares son circulos morados similares
3. **Informacion dispersa**: Los badges de categorias adicionales (+Equipo Artistico, +Productor) ocupan espacio y confunden
4. **Falta de jerarquia visual**: No hay distincion clara entre el artista principal, usuarios con cuenta, y perfiles sin cuenta
5. **Navegacion poco fluida**: El gestor de equipos y la lista de miembros estan visualmente desconectados

## Solucion Propuesta

### Rediseno en 3 Secciones Visuales Claras

```text
+----------------------------------------------------------+
|  EQUIPOS                                                 |
|  Gestiona tu equipo por categorias y artistas            |
+----------------------------------------------------------+
|                                                          |
|  [Gestor de Equipos - Cards horizontales con avatares]   |
|  +-------------+  +-------------+  +-------------+       |
|  | 00 Mgmt [3] |  | M00DITA [5] |  | Otro [2]   |       |
|  +-------------+  +-------------+  +-------------+       |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  EQUIPO: M00DITA                    [+ Anadir] [Invitar] |
|                                                          |
|  - Banda (7 miembros) --------------------------------   |
|  |  [Avatar Grid - Cards compactas con hover effects] |  |
|  |  ER  HM  JB  JR  KS  L   PB                        |  |
|                                                          |
|  - Equipo Tecnico (2 miembros) -----------------------   |
|  |  SC  MR                                            |  |
|                                                          |
+----------------------------------------------------------+
```

### Cambio 1: Cards de Equipos Mejoradas

**Estado actual:**
- Cards cuadradas con info basica
- Dropdown con acciones ocultas

**Nuevo diseno:**
- Cards horizontales tipo "chips" seleccionables
- Avatar del equipo prominente
- Badge con conteo de miembros integrado
- Estado activo claro (borde primario + fondo sutil)
- Acciones rapidas visibles al hover

### Cambio 2: Cards de Miembros Compactas y Visuales

**Estado actual:**
- Cards grandes con avatar + nombre + email + badges multiples
- Ocupan mucho espacio vertical

**Nuevo diseno:**
- Dos opciones de vista: Grid compacto (avatares) y Lista detallada
- **Vista Grid (por defecto):**
  - Avatares grandes (48x48) con iniciales claras
  - Nombre debajo del avatar
  - Rol como subtitulo pequeño
  - Click para ver detalle rapido (popover/sheet)
  - Colores de avatar segun tipo: Primario=Artista, Verde=Usuario, Gris=Perfil

- **Vista Lista:**
  - Filas horizontales compactas
  - Avatar + Nombre + Rol + Email en una linea
  - Acciones al final de cada fila

### Cambio 3: Jerarquia Visual por Tipo de Miembro

Diferenciar visualmente:

| Tipo | Avatar | Badge | Indicador |
|------|--------|-------|-----------|
| **Artista principal** | Ring primario + fondo primario/5 | "Artista" (primario) | Estrella |
| **Usuario con cuenta** | Ring verde | "Usuario" (verde) | Check |
| **Perfil sin cuenta** | Borde gris | Sin badge | - |

### Cambio 4: Categorias como Tabs o Pills

**Estado actual:**
- Cada categoria es una seccion separada con heading
- Miembro puede aparecer en multiples secciones (confuso)

**Nuevo diseno:**
- Pills/tabs de categorias en la parte superior
- Click en una categoria filtra la vista
- "Todos" muestra agrupado por seccion colapsable
- Miembro aparece una sola vez con badges de categorias adicionales (compacto)

### Cambio 5: Selector de Equipo Mejorado

**Estado actual:**
- Dropdown Select separado del gestor
- Duplica la funcionalidad de las cards

**Nuevo diseno:**
- Eliminar dropdown separado
- Las cards del gestor SON el selector (click selecciona)
- Gestor siempre visible (no colapsable por defecto)
- Estado seleccionado muy claro

## Implementacion Tecnica

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Teams.tsx` | Redisenar layout completo, nueva estructura visual |
| `src/components/TeamCard.tsx` | Nuevo estilo horizontal/chip, hover effects |

### Nuevos Componentes

| Componente | Proposito |
|------------|-----------|
| `TeamMemberCard.tsx` | Card compacta de miembro con estilos por tipo |
| `TeamMemberGrid.tsx` | Grid de avatares con vista compacta |
| `CategoryTabs.tsx` | Tabs/pills para filtrar por categoria |

### Estructura Visual Propuesta

```tsx
// Teams.tsx - Nueva estructura
<div className="container mx-auto p-6 space-y-6">
  {/* Header */}
  <div>
    <h1>Equipos</h1>
    <p>Gestiona tu equipo por categorias y artistas</p>
  </div>

  {/* Team Selector - Cards horizontales */}
  <div className="flex flex-wrap gap-3">
    {teams.map(team => (
      <TeamChip 
        key={team.id}
        selected={selectedTeamId === team.id}
        onClick={() => setSelectedTeamId(team.id)}
        {...team}
      />
    ))}
    <Button variant="outline" size="sm">+ Nuevo</Button>
  </div>

  {/* Selected Team Header */}
  <div className="flex items-center justify-between">
    <h2>Equipo: {selectedTeam.name}</h2>
    <div className="flex gap-2">
      <Button>+ Anadir Perfil</Button>
      <Button>Invitar Usuario</Button>
    </div>
  </div>

  {/* Category Pills */}
  <div className="flex gap-2">
    <Badge variant={filter === 'all' ? 'default' : 'outline'}>Todos</Badge>
    {categories.map(cat => (
      <Badge 
        key={cat.value}
        variant={filter === cat.value ? 'default' : 'outline'}
      >
        {cat.label} ({cat.count})
      </Badge>
    ))}
  </div>

  {/* Members Grid por categoria */}
  {filteredCategories.map(category => (
    <section key={category.value}>
      <h3>{category.label} ({category.total})</h3>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {category.members.map(member => (
          <TeamMemberCard 
            key={member.id}
            type={member.type} // 'artist' | 'user' | 'profile'
            {...member}
          />
        ))}
      </div>
    </section>
  ))}
</div>
```

### Estilos de Avatar por Tipo

```tsx
// TeamMemberCard.tsx
const avatarStyles = {
  artist: "ring-2 ring-primary bg-primary/10 text-primary",
  user: "ring-2 ring-green-500 bg-green-50 text-green-700",
  profile: "bg-secondary text-muted-foreground"
};
```

### Toggle Vista Grid/Lista

```tsx
<div className="flex gap-1">
  <Button 
    variant={view === 'grid' ? 'secondary' : 'ghost'} 
    size="icon"
    onClick={() => setView('grid')}
  >
    <Grid className="h-4 w-4" />
  </Button>
  <Button 
    variant={view === 'list' ? 'secondary' : 'ghost'}
    size="icon"
    onClick={() => setView('list')}
  >
    <List className="h-4 w-4" />
  </Button>
</div>
```

## Resultado Esperado

1. **Vision rapida**: Con un vistazo entiendes cuantos equipos hay y cual esta seleccionado
2. **Jerarquia clara**: Distingues inmediatamente artistas, usuarios y perfiles
3. **Navegacion fluida**: Click en equipo muestra sus miembros, filtro por categoria con pills
4. **Compacto pero informativo**: Mas miembros visibles sin scroll, detalles al hacer click
5. **Consistencia visual**: Colores y estilos coherentes en toda la pagina

