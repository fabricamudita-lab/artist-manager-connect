

## Plan: Añadir edición de nombre y perfil vinculado en ProjectSettingsDialog

### Contexto

El diálogo de configuración (`ProjectSettingsDialog.tsx`) actualmente solo tiene toggles de tarjeta y eliminación. El usuario quiere poder editar el nombre del proyecto y cambiar el artista/perfil vinculado desde ahí.

### Cambios

**Archivo: `src/components/ProjectSettingsDialog.tsx`**

1. **Ampliar props** para recibir `artistId`, `artistName`, y la lista de artistas disponibles (o `workspaceId` para cargarlos internamente).
2. **Sección "Datos generales"** al inicio del diálogo (antes de los toggles):
   - **Nombre del proyecto**: Input editable, guarda con blur/Enter. Validación: no vacío, máx 100 chars.
   - **Perfil vinculado (artista)**: Select con los artistas del workspace. Opción "Sin artista" (`__none__`). Guarda al cambiar.
3. Cada cambio hace `supabase.update()` en `projects` e invalida queries.

**Archivo: `src/pages/ProjectDetail.tsx`**

4. Pasar `artistId` y `workspaceId` como props adicionales al `ProjectSettingsDialog`.
5. Tras guardar cambios en el diálogo, refrescar el estado local del proyecto (nombre en cabecera, artista en breadcrumb).

### Flujo del diálogo resultante

```text
┌─ Configuración del proyecto ─────────┐
│                                       │
│  Datos generales                      │
│  ────────────────                     │
│  Nombre:    [Puro Payés        ]      │
│  Artista:   [Eudald Payés Roma ▼]    │
│                                       │
│  ─────────────────────────────────    │
│  Vista previa en tarjeta              │
│  (toggles existentes, máx 3)         │
│                                       │
│  ─────────────────────────────────    │
│  Zona peligrosa                       │
│  [🗑 Eliminar proyecto]               │
└───────────────────────────────────────┘
```

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/ProjectSettingsDialog.tsx` | Añadir inputs de nombre y selector de artista |
| `src/pages/ProjectDetail.tsx` | Pasar props adicionales, refrescar estado tras cambios |

