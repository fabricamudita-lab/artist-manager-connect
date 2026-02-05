
# Plan: Corregir el scroll del panel lateral ContactProfileSheet

## Problema Identificado

El panel lateral (`ContactProfileSheet`) no permite hacer scroll para ver toda la información del perfil (Banco "Caixa Bank", Alergias "Plátano", Horarios preferidos "09:00-22:00").

| Campo | Valor en BD | ¿Visible en panel? |
|-------|-------------|-------------------|
| bank_info | "Caixa Bank" | NO (requiere scroll) |
| allergies | "Plátano" | NO (requiere scroll) |
| preferred_hours | "09:00-22:00" | NO (requiere scroll) |

## Causa Raíz

El componente `ScrollArea` de este proyecto tiene un wrapper `div` adicional (línea 106 de scroll-area.tsx) que **no hereda la altura del contenedor**:

```text
┌─────────────────────────────────────┐
│ div className="flex-1 min-h-0       │ <- Tiene altura correcta
│       overflow-hidden"              │
│ ┌─────────────────────────────────┐ │
│ │ <div> (wrapper interno del      │ │ <- SIN altura = PROBLEMA
│ │       ScrollArea)               │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ ScrollAreaPrimitive.Root    │ │ │
│ │ │ h-full px-6                 │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

El `h-full` del ScrollArea se aplica al `Root`, pero el `div` wrapper no tiene altura definida, así que no hay limitación de altura y el scroll nunca se activa.

## Solución

Modificar el `ContactProfileSheet` para que el `ScrollArea` tenga una altura calculada explícita, no dependiente de `h-full`:

```tsx
// ANTES:
<div className="flex-1 min-h-0 overflow-hidden">
  <ScrollArea className="h-full px-6">

// DESPUÉS:
<ScrollArea className="flex-1 min-h-0 px-6">
```

Pero dado que el wrapper interno del `ScrollArea` no tiene altura, necesitamos una alternativa más robusta: usar un `div` con overflow nativo en lugar del componente `ScrollArea`:

```tsx
// SOLUCIÓN ALTERNATIVA MÁS ROBUSTA:
<div className="flex-1 min-h-0 overflow-y-auto px-6">
  <div className="space-y-6 pb-6">
    {/* Contenido del perfil */}
  </div>
</div>
```

Esto evita el problema del wrapper interno del `ScrollArea` y proporciona scroll nativo que funciona correctamente con flexbox.

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ContactProfileSheet.tsx` | Reemplazar `ScrollArea` por un `div` con `overflow-y-auto` |

## Cambio Específico

Líneas ~230-232 actuales:
```tsx
<div className="flex-1 min-h-0 overflow-hidden">
  <ScrollArea className="h-full px-6">
  <div className="space-y-6 pb-6">
```

Cambiar a:
```tsx
<div className="flex-1 min-h-0 overflow-y-auto px-6">
  <div className="space-y-6 pb-6">
```

Y eliminar el cierre correspondiente del `ScrollArea` (línea ~578-579).

## Resultado Esperado

El usuario podrá hacer scroll y ver todas las secciones del perfil:
- Información de contacto
- Información personal (incluyendo Horarios preferidos)
- Información adicional (incluyendo Alergias)
- Información bancaria (incluyendo Banco)
- Contrato
- Visibilidad
- Notas
- Fechas de registro
