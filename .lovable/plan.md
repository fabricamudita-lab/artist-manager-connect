
# Agregar "Editar Categorias" en Contactos

## Problema

En la pagina de Contactos (Agenda) no existe la opcion de gestionar categorias, mientras que en Equipos si existe via el `CategoryManagerSheet`. Como ambos modulos comparten el mismo sistema de categorias (localStorage), deberia ser posible editarlas desde cualquiera de los dos.

## Solucion

Agregar el boton "Editar Categorias" y el componente `CategoryManagerSheet` en Agenda.tsx, reutilizando la misma logica de handlers que ya existe en Teams.tsx.

## Cambios

| Archivo | Cambio |
|---|---|
| `src/pages/Agenda.tsx` | 1. Importar `CategoryManagerSheet`, `Settings` icon, y `Users` icon. 2. Agregar estado `categoryManagerOpen`. 3. Copiar los handlers de gestion de categorias (`handleAddCustomCategory`, `handleRenameCategory`, `handleDeleteCategory`, `handleCategoryReorder`) adaptados al contexto de Agenda. 4. Agregar boton "Editar Categorias" junto al boton "Grupos". 5. Renderizar `CategoryManagerSheet` al final del JSX. |

## Detalle

El boton se colocara en la barra de acciones, junto a "Grupos" y "Nuevo Contacto":

```text
[Grupos] [Editar Categorias] [+ Nuevo Contacto]
```

Los handlers escriben en las mismas claves de localStorage (`custom_team_categories`, `category_order`, `category_label_overrides`) que usa Teams, por lo que los cambios se reflejaran en ambos modulos.

Se necesitara tambien un `categoryOrderVersion` state y el `allCategoriesForDisplay` memo para que el selector de filtro respete el orden personalizado, igual que en Teams.
