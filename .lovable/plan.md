

## Plan: Selector de tipo de contrato + Generador de Licencia de Propiedad Intelectual

### Resumen
Reemplazar el botón directo "Generar Contrato" por un selector con múltiples opciones. Crear un nuevo generador de "Licencia de Cesión de Derechos de Propiedad Intelectual" que produzca un PDF exacto al documento de referencia, con campos dinámicos rellenados por un wizard.

### Campos dinámicos identificados (marcados en verde)
- Fecha (día, mes, año)
- PRODUCTORA: nombre, DNI/NIE/Pasaporte, domicilio
- COLABORADOR/A: nombre, DNI/NIE/Pasaporte, domicilio
- Título del sencillo (Álbum)
- Nombre artístico de la PRODUCTORA
- Nombre artístico de la COLABORADORA
- Detalles de la Grabación (título, calidad, duración, videoclip sí/no, fecha fijación, carácter intervención)
- Nombre artístico para acreditación
- Carácter de la intervención para acreditación
- Calidad (músico intérprete / músico ejecutante)
- Royalty de artista (porcentaje, texto)
- Emails de notificación (PRODUCTORA, COLABORADORA)
- Nombres para firma

### Cambios

**1. Nuevo componente: `src/components/ContractTypeSelector.tsx`**
- Dialog que aparece al pulsar "Generar Contrato"
- Muestra tarjetas seleccionables: "Contrato de Booking" y "Licencia de Propiedad Intelectual"
- Al elegir uno, cierra el selector y abre el generador correspondiente

**2. Nuevo componente: `src/components/IPLicenseGenerator.tsx`**
- Wizard de 4 pasos: Productora, Colaborador/a, Grabación/Royalties, Vista Previa
- Genera PDF con jsPDF replicando exactamente el formato del documento: texto justificado, tipografía serif (~12pt), negritas en "DE UNA PARTE", "DE OTRA PARTE", títulos de cláusulas, etc.
- 8 páginas con la estructura exacta del documento de referencia
- Los campos verdes se rellenan dinámicamente; el resto es texto fijo

**3. Modificar: `src/pages/Documents.tsx`**
- El botón "Generar Contrato" ahora abre `ContractTypeSelector` en lugar de `ContractGenerator` directamente

**4. Modificar: `src/components/booking-detail/BookingDocumentsTab.tsx`**
- Mismo cambio: el botón abre `ContractTypeSelector`
- Si se elige "Contrato de Booking", abre el `ContractGenerator` existente con los datos del booking pre-poblados

**5. Modificar: `src/pages/release-sections/ReleaseContratos.tsx`**
- Añadir botón "Generar Contrato" junto al de "Subir documento"
- Conectar con `ContractTypeSelector` -> generadores
- Callback `onSave` para guardar el PDF generado en `release_documents`

### Formato del PDF
- Tipografía: Times (serif), 12pt cuerpo, títulos en negrita centrados
- Márgenes: ~25mm laterales, ~20mm superior/inferior
- Texto justificado
- Numeración jerárquica (1., 1.1., 1.1.a., 1.1.b.)
- Indentación progresiva para sub-cláusulas
- Tabla de firmas al final con líneas de firma

### Archivos afectados
- `src/components/ContractTypeSelector.tsx` (nuevo)
- `src/components/IPLicenseGenerator.tsx` (nuevo)
- `src/pages/Documents.tsx` (modificar)
- `src/components/booking-detail/BookingDocumentsTab.tsx` (modificar)
- `src/pages/release-sections/ReleaseContratos.tsx` (modificar)

