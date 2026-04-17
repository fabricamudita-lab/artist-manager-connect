

## Por qué está así (y por qué es confuso)

Cuando construí el wizard, reutilicé **el mismo paso 3 ("Grabación y Derechos") para Single y para Álbum/EP**, sin diferenciar. La plantilla legal en castellano usa el placeholder `{{titulo_sencillo}}` / `{{grabacion_titulo}}` en cláusulas como *"el/la artista colaborará en la grabación titulada ___"*.

- **Para un Single**: tiene todo el sentido. Es UNA grabación concreta.
- **Para un Álbum/EP**: la cesión cubre **todas las grabaciones del fonograma**, no una sola canción. Pedir "Título de la grabación" + "Duración" + "Fecha de fijación" de un único track es:
  1. Confuso (¿por qué solo uno si son 12?).
  2. Legalmente impreciso (la licencia debería referirse al álbum como obra colectiva).
  3. Redundante con el campo "Lanzamiento" que ya elegiste arriba.

No tiene utilidad real en modo álbum — fue un descuido al duplicar las plantillas.

## Plan de cambio

Hacer que el paso 3 sea **adaptativo según `recordingType`**:

### Modo Single (sin cambios)
- Selector de track + duración + fecha de fijación + videoclip de ESA grabación.

### Modo Álbum / EP (nuevo)
- **Ocultar**: selector de track individual, "Título de la Grabación", "Duración" (de un track).
- **Mostrar en su lugar**:
  - **Título del álbum/EP**: autocompletado desde el `release` seleccionado, editable.
  - **Número de grabaciones**: autocompletado contando `tracks.length`, editable.
  - **Duración total**: suma automática de duraciones de tracks, editable.
  - **Fecha de fijación del fonograma**: una sola fecha para toda la obra.
  - **Videoclip(s)**: Sí / No (mantener).
- Resto del paso (calidad de intervención, carácter, acreditación, royalty) **se mantiene igual** porque aplica al colaborador, no a una canción.

### Cambios técnicos

| Archivo | Cambio |
|---|---|
| `src/components/IPLicenseGenerator.tsx` | Añadir `FormData` campos `album_titulo`, `album_num_tracks`, `album_duracion_total`. Renderizado condicional del paso 3 según `recordingType`. Auto-cálculo desde `release`+`tracks` cuando se selecciona álbum. |
| `src/lib/contracts/ipLicenseTemplates.ts` | Verificar/ajustar placeholders en `IP_CLAUSES_ES_ALBUM` y `IP_CLAUSES_EN_ALBUM` para usar `{{album_titulo}}`, `{{album_num_tracks}}`, etc. en vez de `{{titulo_sencillo}}`. |
| `mem://contracts/ip-license-generator` | Documentar diferenciación Single vs Álbum en paso 3. |

### Resultado

El usuario que selecciona "Álbum" o "EP" verá un paso 3 coherente con la naturaleza colectiva del fonograma, sin tener que elegir un track suelto que no representa la obra licenciada.

