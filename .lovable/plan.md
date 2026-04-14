

## Plan: Auto-completar datos de Productora y Colaborador/a desde la BD

### Problema
Los campos de Productora (paso 1) y Colaborador/a (paso 2) se rellenan manualmente. Si la persona ya existe en la base de datos (tabla `artists` o `contacts`), debería auto-completarse al seleccionar o escribir el nombre.

### Solución

**Archivo: `src/components/IPLicenseGenerator.tsx`**

1. **Añadir un selector de búsqueda en "Nombre completo" para ambos pasos** que busque en `artists` y `contacts`:
   - Usar un combo input + dropdown: al escribir, se filtran coincidencias de ambas tablas
   - Al seleccionar una persona, se auto-rellenan todos los campos disponibles

2. **Queries de datos**:
   - Query `artists`: campos `name`, `legal_name`, `stage_name`, `nif`, `address`, `email`
   - Query `contacts`: campos `name`, `legal_name`, `stage_name`, `address`, `email` (no tienen `nif` pero sí datos útiles)
   - Usar `useQuery` para cargar ambas listas al abrir el diálogo

3. **Mapping de campos al seleccionar**:

   | Campo BD (artists) | Campo formulario (Productora) | Campo formulario (Colaborador/a) |
   |---|---|---|
   | `legal_name` o `name` | `productora_nombre` | `colaboradora_nombre` |
   | `nif` / `tax_id` | `productora_dni` | `colaboradora_dni` |
   | `address` | `productora_domicilio` | `colaboradora_domicilio` |
   | `stage_name` | `productora_nombre_artistico` | `colaboradora_nombre_artistico` |
   | `email` | `productora_email` | `colaboradora_email` |

   Para contacts: mismo mapping pero sin `nif`.

4. **UI**: Reemplazar los `<Input>` de "Nombre completo" por un componente con lista desplegable filtrable (similar a un combobox). Al escribir texto, se muestran coincidencias. Si se selecciona una, se auto-rellenan los campos. Si no se selecciona ninguna, el texto libre queda como nombre manual.

5. **Importar `useQuery`** de tanstack y `Popover`/`Command` de shadcn para el buscador.

### Cambios concretos
- Añadir queries para `artists` y `contacts` (~10 líneas)
- Crear función `handleSelectPerson(person, target: 'productora' | 'colaboradora')` que rellena los campos (~15 líneas)
- Reemplazar `<Input>` de nombre en caso 0 y caso 1 por un combobox con búsqueda (~30 líneas cada uno)
- Los campos siguen siendo editables manualmente después del auto-completado

