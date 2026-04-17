

## Plan: Corregir "desde/hasta" hardcoded en plantilla EN del fullAlbum

### Problema

En `src/components/IPLicenseGenerator.tsx` línea 463, dentro del bloque PDF de `fullAlbum`, las fechas de fijación se concatenan siempre en castellano:

```ts
const fechas = `desde ${s(d.album_fecha_fijacion_desde)} hasta ${s(d.album_fecha_fijacion_hasta)}`;
```

Esto se imprime tal cual en el subitem "f" tanto en el PDF castellano como en el inglés.

### Cambio

Hacer la cadena dependiente de `language`:

```ts
const fechas = language === 'en'
  ? `from ${s(d.album_fecha_fijacion_desde)} to ${s(d.album_fecha_fijacion_hasta)}`
  : `desde ${s(d.album_fecha_fijacion_desde)} hasta ${s(d.album_fecha_fijacion_hasta)}`;
```

### Archivo

| Archivo | Cambio |
|---|---|
| `src/components/IPLicenseGenerator.tsx` | 1 línea: traducción condicional de la cadena `fechas` (línea 463) |

