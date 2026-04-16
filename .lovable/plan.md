

## Diagnóstico

He revisado:
1. **DB**: `field_config = {}` para Klaus Stroink (y todos los artistas tras la migración).
2. **`isArtistFieldVisible`**: con `{}` devuelve `true` para todos los campos.
3. **`PublicArtistForm.tsx`**: ya renderiza condicionalmente con `v(field)` los 25+ campos (name, stage_name, genre, email, phone, address, description, instagram, spotify, tiktok, clothing_size, shoe_size, allergies, special_needs, company_name, legal_name, tax_id, nif, tipo_entidad, irpf_type, irpf_porcentaje, actividad_inicio, iban, bank_name, swift_code, notes).

**Conclusión**: el código YA respeta `field_config` y debería mostrarlo todo. Si sigues viendo el formulario incompleto, hay 2 causas probables:

### Causa A: Caché del navegador en el formulario público
La página `/artist-form/:token` se cargó antes de las correcciones y el navegador tiene una versión vieja en caché.

### Causa B: Algunos campos se muestran solo si otros tienen un valor concreto
He encontrado **un caso real** en el formulario donde un campo solo aparece bajo condición de otro:
- En el `ArtistInfoDialog` (panel manager), `% IRPF` solo se muestra si `irpf_type === 'personalizado'`.
- En el `PublicArtistForm` no hay esta condición, pero **sí depende de `irpf_type` ser visible**, lo cual está bien.

Lo más probable es **caché**.

## Plan de acción

### Paso 1: Forzar refresco
Pedir al usuario que abra el formulario público con **Cmd+Shift+R** (hard reload) o en pestaña incógnito para descartar caché.

### Paso 2: Si tras hard reload sigue faltando, añadir un debug log
Añadir temporalmente en `PublicArtistForm.tsx` justo después de `setFieldConfig(...)`:
```ts
console.log('[PublicArtistForm] field_config recibido:', (artist as any).field_config);
console.log('[PublicArtistForm] artist data:', artist);
```
Así, en la próxima carga del formulario, podré ver en los logs qué `field_config` está leyendo realmente el cliente y qué campos del artista vienen vacíos vs llenos.

### Paso 3: Garantizar que campos "vacíos" se muestren igual
Actualmente todos los `renderInput` se renderizan si `v(field)` es true, **independientemente** de que el valor esté vacío. Esto ya está bien — un campo vacío debe mostrarse para que el artista lo rellene. Verificado en código.

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/pages/PublicArtistForm.tsx` | Añadir 2 `console.log` temporales tras cargar el artista para diagnosticar qué llega al cliente |

Tras ver los logs decidiré si el problema es de datos, de renderizado o de caché, y aplicaremos el fix definitivo.

