

## Plan: Fix 404 en formulario de contacto + Formulario público completo para artistas del roster

### Problema 1: 404 en `/contact-form/:token`
La ruta existe en el código y el token existe en la base de datos, pero la app publicada no incluye todavía esta ruta. **Se necesita re-publicar la app**. La ruta está correctamente fuera de `ProtectedRoute`.

### Problema 2: Artistas del roster — campos editables y formulario público
El `ArtistInfoDialog` ya muestra todos los campos (tallas, salud, fiscal, bancarios). Sin embargo, el usuario quiere:
- Que el **formulario público del artista** (`/artist-form/:token`) también incluya **todos los campos** que tiene la ficha interna (tallas, alergias, banco, fiscal, etc.), no solo los campos básicos de bio/redes.
- Equivalencia funcional con el formulario de contacto (que usa `field_config` con toggles).

### Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/PublicArtistForm.tsx` | Ampliar el formulario público para incluir todos los campos del artista: tallas (clothing_size, shoe_size), salud (allergies, special_needs), datos fiscales (company_name, legal_name, tax_id, nif, tipo_entidad), datos bancarios (bank_name, iban, swift_code), y notas |
| Re-publicar la app | Necesario para que la ruta `/contact-form/:token` funcione en la URL publicada |

### Consideraciones de escalabilidad
- Los campos del artista ya están todos en la tabla `artists` — no se necesitan cambios en la base de datos.
- El formulario público de artista (`/artist-form/:token`) ya tiene RLS configurado para `anon` — solo se amplía el UI.
- El formulario de contacto (`/contact-form/:token`) ya tiene su tabla de tokens y políticas RLS — solo necesita la re-publicación.
- No hay riesgo de conflicto con otras funcionalidades: ambos formularios usan tokens aislados con sus propias tablas.

### Detalle técnico
En `PublicArtistForm.tsx`, añadir secciones colapsables para:
1. **Tallas**: clothing_size, shoe_size
2. **Salud**: allergies, special_needs
3. **Datos Fiscales**: company_name, legal_name, tax_id, nif, tipo_entidad
4. **Datos Bancarios**: bank_name, iban, swift_code
5. **Notas**: notes

Todos estos campos ya existen en la tabla `artists` y ya se guardan correctamente desde `ArtistInfoDialog`. El formulario público simplemente los expondrá para que el propio artista los rellene.

