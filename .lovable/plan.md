

## Plan: Selector de tipo de contrato + Generador de contrato IP (Cesión de Derechos)

### Problema
Al pulsar "Generar Contrato" (en Documentos o en ReleaseContratos), se abre directamente el generador de contratos de Booking. No hay opción de elegir tipo de contrato ni existe un generador para contratos de propiedad intelectual/cesión de derechos.

### Cambios

**1. Pantalla de selección de tipo de contrato (nuevo componente)**

`src/components/ContractTypeSelector.tsx` -- Dialog intermedio que aparece al pulsar "Generar Contrato". Muestra tarjetas:
- **Contrato de Booking** (icono Calendar): Abre el `ContractGenerator` existente
- **Cesión de Derechos / IP** (icono FileSignature): Abre el nuevo `IPContractGenerator`

Se usara desde `Documents.tsx`, `BookingDocumentsTab.tsx` y `ReleaseContratos.tsx`.

**2. Generador de contrato IP (nuevo componente)**

`src/components/IPContractGenerator.tsx` -- Wizard similar al de Booking pero con los pasos adaptados al documento DOCX proporcionado:

**Pasos del wizard:**
1. **Label** -- Datos del sello: nombre, CIF, direccion, representante legal
2. **Featured Artist** -- Nombre, DNI/NIE/Pasaporte, direccion, nombre artistico
3. **Master/Tracks** -- Titulo del album, nombre del artista principal, datos del track (titulo, contribucion, duracion, video si/no, fecha grabacion, credit designation)
4. **Derechos y Compensacion** -- Duracion (perpetuo/temporal), territorio, porcentaje royalty, frecuencia de pago
5. **Creditos y Contacto** -- Nombre profesional, credit designation, email label, email artista
6. **Vista Previa y PDF** -- Preview del documento completo + descarga PDF

**Campos editables** (detectados del DOCX con marcas verdes):
- Fecha de ejecucion (dia, mes, ano)
- Datos del Label (nombre, CIF, direccion, representante)
- Datos del Featured Artist (nombre, DNI, direccion, nombre artistico)
- Titulo del album
- Nombre del artista principal del album
- Track: titulo, contribucion, duracion, video (si/no), fecha grabacion, credit designation
- Termino (perpetuo/otro), territorio, medios
- Nombre profesional para creditos, credit designation
- Porcentaje de royalty (default 20%)
- Emails de contacto (label + artista)

**3. Plantilla PDF del contrato IP**

`src/lib/ipContractTemplate.ts` -- Funcion `generateIPContractPDF()` usando jsPDF, replicando exactamente la tipografia y estructura del DOCX:
- Titulo centrado en bold: "MASTER RECORDING COLLABORATION AGREEMENT"
- Secciones: PARTIES, RECITALS (I-IV), TERMS AND CONDITIONS (1-6)
- Texto justificado, misma fuente/tamano que el generador de booking
- Los campos rellenables se insertan en el flujo del texto
- Firma al final: "For the LABEL" / "FEATURED ARTIST"

**4. Integracion en ReleaseContratos**

Anadir boton "Generar Contrato" junto al boton "Subir documento" en el header de `ReleaseContratos.tsx`. Al pulsarlo, abre el `ContractTypeSelector`.

**5. Integracion en Documents.tsx y BookingDocumentsTab.tsx**

Reemplazar la apertura directa de `ContractGenerator` por `ContractTypeSelector`, que luego delega al generador correcto.

### Archivos

| Archivo | Accion |
|---------|--------|
| `src/components/ContractTypeSelector.tsx` | Nuevo -- dialog selector de tipo |
| `src/components/IPContractGenerator.tsx` | Nuevo -- wizard + formulario IP |
| `src/lib/ipContractTemplate.ts` | Nuevo -- generacion PDF del contrato IP |
| `src/pages/release-sections/ReleaseContratos.tsx` | Anadir boton "Generar Contrato" |
| `src/pages/Documents.tsx` | Usar ContractTypeSelector en lugar de abrir ContractGenerator directamente |
| `src/components/booking-detail/BookingDocumentsTab.tsx` | Idem |

### Nota sobre fidelidad al documento
El PDF generado replicara la estructura exacta del DOCX: titulos centrados en bold, parrafos numerados (1.1, 1.2...), sub-items con letras (a, b, c...), texto justificado, mismos margenes. Las clausulas 1-6 son texto fijo con los campos rellenables insertados inline.

