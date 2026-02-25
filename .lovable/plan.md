

## Contratos minimizables con vista rapida de firmas

### Objetivo
Cada contrato en la lista se muestra como una tarjeta colapsable. Por defecto aparece minimizado mostrando solo el nombre del archivo, el badge de estado y un resumen de firmas (ej: "2/3 firmados"). Al expandir se ve el detalle completo (firmantes, botones de accion, etc.).

### Cambios en `src/components/booking-detail/BookingDocumentsTab.tsx`

**1. Estado de expansion por contrato**
- Agregar estado `expandedContracts: Set<string>` para trackear que contratos estan expandidos.
- Por defecto todos minimizados.

**2. Vista minimizada (siempre visible)**
- Fila compacta con:
  - Icono (check verde si firmado, documento si no)
  - Nombre del archivo
  - Badge de estado (Borrador / Enviado / Firma pendiente / Firmado)
  - Indicador de firmas: badge pequeno "X/Y firmados" (datos del `ContractSignersManager`)
  - Chevron para expandir/colapsar
  - Menu de acciones (tres puntos) siempre accesible

**3. Vista expandida (al hacer clic)**
- Todo el contenido actual: info de firma legacy, botones "Enviar a Firmar" / "Copiar Link", y el `ContractSignersManager` completo.

**4. Resumen de firmantes en la fila minimizada**
- Nuevo componente interno `ContractSignersSummary` que consulta `contract_signers` y muestra un badge compacto con el conteo.
- Reutiliza la misma query que `ContractSignersManager` pero solo muestra el badge, sin la lista completa.

### Estructura visual

```text
Minimizado:
[icon] Contrato Rita Payes - M00DITA.pdf    [2/3 firmados] [Firma pendiente] [...] [v]

Expandido:
[icon] Contrato Rita Payes - M00DITA.pdf    [2/3 firmados] [Firma pendiente] [...] [^]
  25/2/2026 - Generado
  [Enviar a Firmar]  [Copiar Link]
  ---- Firmantes ----
  [lista completa de firmantes con acciones]
```

### Archivo modificado

| Archivo | Cambio |
|---|---|
| `src/components/booking-detail/BookingDocumentsTab.tsx` | Envolver cada contrato en Collapsible, agregar ContractSignersSummary, estado expandedContracts |

