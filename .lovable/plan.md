

## Plan: Añadir paso de Cláusulas editables al generador de Licencias IP

### Problema actual
El texto de las cláusulas está hardcodeado en la función `generatePDF`. No hay forma de editarlo desde la UI. Además, el texto del PDF no aparece visualmente justificado porque jsPDF tiene una limitación conocida: `align: 'justify'` solo funciona correctamente con `splitTextToSize` cuando se pasa el texto completo como array, no línea a línea.

### Solución

**1. Definir las cláusulas como estado editable (mismo patrón que ContractGenerator)**

Crear una interfaz `IPLegalClauses` con una key por cada bloque de texto, y un array `IP_CLAUSE_SECTIONS` con las secciones colapsables:

| Sección | Cláusulas editables |
|---------|-------------------|
| 1. Objeto | 1.1 Cesión de derechos, 1.2 Cesión de imagen |
| 2. Alcance | 2.1 Amplitud, 2.2 Derechos específicos, 2.3 Acreditación, 2.4 Entidades de gestión, 2.5 Explotación |
| 3. Contraprestación | 3.1 Royalty, 3.2 Prorrata, 3.3 Responsabilidad pago, 3.4 Frecuencia, 3.5 Liquidación |
| 4. Notificaciones | 4.1 Medios de comunicación |
| 5. Confidencialidad | 5.1 Información confidencial, 5.2 Protección de datos |
| 6. Ley aplicable | 6.1 Ordenamiento, 6.2 Resolución conflictos |

**2. Añadir nuevo paso al wizard**

Cambiar `STEPS` de 4 a 5 pasos: `['Productora', 'Colaborador/a', 'Grabación y Derechos', 'Cláusulas', 'Vista Previa']`

El paso "Cláusulas" renderiza collapsibles con textareas idéntico al `renderLegalStep()` del ContractGenerator, incluyendo botón "Restaurar Cláusulas Predeterminadas".

**3. Pasar las cláusulas al PDF**

Modificar `generatePDF` para aceptar un objeto `IPLegalClauses` y usar esos textos en lugar de los strings hardcodeados. Los placeholders dinámicos (`${s(d.grabacion_titulo)}`, royalty, emails, etc.) se inyectan antes de pasar al PDF usando `.replace()`.

**4. Fix de justificación**

Cambiar `renderLines` para pasar el array completo de líneas a `pdf.text()` en vez de línea a línea. jsPDF justifica correctamente cuando recibe un array con `maxWidth`:

```typescript
const renderLines = (text: string, xLeft: number, maxW: number) => {
  pdf.setFontSize(fontSize);
  const lines = pdf.splitTextToSize(text, maxW);
  for (const line of lines) {
    checkPage();
    pdf.text(line, xLeft, y, { maxWidth: maxW, align: 'justify' });
    y += interline;
  }
};
```

El problema real es que `splitTextToSize` ya corta las líneas, y luego `pdf.text` con `maxWidth` intenta re-cortar una línea ya cortada. La solución: pasar el texto completo (sin pre-split) y dejar que `pdf.text` con `maxWidth` y `align: 'justify'` haga tanto el split como la justificación internamente, calculando el avance de `y` después.

### Archivo afectado
- `src/components/IPLicenseGenerator.tsx`

### Cambios concretos

1. **Líneas 39-83**: Añadir interfaz `IPLegalClauses`, constante `DEFAULT_IP_CLAUSES`, y array `IP_CLAUSE_SECTIONS`
2. **Línea 70**: Cambiar `STEPS` a 5 pasos
3. **Línea 89**: Añadir parámetro `clauses: IPLegalClauses` a `generatePDF`
4. **Líneas 124-133**: Reescribir `renderLines` para usar `pdf.text(text, x, y, { maxWidth, align: 'justify' })` sin pre-split, y calcular las líneas resultantes para avanzar `y`
5. **Líneas 325-429**: Reemplazar strings hardcodeados de cláusulas por `clauses.objeto_1_1`, `clauses.alcance_2_1`, etc.
6. **Líneas 458-460**: Añadir estado `const [ipClauses, setIpClauses] = useState(DEFAULT_IP_CLAUSES)`
7. **Línea 498**: Pasar `ipClauses` a `generatePDF`
8. **Líneas 696-710**: Añadir `case 3:` con el renderizado de cláusulas (collapsibles + textareas) y mover Vista Previa a `case 4:`

