
# Mejorar etiquetas del segundo toggle

## Situación actual

El segundo toggle (cuando el elemento existe) siempre muestra el mismo texto: **"Lo ejecutamos"**, sin importar si está activado o desactivado.

El usuario quiere:
- **OFF** → mostrar **"Derivado"** (el servicio existe pero lo coordina un tercero, no lo ejecutamos nosotros)
- **ON** → mostrar algo más profesional que "Lo ejecutamos", como **"Producción propia"** o **"Gestionado internamente"**

## Propuesta de etiquetas

| Estado | Texto actual | Texto propuesto |
|---|---|---|
| OFF | "Lo ejecutamos" | "Derivado" |
| ON | "Lo ejecutamos" | "Producción propia" |

La palabra **"Derivado"** transmite que el servicio existe pero viene de fuera (externa/coordinada). **"Producción propia"** es un término estándar en la industria que significa que el equipo lo ejecuta directamente.

## Cambio técnico

Solo hay que modificar el `ToggleRow` helper en `CreateReleaseBudgetDialog.tsx`, concretamente el `<span>` que muestra el texto del segundo toggle:

```tsx
// Antes:
<span className={cn("text-xs font-medium whitespace-nowrap", contracted ? "text-primary" : "text-muted-foreground")}>
  Lo ejecutamos
</span>

// Después:
<span className={cn("text-xs font-medium whitespace-nowrap", contracted ? "text-primary" : "text-muted-foreground")}>
  {contracted ? "Producción propia" : "Derivado"}
</span>
```

## Archivo a modificar

Solo **`src/components/releases/CreateReleaseBudgetDialog.tsx`**, línea ~674 dentro del `ToggleRow` helper. Cambio de una sola línea.
