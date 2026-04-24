# Facturas agrupadas (varias partidas en una misma factura)

## El problema

Hoy, en una partida de presupuesto, puedes adjuntar **una URL de factura** y marcar el estado (`Pendiente → Factura solicitada → Factura recibida → Pagada`). Pero no hay forma de decir:

> "Estas dos partidas (Marc Soto · músico 300 € + Mix Hobba · grabación 250 €) corresponden a **la misma factura** del proveedor — total 550 €. No me la pagues dos veces."

Si copias la URL en ambas partidas, contabilidad/gestoría no sabe si es una factura repetida o la misma agrupada → riesgo real de doble pago.

## Lenguaje contable correcto

Una gestoría llamaría a esto una **factura con varios conceptos / multi-línea**, donde cada línea del presupuesto es una **línea de factura** del mismo documento. La pieza clave que las une es el **número de factura del proveedor** (más el proveedor y la fecha). Por eso introducimos:

- **Nº de factura del proveedor** (campo identificador, ej. `2026/A-117`)
- **Estado de pago a nivel de factura** (no de línea), con un estado nuevo: **"Agrupada en factura"** para las líneas adicionales que comparten documento.

Así cualquier contable lo lee de un vistazo: una sola factura `2026/A-117` de Marc Soto por 550 € (IVA + IRPF aplicados al total), con dos líneas internas asignadas a categorías distintas (Musicos y Grabación).

## Cómo se verá en la UI

En la tabla de partidas (cada categoría: Grabación, Musicos, …):

```text
CONCEPTO     CONTACTO      PRECIO   ESTADO                FACTURA
Mix Hobba    Marc Soto     250 €    Factura recibida ●    📎 2026/A-117  [principal]
Tocar bajo   Marc Soto     300 €    Agrupada en factura   ↳ 2026/A-117   (550 € total)
```

- La **línea principal** lleva el adjunto/URL y muestra el total real de la factura.
- Las **líneas agrupadas** muestran un badge sutil ("Agrupada en 2026/A-117") y un enlace que lleva a la línea principal. **No se pueden pagar de forma independiente** desde Cobros/Pagos: cuando marcas "Pagada" la principal, todas las agrupadas pasan a Pagada automáticamente.

### Cómo se agrupa (acción del usuario)

Desde el menú de una partida → **"Agrupar en factura existente…"** → se abre un selector con las facturas ya creadas para ese proveedor en ese presupuesto/booking. Eliges una y la línea queda enlazada. Acción inversa: **"Desagrupar"**.

Al subir una factura nueva desde una línea, se pide (opcional pero recomendado) el **Nº de factura del proveedor** y el **importe total del documento**, para poder validar que la suma de las líneas agrupadas cuadra con el total de la factura. Si no cuadra, aparece un aviso en amarillo: *"La suma de líneas (550,00 €) no coincide con el total de la factura (560,00 €)"*.

## Cambios técnicos

### 1. Base de datos — `budget_items`
Nuevas columnas:
- `supplier_invoice_number text` — Nº de factura del proveedor (texto, normalizado en mayúsculas y trim).
- `supplier_invoice_total numeric` — total bruto del documento (informativo, para conciliar).
- `invoice_group_parent_id uuid references budget_items(id) on delete set null` — si está presente, esta línea está **agrupada** bajo otra. La línea "principal" tiene este campo a NULL y mantiene el `invoice_link` + `supplier_invoice_number`.
- Nuevo valor en el enum `billing_status`: `'agrupada'` (label "Agrupada en factura").
- Índice: `(booking_id_or_budget_id, contact_id, supplier_invoice_number)` para búsquedas rápidas y para ofrecer "facturas existentes de este proveedor".

Migración SQL (resumen):
```sql
ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'agrupada';
ALTER TABLE budget_items
  ADD COLUMN IF NOT EXISTS supplier_invoice_number text,
  ADD COLUMN IF NOT EXISTS supplier_invoice_total numeric,
  ADD COLUMN IF NOT EXISTS invoice_group_parent_id uuid
      REFERENCES budget_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_budget_items_invoice_group
  ON budget_items (budget_id, contact_id, supplier_invoice_number);
```

### 2. Validación (Zod, cliente)
- `supplier_invoice_number`: trim, max 64, regex permisivo `^[A-Za-z0-9 _\-\/\.]+$`.
- `supplier_invoice_total`: número ≥ 0, ≤ 1.000.000.
- Al agrupar: la línea hija debe pertenecer al mismo `budget_id` y mismo `contact_id` que la principal; si no, se rechaza.
- Trigger en BD para evitar cadenas: una línea con `invoice_group_parent_id` no puede a su vez ser padre de otra (anti-recursión).

### 3. UI — `BudgetDetailsDialog.tsx`
- Nuevo estado en el `Select` de "Estado": `Agrupada en factura` (visualmente con un icono link 🔗).
- Nuevo botón en el menú de fila: **"Agrupar en factura existente…"** → abre `LinkInvoiceGroupDialog` con la lista de facturas del mismo proveedor en el presupuesto.
- Nuevo campo "Nº factura proveedor" en el formulario de edición de la partida principal y al subir un adjunto de factura.
- Las filas agrupadas:
  - muestran `↳ Nº factura` en lugar del icono de subida,
  - bloquean los campos `invoice_link` e `IVA/IRPF` (heredan de la principal, mostrados en gris con tooltip),
  - su acción "Marcar pagada" queda deshabilitada con tooltip *"Se paga junto con la factura principal"*.

### 4. Sincronización de estados
- Cambiar el `billing_status` de la línea principal propaga el cambio a todas las hijas (`UPDATE … WHERE invoice_group_parent_id = principal.id`).
- Eliminar la línea principal: las hijas pasan a `pendiente` y pierden la agrupación (gracias al `ON DELETE SET NULL`).

### 5. Pagos (`Finanzas → Pagos`) y conciliación
- En `useTransactions` / vista de Pagos, las líneas con `invoice_group_parent_id` **no se listan como cargo independiente**. Se muestra **una sola entrada por factura** del proveedor con desglose de las líneas agrupadas.
- En `MarkExpensesAsInvoicedDialog` y similares, agrupar por `(contact_id, supplier_invoice_number)` para evitar que aparezcan dos veces.

### 6. Aviso de doble pago (red flag)
En el "Centro de Tareas" / Health Check del presupuesto, nuevo aviso:
> *"Posible factura duplicada: hay 2 partidas del mismo proveedor con el mismo Nº de factura sin estar agrupadas."*

## Resumen para la gestoría

- **Una factura = un Nº de factura del proveedor**, aunque tenga varias líneas en categorías distintas.
- La línea principal almacena el documento, el número y el total.
- Las líneas adicionales quedan marcadas como **"Agrupada en factura {Nº}"** y se pagan en bloque.
- Imposible duplicar el pago: el sistema avisa y no genera dos cargos en Pagos.
