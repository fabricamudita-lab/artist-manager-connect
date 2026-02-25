

## Mejoras en el Generador de Contratos

Tres mejoras en el componente `ContractGenerator.tsx` y su plantilla `contractTemplates.ts`:

### 1. Promotor: Guardar como contacto nuevo

En el paso "Promotor", cuando se introducen datos manualmente (sin seleccionar un contacto existente), agregar un boton "Guardar como contacto" que cree un registro en la tabla `contacts` con los datos introducidos (nombre, CIF, direccion, representante, cargo). Tras guardarlo, se vincula automaticamente como `selectedContactId`.

**Archivo: `src/components/ContractGenerator.tsx`**
- Agregar boton "Guardar como contacto" debajo del formulario manual del promotor
- Al hacer clic, insertar en `contacts` con los campos: `name` = representante, `company` = nombre, `address` = direccion, `role` = cargo
- Tras el insert, setear `selectedContactId` con el nuevo ID
- Mostrar un toast de confirmacion y deshabilitar el boton (ya vinculado)

### 2. Precio Tickets: Multiples tipos de precio

Reemplazar el input simple de "Precio Tickets" por un sistema que permita agregar multiples lineas de precio (ej: "General: 22EUR", "VIP: 45EUR", "Early Bird: 18EUR").

**Archivo: `src/lib/contractTemplates.ts`**
- Cambiar `precioTickets: string` a `precioTickets: { tipo: string; precio: string }[]` en `ContractConditions`
- Actualizar `generateContractDocument` para renderizar la lista de precios

**Archivo: `src/components/ContractGenerator.tsx`**
- Reemplazar el input unico por una lista dinamica con boton "+ Agregar precio"
- Cada fila tiene dos campos: "Tipo" (ej: General, VIP, Early Bird) y "Precio" (ej: 22EUR)
- Boton para eliminar cada fila
- Default: una fila vacia o con "General" / "TBC"

### 3. Artista: Pre-rellenar desde booking

El campo "Artista" ya se pre-rellena desde `bookingData.artista`, pero se mantendra como esta ya que funciona correctamente con el `useEffect` existente. No requiere cambios adicionales.

### 4. Sponsors: Selector con opciones predefinidas

Reemplazar el textarea libre por un `Select` con tres opciones predefinidas, mas la posibilidad de texto personalizado.

**Archivo: `src/components/ContractGenerator.tsx`**
- Reemplazar el `Textarea` de sponsors por un `Select` con las opciones:
  - **"Estricta"**: Valor = "No, y nunca en caja escenica del escenario sin previo acuerdo del artista. Sin marcas ni patrocinadores visibles."
  - **"Con permiso"**: Valor = "Marcas permitidas unicamente con permiso previo por escrito en la caja escenica."
  - **"Sin limitaciones"**: Valor = "Sin limitaciones respecto a patrocinadores y marcas."
  - **"Personalizado"**: Muestra un textarea para escribir condiciones libres
- Default: "Estricta"

**Archivo: `src/lib/contractTemplates.ts`**
- No requiere cambios estructurales, `sponsors` sigue siendo string

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/contractTemplates.ts` | Cambiar tipo `precioTickets` a array, actualizar generador |
| `src/components/ContractGenerator.tsx` | Boton guardar contacto, precios multiples, selector sponsors |

