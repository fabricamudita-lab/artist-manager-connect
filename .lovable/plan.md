

## Indicar Main Artist vs Featuring en Créditos y Autoría

### Contexto
La tabla `release_artists` ya tiene una columna `role` (texto, default `'primary'`). Actualmente no se usa — todos los artistas se insertan sin especificar rol. El objetivo es permitir marcar qué artistas son "Main Artist" y cuáles son "Featuring" directamente desde la sección de Créditos y Autoría, información esencial para la distribución en plataformas.

### Cambios

**1. Sección de artistas en ReleaseCreditos.tsx**

Añadir un bloque visual antes de las canciones que muestre los artistas vinculados al release con su rol (Main / Featuring). Cada artista tendrá un selector o toggle para cambiar entre `main` y `featuring`. Se podrán añadir artistas adicionales como featuring directamente desde aquí.

```text
┌─────────────────────────────────────────────┐
│  Artistas del Lanzamiento                   │
│                                             │
│  🎤 Leyre              [Main Artist ▾]      │
│  🎤 Alejandro Estruch  [Featuring   ▾]      │
│                                             │
│  + Añadir artista                           │
└─────────────────────────────────────────────┘
```

Al cambiar el rol, se actualiza `release_artists.role` con valor `'main'` o `'featuring'`.

**2. Actualizar inserciones de release_artists** — `useReleases.ts`

En `useCreateRelease` y `useUpdateRelease`, cuando se insertan registros en `release_artists`, pasar el `role` correspondiente. El primer artista se marca como `main` por defecto, los demás como `main` también (el usuario puede cambiarlos a featuring después).

**3. Mostrar el rol en ReleaseDetail.tsx**

En la cabecera del release, diferenciar visualmente los artistas main de los featuring:
- Main artists se muestran primero
- Featuring artists se muestran precedidos de "feat." 
- Ejemplo: `Leyre feat. Alejandro Estruch`

**4. Incluir en Label Copy**

Actualizar la generación del Label Copy (PDF y solicitud de aprobación) para incluir la distinción Main Artist / Featuring en la cabecera del release.

**5. Actualizar EditReleaseDialog.tsx**

En el diálogo de edición, al gestionar artistas, preservar el `role` existente de cada artista al hacer sync (actualmente se borran y re-insertan sin role).

### Archivos a modificar
- `src/pages/release-sections/ReleaseCreditos.tsx` — nueva sección de artistas con selector de rol
- `src/hooks/useReleases.ts` — preservar/gestionar `role` en release_artists
- `src/pages/ReleaseDetail.tsx` — mostrar "feat." para featuring artists
- `src/components/releases/EditReleaseDialog.tsx` — preservar roles al editar
- `src/utils/exportLabelCopyPDF.ts` — incluir Main/Feat en export

### Sin migración necesaria
La columna `role` ya existe en `release_artists`. Solo necesitamos usarla con valores `'main'` y `'featuring'`.

