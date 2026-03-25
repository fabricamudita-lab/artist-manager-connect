

## Solicitud de aprobación de Label Copy desde Créditos

### Concepto
Añadir un botón "Solicitar aprobación" junto al botón "Descargar Label Copy" en la sección de Créditos y Autoría. Al pulsarlo, se crea una solicitud de tipo `licencia` (o un nuevo tipo `label_copy`) vinculada al release y al artista, con un resumen auto-generado de los créditos actuales en las observaciones. La artista/equipo puede entonces revisarla y aprobarla/denegarla desde el módulo de solicitudes.

### Cambios

**1. `src/pages/release-sections/ReleaseCreditos.tsx`**

- Añadir botón "Solicitar aprobación" con icono `CheckCircle` o `UserCheck` junto al botón de descarga
- Al pulsarlo:
  1. Recopilar todos los créditos de todas las pistas (igual que `handleExportLabelCopy`)
  2. Generar un texto resumen del label copy (artista, tracks, créditos por canción, splits)
  3. Insertar una solicitud en la tabla `solicitudes` con:
     - `tipo: 'licencia'` (reutilizando el tipo existente, ya que es aprobación de derechos/metadatos)
     - `nombre_solicitante`: nombre del release (ej. "Label Copy - Álbum X")
     - `artist_id`: el artista del release
     - `observaciones`: resumen textual de los créditos
     - `estado: 'pendiente'`
     - `created_by`: usuario actual
     - `project_id`: el `project_id` del release si existe
     - `descripcion_libre`: enlace o referencia al release ID para contexto
  4. Mostrar toast de confirmación con link a solicitudes

- Deshabilitar el botón si no hay tracks o no hay créditos

**2. Generación del resumen de créditos** (dentro del mismo archivo o función helper)

Formato del texto en `observaciones`:
```text
Label Copy para: "Título del Álbum"
Artista: Nombre

1. Canción A
   - Compositor: Nombre (50%)
   - Autoría: Nombre (50%)
   - Producción: Nombre

2. Canción B
   ...
```

### Resultado
El manager puede generar una solicitud de aprobación directamente desde créditos. La artista o equipo la revisa en el módulo de solicitudes y da el OK (aprueba) o solicita cambios (deniega con comentario). No requiere cambios en la base de datos — usa la tabla `solicitudes` existente.

