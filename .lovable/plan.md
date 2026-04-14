

## Plan: Arreglar 3 bugs en el Generador de Licencias IP

### 1. Contactos duplicados en el buscador

**Causa**: La BD tiene registros duplicados reales (2 artistas "Leyre Estruch" + 2 contactos). El componente los muestra todos.

**Fix en `PersonSearchInput.tsx`**: Deduplicar resultados por `(legal_name || name) + source`, quedándose con el registro que tenga más campos rellenos (nif, address, email, stage_name).

### 2. Duración no se actualiza al seleccionar track

**Causa**: La query usa `.order('version_number')` pero esa columna no existe en `track_versions`. Las columnas disponibles son: `id, track_id, version_name, file_url, file_bucket, is_current_version, uploaded_by, notes, created_at`.

**Fix en `IPLicenseGenerator.tsx` (~línea 803)**: Cambiar `.order('version_number', { ascending: false })` por `.eq('is_current_version', true)` o `.order('created_at', { ascending: false })`. También cambiar el placeholder de "3:45" a "MM:SS" (línea 849).

### 3. Fecha de fijación sin calendario

**Causa**: Es un `<Input>` plano (línea 859).

**Fix en `IPLicenseGenerator.tsx` (línea 859)**: Reemplazar por un `Popover` + `Calendar` + `Button` (patrón DatePicker de shadcn), formateando la fecha como `dd/mm/yyyy`. Importar `Calendar`, `Popover`, `format`/`parse` de date-fns.

### Archivos a modificar
- `src/components/PersonSearchInput.tsx` — deduplicación
- `src/components/IPLicenseGenerator.tsx` — fix query duración + calendario fecha fijación

