

## Reemplazar selector de artistas del roster por personas de los créditos

### Problema
Dentro del diálogo "Editar Canción", el componente `ReleaseArtistRoles` muestra artistas del roster (tabla `artists`) mediante `ArtistSelector`. El usuario espera ver aquí a las personas ya creditadas en las canciones del release (compositores, letristas, intérpretes, productores, etc.) para poder marcarlas como Main Artist o Featuring para la distribución.

### Solución

Reemplazar el `ReleaseArtistRoles` dentro del diálogo de edición por un nuevo componente **`TrackArtistRolesFromCredits`** que:

1. **Lee los créditos existentes** del release (todas las canciones) y extrae los nombres únicos de las personas creditadas
2. **Muestra una lista** de esas personas con un selector Main Artist / Featuring / Ninguno
3. **Al asignar un rol**, busca si existe un artista con ese nombre en la tabla `artists`:
   - Si existe → lo vincula a `release_artists` con el rol correspondiente
   - Si no existe → crea un perfil de artista tipo `collaborator` y lo vincula

### Cambios concretos

**1. `src/pages/release-sections/ReleaseCreditos.tsx`**
- En el diálogo "Editar Canción" (línea ~450), reemplazar `<ReleaseArtistRoles compact />` por el nuevo componente que lista personas de los créditos
- Pasar los créditos del release como prop

**2. Nuevo: `src/components/releases/CreditedArtistRoles.tsx`**
- Recibe: `releaseId`, `allCredits` (TrackCredit[]), `releaseArtists` (ReleaseArtist[])
- Agrupa los créditos por nombre único (dedup)
- Muestra cada persona con sus roles de crédito como badges (ej. "Compositor, Letrista")
- Selector de distribución: "Sin asignar" / "Main Artist" / "Featuring"
- Al cambiar: upsert en `release_artists` (creando artista collaborator si es necesario)

**3. Mantener `ReleaseArtistRoles` en la página principal** (fuera del diálogo)
- La card general sigue mostrando los artistas ya vinculados al release con sus roles, útil como resumen

### Flujo visual dentro del diálogo

```text
┌─ Editar Canción ──────────────────────────────┐
│  [Título] [ISRC] [Letra]                      │
│                                                │
│  ── Artistas para Distribución ──────────────  │
│                                                │
│  Leyre (Compositor, Letrista)    [Main ▾]      │
│  Alejandro (Producción)          [Feat ▾]      │
│  Francisco (Compositor)          [— ▾]         │
│                                                │
│  Vista: Leyre feat. Alejandro                  │
└────────────────────────────────────────────────┘
```

### Archivos
- `src/components/releases/CreditedArtistRoles.tsx` — nuevo componente
- `src/pages/release-sections/ReleaseCreditos.tsx` — integrar en diálogo, pasar créditos

