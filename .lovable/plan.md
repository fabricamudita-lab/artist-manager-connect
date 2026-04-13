

## Plan: Corregir formato del PDF según instrucciones detalladas

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx` — función `generatePDF`

### Cambios necesarios

**1. Justificación completa (justified) en todo el documento**
- `renderLines`: ya usa `align: 'justify'` — OK
- `addHangingParagraph` (línea 148): la primera línea junto al label no tiene justify. Añadir justify a las continuaciones y primera línea donde sea posible.
- `addParagraph` / `addNumberedHanging`: revisar que todas las llamadas a `pdf.text()` con líneas largas usen `align: 'justify'`.

**2. Sangría francesa en "DE UNA PARTE" / "DE OTRA PARTE"**
- Actualmente `addHangingParagraph` pone las líneas de continuación en `ml` (30mm = 85pts). Las instrucciones dicen que deben ir en `ml + indent1` (36.3mm = 103pts).
- Modificar `addHangingParagraph` para que las líneas 2+ usen `ml + indent1` con ancho `cw - indent1`.

**3. Sangría francesa en puntos I), II), III), IV)**
- `addNumberedHanging` ya pone el número en `ml + indent1` y texto en `ml + indent2`. Las continuaciones van a `xText` (ml + indent2) — esto parece correcto. Verificar que el primer texto al lado del número también empiece correctamente.

**4. Negritas parciales en sub-ítems (ya implementado)**
- El `addSubItem` actual ya hace "a. " normal + título bold + valor normal — OK.

**5. Espaciado vertical — verificar consistencia**
- Los espacios ya usan las constantes correctas. No se requieren cambios mayores.

### Resumen de edits

| Línea(s) | Cambio |
|----------|--------|
| 136-157 | `addHangingParagraph`: continuaciones a `ml + indent1` en vez de `ml`; justify en todas las líneas |
| 125-133 | `renderLines`: asegurar justify consistente |
| 160-190 | `addNumberedHanging`: asegurar justify en continuaciones |
| Múltiples | Revisar que no haya llamadas a `pdf.text()` sin justify donde debería haberlo |

