

## Plan: Panel lateral de contacto solo lectura + click-to-copy + pulso en "Configuración"

### Objetivo
El panel lateral de contacto (el que muestra "Joan Palà Granado" con email, teléfono, etc.) debe ser **solo lectura**. Toda edición se hace desde el modal "Configuración".

### Comportamiento

| Acción del usuario | Resultado |
|---|---|
| Click en campo con valor (ej: email, teléfono, nombre) | Copia el valor al portapapeles + toast "Copiado" |
| Click en campo vacío ("Añadir teléfono...") | El botón "Configuración" hace pulso (animación ~2s) invitando a editar desde ahí |
| Hover sobre campo con valor | Cursor `copy`, fondo sutil |
| Hover sobre campo vacío | Cursor `pointer` |

### Cambios

**1. Identificar el componente del panel lateral**
- Localizar el componente que renderiza esta vista lateral del contacto (probablemente `ContactSidePanel.tsx`, `ContactQuickView.tsx` o similar dentro de `src/components/contacts/` o `src/components/agenda/`). Buscaré por el texto "Información de contacto" o "Añadir teléfono".

**2. Reemplazar inputs editables por celdas de solo lectura**
- Sustituir cada `<Input>` por un `<div>` clickable.
- Nombre, nombre artístico y rol del header → también solo lectura, click-to-copy si tienen valor.
- Eliminar cualquier `onChange` / handler de guardado del panel.

**3. Hook click-to-copy**
- Función `handleCopy(value, label)`: usa `navigator.clipboard.writeText(value)` + `toast.success('${label} copiado')`.

**4. Pulso del botón "Configuración"**
- Estado local `pulseConfig: boolean`.
- Al click en campo vacío → `setPulseConfig(true)`, después de ~2s vuelve a false.
- Aplicar clase `animate-pulse ring-2 ring-primary` al botón cuando `pulseConfig` es true.

### Archivo previsto
- `src/components/contacts/ContactSidePanel.tsx` (o el nombre real que encuentre).

### Resultado
- Imposible editar accidentalmente desde el panel lateral.
- UX clara: valores existentes → copiar; valores vacíos → "ve a Configuración" señalado visualmente.
- Toda la edición real ya queda canalizada por el botón "Configuración" (que abre `EditContactDialog`).

