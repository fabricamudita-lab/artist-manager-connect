

## Plan: Agrupar campos por sección con toggle por grupo y colapsar

### Problema
La configuración de campos muestra 28+ campos en una lista plana. Es lento configurar uno por uno. Los campos ya tienen una propiedad `section` (`info`, `content`, `spotify`, `strategy`, `vevo`) pero no se usa en la UI.

### Solución

**Archivo: `src/pages/release-sections/ReleasePitch.tsx`**

1. **Definir grupos de secciones** con labels en español:
   - `info` → "Información Básica"
   - `content` → "Archivos y Contenido"
   - `spotify` → "Datos Spotify"
   - `strategy` → "Estrategia y RRSS"
   - `vevo` → "Vevo (opcional)"

2. **Reemplazar la lista plana** (líneas 529-557) por secciones colapsables:
   - Cada grupo tiene un header clickable con chevron para expandir/colapsar
   - El header muestra: nombre del grupo + conteo de campos + toggle maestro (visible/editable)
   - Toggle maestro de grupo: al activar/desactivar, cambia todos los campos del grupo de golpe
   - Estado colapsado por defecto para secciones opcionales (vevo)

3. **Toggle maestro por grupo**:
   - Switch "Visible" en el header → activa/desactiva visibilidad de todos los campos del grupo
   - Switch "Editable" en el header → activa/desactiva editable de todos los campos del grupo
   - Estado "indeterminate" (dash) cuando algunos campos están on y otros off dentro del grupo

4. **Campos individuales** dentro de cada grupo expandido mantienen los switches individuales actuales

5. **Estado de colapso** guardado en un `useState` local (no persiste, se reinicia al abrir)

### Detalle técnico

```text
┌─ Información Básica (7)          [Visible ◉] [Editable ◉]  ▼
│  ├─ País                         [  ◉  ]     [  ◉  ]
│  ├─ Descripción                  [  ◉  ]     [  ○  ]
│  └─ ...
├─ Archivos y Contenido (5)        [Visible ◉] [Editable ◉]  ▶ (collapsed)
├─ Datos Spotify (5)               [Visible ◉] [Editable ◉]  ▶
├─ Estrategia y RRSS (4)          [Visible ◉] [Editable ◉]  ▶
└─ Vevo (opcional) (5)            [Visible ○] [Editable ○]  ▶
```

### Un archivo afectado
- `src/pages/release-sections/ReleasePitch.tsx`

