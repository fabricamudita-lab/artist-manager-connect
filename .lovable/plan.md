

## Plan: Añadir campos "Sociedad (PRO)" y "Notas" a los créditos de autoría

### Situación actual
- La tabla `track_credits` ya tiene columna `notes` pero **no** tiene `pro_society`
- Ninguno de los dos campos se muestra en la UI de créditos (`TrackRightsSplitsManager`)
- En el PDF del Split Sheet estos campos aparecen como placeholders `[________]`

### Cambios necesarios

**1. Nueva columna en base de datos (migración)**
- Añadir `pro_society TEXT` a `track_credits` (para almacenar SGAE, BMI, ASCAP, etc.)

**2. Actualizar tipos TypeScript**
- Regenerar o actualizar manualmente `TrackCredit` en `useReleases.ts` para incluir `pro_society`

**3. UI en TrackRightsSplitsManager (solo para tipo `publishing`)**
- En el formulario de edición (`SplitRow` editing mode, ~línea 236): añadir campo "Sociedad (PRO)" (input text) y "Notas" (input text) debajo del slider de porcentaje
- En el formulario de creación (`AddSplitForm`): añadir los mismos dos campos
- Solo mostrar estos campos cuando `type === 'publishing'` — no aplican a Master
- Guardar `pro_society` y `notes` en las mutaciones `createCredit` y `updateCredit`

**4. Mostrar en la vista de lectura (SplitRow no-editing mode)**
- Mostrar badges o texto secundario con la sociedad y notas si están rellenados

**5. Actualizar PDF del Split Sheet**
- En `exportSplitsPDF.ts`: reemplazar los placeholders `[________]` por los valores reales de `pro_society` y `notes`, manteniendo el placeholder si están vacíos

**6. Acceso desde Presupuestos**
- Verificar que la vista de créditos/splits desde presupuestos usa el mismo componente `TrackRightsSplitsManager` — si es así, los campos estarán disponibles automáticamente

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migración SQL | `ALTER TABLE track_credits ADD COLUMN pro_society TEXT` |
| `src/integrations/supabase/types.ts` | Regenerar con nueva columna |
| `src/hooks/useReleases.ts` | Actualizar tipo `TrackCredit` si es manual |
| `src/components/releases/TrackRightsSplitsManager.tsx` | Añadir inputs PRO y Notas en formularios (solo publishing) |
| `src/utils/exportSplitsPDF.ts` | Usar valores reales en vez de placeholders |

