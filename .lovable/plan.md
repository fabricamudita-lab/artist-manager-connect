
# Nuevo formulario de presupuesto para lanzamientos (releases)

## Resumen

Crear un nuevo componente `CreateReleaseBudgetDialog` exclusivo para la seccion de presupuestos de un release. Este formulario reemplaza al `CreateBudgetDialog` generico (orientado a conciertos) y contiene campos especificos para produccion musical, junto con "palancas" (toggles/variables) que generan automaticamente las partidas (budget_items) organizadas en las 11 categorias del mapa completo.

## Que vera el usuario

### Paso 1: Cabecera (metadata)
Campos pre-rellenados desde el release:
- Artista (readonly, heredado del release)
- Titulo del release (readonly)
- Tipo (Single / EP / Album / Deluxe / Re-edicion)
- Version (Clean / Explicit / Instrumental / Radio / Remixes)
- Territorio objetivo (ES / Global / foco paises)
- Sello y Distribucion (heredados del release si existen)
- Estado (Idea / Produccion / Mezcla / Master / Entregado / Programado / Publicado)
- Prioridad (Alta / Media / Baja)
- Owner interno
- Notas internas

### Paso 2: Fechas
- Release digital (principal)
- Release fisico (opcional)
- Singles previos (multi-fecha)
- Deadlines auto-calculados: entrega masters, arte, pitch DSP, anuncio, pre-save (offsets desde fecha principal)

### Paso 3: Variables que disparan presupuesto
Toggles y campos numericos que determinan que partidas se generan:
- N tracks (auto del release)
- Productor/es (toggle + input)
- Incluye mezcla? / Mezcla externa?
- Master (estereo / vinilo / atmos / TBD)
- N videoclips, N capsulas RRSS
- Shooting?, Vestuario?, Making of?, Edicion capsulas?
- Stage / residencia tecnica? + N dias
- PR nacional? + proveedor + coste
- PR internacional? + proveedor + coste
- Gestion RRSS? + coste
- Transporte / dietas / hospedaje?
- Contingencia % (slider 5-15%)

### Al crear: generacion automatica de partidas
Se crean `budget_categories` y `budget_items` segun las 11 categorias del mapa:
1. Grabacion (produccion, ingenieria, musicos, alquiler estudio, mezcla, master...)
2. Produccion (project management, making-of, capsulas, imprevistos)
3. Diseno (direccion arte, diseno grafico, shooting, videoclips, capsulas RRSS, vestuario)
4. Stage (tour mgmt, tecnica sonido, luces, escenografia, alquiler espacio, dietas)
5. Transporte (combustible, alquiler vehiculo, transporte publico)
6. Dietas (comidas, cenas, extras)
7. Hospedaje (alojamiento, habitaciones extra)
8. PR & Marketing (fotos, PR nacional/intl, RRSS, ads, playlisting, radio, influencers, EPK, evento)
9. Distribucion & Admin (distribucion, content ID, registros, legal, contabilidad)
10. Fabricacion & logistica (vinilo/CD, pruebas, packaging, envios, fulfillment)
11. Contingencia (reserva/margen)

Cada budget_item se crea con: nombre, importe 0 por defecto (o el coste indicado), IVA %, IRPF %, proveedor vacio, notas, estado "Pendiente".

Solo se generan las categorias/subcategorias correspondientes a las variables activadas (toggles en "si").

## Detalle tecnico

### Archivos nuevos
- `src/components/releases/CreateReleaseBudgetDialog.tsx` - Nuevo dialogo con formulario multi-paso (cabecera + fechas + variables + confirmacion)

### Archivos modificados
- `src/pages/release-sections/ReleasePresupuestos.tsx` - Reemplazar `CreateBudgetDialog` por `CreateReleaseBudgetDialog`
- `src/components/BudgetDetailsDialog.tsx` - Agregar constante `RELEASE_DEFAULT_CATEGORIES` con las 11 categorias del mapa, y logica `ensureReleaseCategories` para cuando `budget.type === 'produccion_musical'`

### No se necesitan cambios en base de datos
La tabla `budgets` ya tiene `release_id`, `type` (produccion_musical), y `budget_items` + `budget_categories` soportan cualquier estructura de categorias/subcategorias. Se usara el campo `internal_notes` del budget para guardar la metadata extendida (version, territorio, prioridad, etc.) como JSON si es necesario, o bien se almacenara en un campo JSONB nuevo.

### Migracion SQL (opcional pero recomendada)
Agregar una columna `metadata` de tipo JSONB a `budgets` para almacenar la configuracion especifica del release (version, territorio, prioridad, deadlines, variables activadas) sin alterar la estructura existente.

```text
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
```

### Logica de generacion de partidas
Al hacer submit, el dialogo:
1. Crea el budget con `type = 'produccion_musical'`, `release_id`, `artist_id`, y `metadata` con toda la config
2. Crea las `budget_categories` necesarias segun las variables activadas
3. Crea los `budget_items` vinculados a cada categoria, con importes por defecto (0 o los indicados por el usuario)
4. El usuario luego puede editar todo desde `BudgetDetailsDialog` (que ya existe y funciona)

### Flujo de datos
- El numero de tracks se lee automaticamente del release (query a `release_tracks`)
- El artista se hereda del release
- Las fechas del cronograma se leen de `release_milestones` si existen
- Los campos de proveedor y coste de PR se almacenan como observaciones en el budget_item correspondiente
