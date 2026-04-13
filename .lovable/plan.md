

## Plan: Auto-rellenar acreditación y sincronizar royalty

### Cambios en `src/components/IPLicenseGenerator.tsx`

**1. Acreditación pre-rellenada**
- Cuando el usuario cambia `colaboradora_nombre_artistico`, auto-rellenar `acreditacion_nombre` con ese valor (si el campo está vacío o coincide con el valor anterior)
- Cuando el usuario cambia `grabacion_caracter`, auto-rellenar `acreditacion_caracter` con ese valor
- Los campos siguen siendo editables si el usuario quiere sobreescribir

**2. Royalty: solo un campo numérico**
- Eliminar el input manual de `royalty_texto`
- Convertir automáticamente el número a texto en español (ej: 22 → "VEINTIDÓS", 15 → "QUINCE")
- Implementar una función `numberToSpanishText()` que cubra del 0 al 100
- Mostrar el texto generado como badge/etiqueta informativa al lado del input numérico, no como campo editable

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx`

