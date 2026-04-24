# Colaboradores vs Banda: separar intérpretes ocasionales

## Diagnóstico

Cuando se añade un crédito de tipo **Intérprete** (Voz Principal, etc.) en un track, el código en `ReleaseCreditos.tsx` (líneas 723-732 y 800-807) crea/actualiza el contacto con `team_categories = ['banda']` automáticamente. Por eso Jay Jules apareció como miembro de la **Banda** de Eudald Payés.

El problema conceptual:
- **Banda** debe contener únicamente a los miembros estables del proyecto (los que sugiere el formato del artista).
- **Intérpretes / colaboradores ocasionales** (un cantante invitado en un single, un featuring, etc.) no son banda — son colaboraciones puntuales del artista.

## Solución propuesta

### 1. Nueva categoría de equipo: "Colaboradores"

Añadir a `src/lib/teamCategories.ts` una nueva entrada antes de "Otros":

```ts
{ value: 'colaborador', label: 'Colaboradores', icon: Mic },
```

Sirve como cajón para artistas/intérpretes invitados (cantantes, featurings, músicos de sesión puntuales) que están vinculados al artista pero no forman parte de su banda estable.

### 2. Cambiar el mapeo automático en ReleaseCreditos.tsx

En las **dos** ocurrencias del `categoryMap` (líneas 723-729 y 800-806), reemplazar:
```
interprete: 'banda'
```
por:
```
interprete: 'colaborador'
```

Esto aplica al flujo de **crear nuevo contacto desde un crédito** y al de **vincular contacto existente**. Los nuevos intérpretes que no existan ya en la base de datos pasarán automáticamente a Colaboradores en lugar de Banda.

### 3. Migración de datos existente (Jay Jules y similares)

Detectar todos los contactos cuyo `field_config.team_categories` incluya `'banda'` **únicamente porque** se les añadió como intérpretes (sin haber sido marcados manualmente como banda). Como no podemos distinguir con certeza el origen, **no haremos un rebatch automático**. En su lugar:

- Añadir en la página `Teams.tsx`, dentro del menú contextual de cada tarjeta de miembro (los tres puntitos), una nueva opción **"Mover a Colaboradores"** disponible cuando el miembro está en categoría `banda`. Hace `field_config.team_categories = team_categories.filter(c => c !== 'banda').concat('colaborador')`.
- Mostrar un aviso suave la primera vez que se abra Teams para Eudald: "Revisa si todos los miembros de Banda son realmente parte estable del proyecto. Puedes mover colaboradores ocasionales con el menú · · ·".

### 4. UI de la nueva categoría

- Aparece como una sección más en la vista de Equipos (igual que Banda, Equipo Artístico, etc.).
- Color/icono: micrófono (`Mic`) para diferenciarla visualmente.
- En el filtro **"Categoría"** del selector superior se incluye automáticamente porque la lista se genera desde `TEAM_CATEGORIES`.

## Resultado esperado

- Jay Jules deja de aparecer en **Banda** de Eudald y pasa a **Colaboradores** (tras moverlo manualmente con el nuevo botón).
- Cualquier futuro cantante/intérprete añadido desde un crédito de release se guardará automáticamente como **Colaborador**, no como banda.
- La banda queda reservada exclusivamente para los músicos que el artista define como integrantes estables.
- Sigue siendo posible buscar a Jay Jules como "cantante con quien Eudald ha colaborado" porque el vínculo `contact_artist_assignments` se mantiene intacto.

## Archivos a modificar

- `src/lib/teamCategories.ts` — añadir categoría `colaborador`.
- `src/pages/release-sections/ReleaseCreditos.tsx` — cambiar mapeo `interprete → colaborador` en los dos sitios.
- `src/pages/Teams.tsx` — opción "Mover a Colaboradores" en el menú de cada miembro de Banda.
