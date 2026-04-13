

## Plan: Selector de tipo de documento de identidad (DNI/NIE/Pasaporte)

### Problema
El PDF muestra literalmente "con DNI (NIE/DNI/PASSAPORTE) 12345678A" cuando debería mostrar solo el tipo seleccionado, ej. "con DNI 12345678A".

### Solución

**Archivo: `src/components/IPLicenseGenerator.tsx`**

1. **Añadir campos de tipo de documento al FormData**: `productora_doc_tipo` y `colaboradora_doc_tipo` con valores posibles `'DNI' | 'NIE' | 'Pasaporte'`, default `'DNI'`.

2. **Añadir selector en el formulario**: Antes del input de número de documento, poner un `Select` con las tres opciones (DNI, NIE, Pasaporte) tanto para la productora (paso 1) como para el colaborador/a (paso 2).

3. **Actualizar generación del PDF**: Reemplazar el texto fijo `"con DNI (NIE/DNI/PASSAPORTE)"` por `"con ${d.productora_doc_tipo}"` y `"con ${d.colaboradora_doc_tipo}"` respectivamente en las líneas 276-282.

4. **Actualizar el label del input**: Cambiar el placeholder del campo de número para reflejar el tipo seleccionado (ej. "Número de DNI").

### Archivos afectados
- `src/components/IPLicenseGenerator.tsx`

