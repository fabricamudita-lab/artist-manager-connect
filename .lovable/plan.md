

## Plan: Añadir versiones en inglés de las Licencias IP (Single y Álbum)

### Contexto

El generador de Licencias IP (`mem://contracts/ip-license-generator`) actualmente soporta versiones en castellano para Single y Álbum. El usuario quiere añadir las mismas dos plantillas en inglés, manteniendo la lógica del wizard de 5 pasos, variables, justificación textual y búsqueda de personas intactas.

### Pasos

1. **Leer los .pages adjuntos** con `document--parse_document` para extraer el texto exacto en inglés de ambas licencias (Single y Álbum).
2. **Localizar el generador IP** (probablemente en `src/components/contracts/` o `src/lib/contracts/`) e identificar dónde están las plantillas en castellano y cómo se seleccionan.
3. **Añadir selector de idioma** (ES / EN) en el paso correspondiente del wizard, por defecto ES para no romper flujos existentes.
4. **Crear las plantillas EN** como constantes paralelas a las ES, reutilizando exactamente los mismos placeholders (`{{nombre_artista}}`, `{{titulo_obra}}`, etc.) para que la lógica de relleno no cambie.
5. **Traducir las etiquetas y textos de justificación** al inglés cuando el idioma seleccionado sea EN (cláusulas, encabezados, firmas).
6. **Verificar exportación PDF**: el componente de generación de PDF debe seguir funcionando idéntico — solo cambia el contenido textual.

### Archivos previstos

| Archivo | Cambio |
|---|---|
| `src/lib/contracts/ipLicenseTemplates.ts` (o similar) | Añadir `IP_LICENSE_SINGLE_EN` y `IP_LICENSE_ALBUM_EN` |
| Componente del wizard IP | Añadir Select de idioma; pasar plantilla correcta según ES/EN |
| Memoria `mem://contracts/ip-license-generator` | Actualizar para reflejar soporte bilingüe |

### Antes de implementar

Necesito leer los dos `.pages` para extraer el texto en inglés y localizar la estructura actual del generador IP en el código.

