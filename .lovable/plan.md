

# Simplificar categorias: un unico sistema multi-categoria

## Problema actual

Hay dos sistemas de categorias que hacen lo mismo:
- **Contacts**: usan `field_config.team_categories` (array, ya soporta multiples)
- **Workspace members**: usan `workspace_memberships.team_category` (valor unico)

En el perfil del contacto se ven las categorias correctamente (Banda, Equipo Artistico, Productor). En el grid de Equipos, el menu dice "Mover a" porque los workspace members solo tienen una categoria.

## Solucion simplificada

**No crear una columna nueva.** En su lugar, unificar el comportamiento:

### Para contacts (ya funciona)
- `field_config.team_categories` ya es un array - el grid ya agrupa por multiples categorias (linea 675: `categories.includes(cat.value)`)
- El menu "Mover a" se cambia a "Anadir a" con checkmarks toggle

### Para workspace members
- En vez de anadir `extra_categories`, reutilizar el **contact mirror** que ya existe (`mirror_contact_id`)
- Cada workspace member ya puede tener un contact espejo donde se guardan datos extra (rol funcional, etc.)
- Las categorias adicionales se guardan en el `field_config.team_categories` del contact espejo
- El filtrado en el grid ya lee `team_categories` de contacts, asi que solo falta vincular

### Cambios concretos

**1. `src/components/TeamMemberCard.tsx`**
- Reemplazar la lista plana "Mover a [categoria]" por un menu con checkmarks
- Cada categoria muestra un check si el miembro ya pertenece a ella
- Click = toggle (anadir o quitar)
- Props nuevas: `onToggleCategory?: (category: string) => void`, `memberCategories?: string[]`

**2. `src/pages/Teams.tsx`**

Funcion `toggleMemberCategory(memberId, category, memberType)`:
- **Si es contact**: lee `field_config.team_categories`, anade/quita la categoria del array, actualiza
- **Si es workspace member**: actualiza `team_category` (la principal) si es la unica, o crea/actualiza el contact mirror con `team_categories` para las adicionales

Modificar `allTeamByCategory`:
- Para workspace members: ademas de `m.team_category === cat.value`, tambien verificar si su contact mirror tiene `team_categories` que incluya `cat.value`

**3. `src/components/TeamMemberGrid.tsx`, `TeamMemberList.tsx`, `TeamMemberFreeCanvas.tsx`**
- Pasar las nuevas props `onToggleCategory` y `memberCategories` a cada card

## Flujo del usuario

```text
Click en menu (···) de un miembro
  |
  v
+---------------------------+
| Editar                    |
|---------------------------|
| Categorias            >   |
|   | [✓] Banda             |
|   | [✓] Equipo Artistico  |
|   | [ ] Management        |
|   | [ ] Tecnico           |
|   | ...                   |
|---------------------------|
| Quitar del equipo         |
+---------------------------+
```

- Un solo submenu "Categorias" con toggles
- Sin distincion entre "mover" y "anadir" - simplemente seleccionas donde quieres que aparezca
- Minimo una categoria debe estar seleccionada

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/TeamMemberCard.tsx` | Submenu "Categorias" con checkmarks toggle |
| `src/components/TeamMemberGrid.tsx` | Pasar props `onToggleCategory`, `memberCategories` |
| `src/components/TeamMemberList.tsx` | Pasar props `onToggleCategory`, `memberCategories` |
| `src/components/TeamMemberFreeCanvas.tsx` | Pasar props `onToggleCategory`, `memberCategories` |
| `src/pages/Teams.tsx` | Funcion `toggleMemberCategory`, filtrado multi-cat para ws members |

No se necesita migracion de base de datos - se reutiliza la infraestructura existente de `field_config.team_categories` y contact mirrors.
