
# Sidebar colapsable + Selector de cuentas de correo

## Cambios

### 1. Sidebar colapsable (abrir/cerrar)

Agregar un boton de toggle en la parte superior del sidebar que permite colapsar la barra lateral a un ancho minimo (solo iconos, ~48px) o expandirla completamente (w-56). El estado se controla desde `Correo.tsx` y se pasa como prop al sidebar.

- **Estado colapsado**: Solo se ven los iconos de carpetas, el boton de redactar se convierte en un boton con solo el icono "+", y las cuentas se ocultan.
- **Estado expandido**: Se ve todo como ahora (iconos + texto + badges + cuentas).
- Transicion animada con `transition-all duration-200`.
- Boton de toggle con icono `PanelLeftClose` / `PanelLeftOpen` en la esquina superior.

### 2. Selector de cuenta activa

Agregar la capacidad de filtrar los correos por cuenta seleccionada:

- En la seccion "Cuentas" del sidebar, cada cuenta sera un boton clicable. La cuenta activa tendra un estilo destacado (borde o fondo).
- Agregar opcion "Todas las cuentas" como primera opcion.
- Al seleccionar una cuenta, los correos se filtran por el campo `to_addresses` (en inbox) o `from_address` (en sent).
- Agregar campo `account_id` a `MockEmailMessage` para asociar cada correo a una cuenta especifica.

### Archivos a modificar

**`src/lib/emailMockData.ts`**:
- Agregar campo `account_id` a `MockEmailMessage`
- Asignar `account_id` a cada email mock (ej: correos a booking@moodita.es -> account "1", correos a management@moodita.es -> account "2")

**`src/components/email/EmailSidebar.tsx`**:
- Recibir props `collapsed` (boolean) y `onToggleCollapse` (callback)
- Recibir props `activeAccountId` (string | null) y `onAccountChange` (callback)
- Renderizar version compacta (solo iconos) cuando `collapsed=true`
- Hacer las cuentas clicables con estilo activo
- Agregar boton de toggle collapse con icono PanelLeftClose/PanelLeftOpen

**`src/pages/Correo.tsx`**:
- Agregar estado `sidebarCollapsed` (boolean, default false)
- Agregar estado `activeAccountId` (string | null, default null = todas)
- Filtrar `filteredEmails` tambien por `account_id` cuando hay cuenta seleccionada
- Pasar nuevas props al EmailSidebar

### Detalles tecnicos

- El sidebar usara `w-56` expandido y `w-12` colapsado, con `transition-all duration-200` para la animacion
- En modo colapsado, el boton "Redactar" sera un icono circular con "+" centrado
- Los badges de unread siguen visibles en modo colapsado como un punto pequeno sobre el icono
- Se usa `overflow-hidden` y `whitespace-nowrap` para que el texto no se desborde durante la transicion
- Tooltip en los iconos cuando esta colapsado para mantener accesibilidad
