

# Plan: Simplificar Sistema de Categorías vs Roles

## Problema Identificado

Actualmente hay confusión entre dos conceptos que se solapan:

| Concepto | Ejemplo | Propósito |
|----------|---------|-----------|
| **Rol principal** | "Batería", "Ingeniero de sonido" | Describe QUÉ hace específicamente |
| **Categorías de equipo** | "Banda", "Equipo Artístico", "Productor" | Agrupa para filtrar en la UI |

El problema:
- Un miembro puede tener MUCHAS categorías redundantes
- "Productor" aparece como categoría Y podría ser un rol
- Se muestran badges "+Equipo Artístico", "+Productor" que añaden ruido visual

## Solución Propuesta

Simplificar a **una sola categoría primaria** y usar el **rol** para el detalle:

```text
ANTES (confuso):
┌────────────────────┐
│      [JR]          │
│  Juan R. Berbín    │
│     Batería        │  <- rol
│ +Equipo Artístico  │  <- categoría extra (redundante)
│    +Productor      │  <- categoría extra (¿rol o categoría?)
└────────────────────┘

DESPUES (limpio):
┌────────────────────┐
│      [JR]          │
│  Juan R. Berbín    │
│ Batería · Productor│  <- roles combinados
│                    │
└────────────────────┘
```

### Cambios Propuestos

1. **Una sola categoría primaria** para agrupación/filtro
2. **Rol puede tener múltiples valores** separados por coma o "·"
3. **Eliminar badges de categorías extra** de las tarjetas

## Implementación Técnica

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/TeamMemberCard.tsx` | Eliminar sección de extraCategories badges |
| `src/pages/Teams.tsx` | Simplificar lógica de categorías |
| `src/components/EditContactDialog.tsx` | Permitir múltiples roles en un campo |

### 1. Simplificar TeamMemberCard

Eliminar los badges de categorías extra:

```tsx
// ELIMINAR esta sección completa (líneas 130-144):
{/* Extra categories badges */}
{extraCategories.length > 0 && (
  <div className="flex gap-1 mt-1 flex-wrap justify-center">
    {extraCategories.slice(0, 2).map((cat) => (
      <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">
        +{cat}
      </Badge>
    ))}
    ...
  </div>
)}
```

La tarjeta quedará más limpia mostrando solo:
- Avatar
- Nombre
- Rol(es)

### 2. Mejorar visualización de múltiples roles

Si el contacto tiene múltiples funciones, combinarlas en el campo rol:

```tsx
// En Teams.tsx buildGridMembers
const contact = {
  // ...
  role: formatRoles(contact.role, contact.field_config?.team_categories)
};

// Helper para formatear roles
const formatRoles = (mainRole: string, categories: string[]) => {
  // Si el rol principal ya está definido, usarlo
  if (mainRole) return mainRole;
  
  // Si no hay rol pero hay categorías, usar la primera como rol
  if (categories?.length > 0) {
    return categories
      .map(c => getTeamCategoryLabel(c))
      .slice(0, 2)
      .join(' · ');
  }
  
  return undefined;
};
```

### 3. Simplificar formulario de edición

En EditContactDialog, cambiar la UI de categorías:

```tsx
// Cambiar de múltiples categorías a:
<div className="space-y-2">
  <Label>Categoría principal</Label>
  <Select value={primaryCategory} onValueChange={setPrimaryCategory}>
    <SelectTrigger>
      <SelectValue placeholder="Selecciona una categoría" />
    </SelectTrigger>
    <SelectContent>
      {TEAM_CATEGORIES.map(cat => (
        <SelectItem key={cat.value} value={cat.value}>
          {cat.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label>Rol/Función específica</Label>
  <Input 
    value={role}
    onChange={e => setRole(e.target.value)}
    placeholder="Ej: Batería, Ingeniero de sonido, Productor musical..."
  />
  <p className="text-xs text-muted-foreground">
    Puedes añadir varios roles separados por coma
  </p>
</div>
```

## Resultado Visual

```text
Vista Grid limpia:
┌────────────────────────────────────────────────────────┐
│                                                        │
│  [JR]        [MP]        [TM]        [SC]        [ER] │
│  Juan R.     María P.    Tom M.      Sara C.     Eva R│
│  Batería     Productora  Tour Mgr    Bajo        Keys │
│                                                        │
│  [KS]        [L]         [PB]        [RM]        [CN] │
│  Kevin S.    Laura       Pablo B.    Rosa M.     Carlos│
│  Guitarra    Legal       Sonido      Booking     Lights│
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Resumen de Beneficios

1. **Menos ruido visual**: Sin badges extra debajo de cada nombre
2. **Concepto claro**: Categoría = agrupación, Rol = función específica
3. **Más espacio**: Tarjetas más compactas
4. **Filtro funcional**: El dropdown de categorías sigue funcionando para filtrar

