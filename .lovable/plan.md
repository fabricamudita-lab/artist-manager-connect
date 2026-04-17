

## Plan: Añadir tipo "Álbum Completo" (fullAlbum) al generador de Licencias IP

### Contexto

Actualmente `IPLicenseRecordingType = 'single' | 'album'`. La opción `album` representa hoy "una o más canciones dentro de un álbum" (con prorrateo). Falta el tercer caso: **colaborador en TODAS las canciones** (sin prorrateo + Anexo I con listado).

Cambios documentales clave (según el comparativo adjunto):

| Bloque | Single / Album track | **Full Album (nuevo)** |
|---|---|---|
| Manifestación II | "una o más obras musicales" | "todas las obras musicales que componen el Álbum… detalladas en el Anexo I" |
| Cláusula 1.1 | Detalles de UNA grabación | Detalles del **álbum**: título, nº grabaciones, calidad, carácter, videoclips, fechas desde/hasta, "Listado: Según Anexo I" |
| Cláusula 3.2 | Prorrata tituli | Sin prorrateo + cláusula adicional para explotación independiente como single |
| Anexo I | — | Listado numerado de todas las grabaciones (título + duración) |
| Resto cláusulas (1.2, 2.x, 3.1, 3.3-3.5, 4, 5, 6) | — | Idénticas a `album` |

### Cambios técnicos

**1. `src/lib/contracts/ipLicenseTemplates.ts`**
- Ampliar tipo: `IPLicenseRecordingType = 'single' | 'album' | 'fullAlbum'`.
- Añadir `IP_CLAUSES_ES_FULL_ALBUM` e `IP_CLAUSES_EN_FULL_ALBUM` (spread sobre la variante album, sobreescribiendo `objeto_1_1` y `contraprestacion_3_2` con los textos del PDF castellano/inglés adjuntos).
- Añadir a `IPLegalClauses` (opcional) o a `getPDFLabels` los textos del nuevo Manifiesto II (`manifiestoIIFullAlbum`) y del título del Anexo I + frase de cierre, en ES y EN.
- `getDefaultIPClauses` enruta los 3 casos.

**2. `src/components/IPLicenseGenerator.tsx`**

- **FormData**: añadir campos solo usados en fullAlbum:
  - `album_titulo`, `album_num_grabaciones`, `album_videoclips_si_no`, `album_fecha_fijacion_desde`, `album_fecha_fijacion_hasta`.
  - `album_tracks: { titulo: string; duracion: string }[]` (alimentado por defecto desde `useTracks(releaseId)` cuando hay release; editable manualmente).
- **Selector tipo (Step 0)**: 3 opciones `Single` / `Álbum (canción individual)` / `Álbum completo`.
- **Autodetección desde release**: hoy `ep|album → 'album'`. Mantener ese default, pero permitir al usuario cambiar entre `album` y `fullAlbum` cuando el release sea ep/album (no permitir `single`). Para release tipo `single` → fijar `single`. Texto de ayuda: "El lanzamiento permite Álbum o Álbum completo".
- **Step "Grabación y Derechos"**: render condicional.
  - Si `recordingType === 'fullAlbum'`: mostrar campos del álbum + tabla editable de grabaciones (precargada con tracks del release, botón "Añadir fila"). Ocultar campos de track único.
  - Si `single` / `album`: comportamiento actual.
- **`generatePDF`**:
  - Sustituir el bloque de subitems a-f de la cláusula 1.1 por el bloque a-g del fullAlbum cuando aplique.
  - Manifiesto II usa `manifiestoIIFullAlbum`.
  - Tras la cláusula 6, si `fullAlbum`: añadir nueva página/sección "ANEXO I — LISTADO DE GRABACIONES DEL ÁLBUM" con la lista numerada y la frase de cierre.

**3. Memoria**
- Actualizar `mem://contracts/ip-license-generator`: 3 tipos (single / album / fullAlbum), bilingüe, autodetección release, anexo I auto-poblado desde tracks.

### Comportamiento UX resultante

- Desde `/releases/:id/contratos` con un EP/álbum: el selector muestra `Álbum` y `Álbum completo` (single bloqueado). El Anexo I se precarga automáticamente con los tracks del release.
- Desde Documentos generales: selector con los 3 tipos libres.
- Si el release es Single: solo `Single` disponible (como ya está).

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/lib/contracts/ipLicenseTemplates.ts` | Nuevo tipo + 2 plantillas + textos auxiliares ES/EN |
| `src/components/IPLicenseGenerator.tsx` | FormData ampliado, render condicional Step 3, PDF con Anexo I, selector con 3 opciones y autodetección refinada |
| `mem://contracts/ip-license-generator` | Documentar nuevo tipo |

