

## Plan: Corregir "Album" → "Single" en plantilla EN Single de Licencia IP

### Cambio

En `src/lib/contracts/ipLicenseTemplates.ts`, dentro de la constante `IP_CLAUSES_EN_SINGLE`, reemplazar tres ocurrencias de "the Album" por "the Single":

| Cláusula | Texto actual | Texto nuevo |
|---|---|---|
| 2.1 | `the Recording, the Album, the music video` | `the Recording, the Single, the music video` |
| 2.3 | `of the Recording, the Album and, where applicable` | `of the Recording, the Single and, where applicable` |
| 3.4 | `distribution of the Album and the Recording` | `distribution of the Single and the Recording` |

La plantilla `IP_CLAUSES_EN_ALBUM` no se toca.

### Archivo

| Archivo | Cambio |
|---|---|
| `src/lib/contracts/ipLicenseTemplates.ts` | 3 reemplazos puntuales en `IP_CLAUSES_EN_SINGLE` |

