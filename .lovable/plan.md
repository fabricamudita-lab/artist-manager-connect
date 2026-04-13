

## Plan: Guardar la Licencia IP en la tabla `documents` desde la página Documentos

### Problema
En `Documents.tsx`, el `IPLicenseGenerator` se renderiza **sin** `onSave`, por lo que al generar el PDF solo se descarga localmente y nunca se guarda en Supabase. Lo mismo ocurre en `BookingDocumentsTab.tsx`.

### Solución

**Archivo: `src/pages/Documents.tsx` (líneas 675-678)**

Añadir un `onSave` al `IPLicenseGenerator` que:
1. Sube el blob PDF al bucket `documents` en la ruta `{profile.id}/{timestamp}_{title}.pdf`
2. Inserta un registro en la tabla `documents` con los campos: `title`, `category: 'contracts'`, `file_type: 'application/pdf'`, `file_size`, `file_url`, `artist_id`, `uploaded_by`
3. Llama a `fetchDocuments()` para refrescar la lista
4. Muestra un toast de confirmación

```text
IPLicenseGenerator → onSave(contract) → Upload blob to storage
                                       → Insert into documents table
                                       → Refresh list
                                       → Toast success
```

**Archivo: `src/components/booking-detail/BookingDocumentsTab.tsx` (líneas 647-650)**

Aplicar el mismo patrón pero insertando en la tabla correspondiente de booking documents (si existe) o igualmente en `documents`.

### Cambios concretos

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `Documents.tsx` | 675-678 | Añadir prop `onSave` con lógica de upload + insert en `documents` |
| `BookingDocumentsTab.tsx` | 647-650 | Añadir prop `onSave` con lógica equivalente |

Aproximadamente 25 líneas nuevas por archivo, siguiendo el patrón exacto que ya existe en `ReleaseContratos.tsx` (líneas 456-482) adaptado a la tabla `documents`.

