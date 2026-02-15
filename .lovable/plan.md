

# Mejora sustancial del sistema de Creditos y Autoria

## Contexto

Actualmente el sistema tiene solo 2 categorias (Publishing/Master) con ~14 roles basicos. Las distribuidoras como Ditto exigen creditos organizados en 5 categorias principales con roles especificos dentro de cada una. El usuario quiere alinear el sistema con el estandar de la industria sin eliminar nada existente.

## Las 5 categorias principales (estandar distribuidoras)

Siguiendo el formato de Ditto traducido al espanol:

1. **Compositor** - Quien compuso la musica
2. **Autoria** (Songwriter) - Roles de escritura: Autor, Letrista, Arreglista, Director de Orquesta, Libretista
3. **Produccion / Ingenieria** - Productor, Productor Asistente, Ingeniero de Mezcla, Ingeniero de Masterizacion, Director Musical, Ingeniero de Sonido
4. **Interprete** (Performer) - Todos los instrumentos y voces (~80 opciones)
5. **Contribuidor** - Roles adicionales (Remixer, DJ, otros)

## Cambios tecnicos

### 1. Ampliar `src/lib/creditRoles.ts`

- Cambiar la interfaz `CreditRole` para soportar 5 categorias en vez de 2:
  ```
  category: 'compositor' | 'autoria' | 'produccion' | 'interprete' | 'contribuidor'
  ```
- Agregar "Autor" como nuevo rol en autoria (distinto de Compositor)
- Agregar todos los roles de produccion que faltan: Productor Asistente, Ingeniero de Mezcla, Ingeniero de Masterizacion, Director Musical, Ingeniero de Sonido
- Agregar la lista completa de instrumentos y voces como roles de interprete (~80 entradas): Guitarra Acustica, Saxo Alto, Coros, Banjo, Bajo, Bateria, Violonchelo, Clarinete, Congas, DJ, Flauta, Guitarra, Teclados, Voz Principal, Coros de Armonia, Piano, Percusion, Trompeta, Violin, Viola, etc.
- Agregar categoria Contribuidor con roles como Remixer
- Mantener todos los roles existentes mapeados a las nuevas categorias
- Agregar constante `CREDIT_CATEGORIES` con metadata de cada categoria (nombre, color, icono)
- Actualizar `ROLE_ORDER` con los nuevos roles
- Mantener compatibilidad: las funciones `isPublishingRole()` y `isMasterRole()` seguiran funcionando mapeando las categorias antiguas a las nuevas (compositor + autoria = publishing, produccion + interprete + contribuidor = master)

### 2. Actualizar selector de roles en `AddCreditWithProfileForm.tsx`

- Cambiar el selector plano de roles por un selector agrupado por las 5 categorias
- Usar `SelectGroup` + `SelectLabel` de Radix para mostrar los roles organizados:
  ```
  -- Compositor --
  Compositor
  -- Autoria --
  Autor
  Letrista
  Arreglista
  ...
  -- Produccion / Ingenieria --
  Productor
  Ingeniero de Mezcla
  ...
  -- Interprete --
  Voz Principal
  Guitarra
  Piano
  ...
  -- Contribuidor --
  Remixer
  DJ
  ...
  ```

### 3. Actualizar selector de roles en `TrackRightsSplitsManager.tsx`

- Aplicar el mismo patron de selector agrupado en los formularios de AddSplitForm y SplitRow (edicion)
- Mantener el filtrado por tipo (publishing solo muestra compositor+autoria, master muestra produccion+interprete+contribuidor)

### 4. Actualizar `ReleaseCreditos.tsx`

- En el selector de rol en edicion inline (SortableCreditRow), usar el mismo selector agrupado
- Actualizar los badges de categoria para soportar las 5 categorias con colores diferenciados:
  - Compositor: ambar (existente)
  - Autoria: ambar (existente, mismo que publishing)
  - Produccion: azul (existente, mismo que master)
  - Interprete: violeta (nuevo)
  - Contribuidor: gris (nuevo)

### 5. Compatibilidad con datos existentes

- No se elimina ningun rol existente
- Los valores en DB (`compositor`, `letrista`, `productor`, etc.) se mantienen identicos
- Se agregan nuevos valores para los roles nuevos (`autor`, `productor_asistente`, `ingeniero_mezcla`, `guitarra_acustica`, `piano`, `voz_principal`, etc.)
- Las funciones de porcentaje siguen funcionando igual: compositor+autoria alimentan `publishing_percentage`, produccion+interprete+contribuidor alimentan `master_percentage`

### Archivos afectados

- `src/lib/creditRoles.ts` - Expansion masiva de roles y categorias
- `src/components/credits/AddCreditWithProfileForm.tsx` - Selector agrupado
- `src/components/releases/TrackRightsSplitsManager.tsx` - Selector agrupado en formularios de splits
- `src/pages/release-sections/ReleaseCreditos.tsx` - Selector agrupado en edicion inline + badges de 5 categorias

