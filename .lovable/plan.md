

## Reformateo del PDF: Clonar formato del contrato CityZen con branding MOODITA

El PDF actual se genera volcando texto plano linea a linea con `jsPDF`. El objetivo es reescribir completamente la funcion `downloadPDF` para que el resultado sea visualmente identico al PDF de referencia (CityZen/MusicBFestival), cambiando solo el branding a MOODITA.

### Cambios en un unico archivo: `src/components/ContractGenerator.tsx`

Se reescribe la funcion `downloadPDF` (lineas 716-792) por completo con las siguientes mejoras:

---

**1. Configuracion de pagina y constantes**
- A4 vertical (210x297mm)
- Margenes: izquierdo 25mm, derecho 20mm, superior 35mm (debajo del header), inferior 25mm
- Fuente: Helvetica, tamano base 10pt para parrafos, 12pt para titulo
- Interlineado: 5.5mm entre lineas de parrafo

**2. Header en todas las paginas**
- Logo MOODITA centrado en la parte superior, con height fija (~12mm) y width proporcional (usando `object-fit: contain` equivalente en jsPDF: calcular ratio del logo)
- Debajo del logo: texto "MOODITA" en mayusculas, centrado, fuente 8pt, color gris oscuro
- Linea separadora fina (0.3pt) debajo del header
- El logo NO se deforma: se calcula el aspect ratio real de la imagen y se ajusta width automaticamente

**3. Primera pagina: Titulo y partes**
- Titulo "CONTRATO CON PROMOTOR PARA LA ACTUACION PUBLICA DE ARTISTA" centrado, bold, 12pt
- Linea de fecha/lugar alineada a la derecha, 10pt normal
- Parrafos de las partes (AGENTE y PROMOTOR) con texto justificado, 10pt
- "PACTAN:" centrado, bold, 10pt, con espacio extra arriba y abajo

**4. Condiciones Particulares como TABLA con bordes**
- Usar `jspdf-autotable` (ya instalado como dependencia) para renderizar una tabla con bordes
- Estructura de la tabla copiando el template:
  - Fila: ARTISTA | valor (ancho completo, 2 columnas)
  - Fila: CIUDAD | valor
  - Fila: AFORO | RECINTO | EVENTO (3 columnas en una fila, o como sub-filas segun el original)
  - Fila: BILLING | valor
  - Fila: OTROS ARTISTAS/DJs | valor
  - Fila: FECHA ANUNCIO | valor
  - Fila: FECHA ACTUACION | valor
  - Fila: DURACION ACTUACION | valor
- Labels en negrita/mayusculas en columna izquierda
- Valores en estilo normal en columna derecha
- Bordes finos, padding interno ~3mm

**5. Seccion HORARIOS**
- Titulo "HORARIOS:" en bold
- Bullets con guion para cada horario (montaje, apertura, inicio, curfew)
- Mismo estilo de sangria que el original

**6. Campos sueltos post-tabla**
- CACHE GARANTIZADO, PRECIO TICKETS, SPONSORS, RIDER TECNICO, etc.
- Cada uno como "LABEL: valor" en bold para el label, normal para el valor
- Para campos booleanos (hoteles, vuelos, etc.): mostrar "Si" o "No" (nunca "true"/"false"/"undefined")

**7. Forma de Pago y Datos Bancarios**
- Titulo "FORMA DE PAGO:" en bold
- Bullets con el mismo sangrado que el template
- Bloque de datos bancarios con sangria:
  - Titular: ...
  - Banco: ...
  - IBAN: ...
- Clausula de contrato firme como parrafo numerado (1. y 2.)

**8. Condiciones Generales**
- Numeracion 1., 1.1., 1.2., etc. con sangria apropiada
- Titulos de seccion en BOLD y MAYUSCULAS
- Subapartados con sangria de 5mm adicional
- Texto de parrafos con apariencia justificada (usando `doc.text(line, x, y, { align: 'justify', maxWidth })`)

**9. Bloque de firmas**
- Tabla de 2 columnas sin bordes superiores:
  - "EL AGENTE" | "EL PROMOTOR"
  - Nombre del agente | Nombre del promotor
  - Nombre empresa agente | Nombre empresa promotor
- Espacio para firma entre el titulo y los nombres

**10. Pie de pagina / Paginacion**
- Solo numero de pagina en esquina inferior derecha (sin texto "MOODITA")
- Fuente 8pt, color gris
- Sin watermarks ni elementos extra

**11. Proteccion contra "undefined"**
- Funcion helper `safe(value, fallback = '')` que retorna el fallback si el valor es undefined, null o el string "undefined"
- Aplicar a TODOS los campos antes de renderizar en el PDF
- Para campos vacios: dejar en blanco o "TBC" segun contexto

### Detalles tecnicos de implementacion

La funcion `downloadPDF` se dividira en subfunciones internas:
- `addHeader(doc, pageNum)` - Logo + "MOODITA" + linea separadora
- `addPageNumber(doc, pageNum)` - Numero en esquina inferior derecha
- `checkPageBreak(doc, y, needed)` - Verifica si hay espacio, si no, nueva pagina con header
- `addParagraph(doc, text, x, y, options)` - Renderiza parrafo con split y justificado
- `addSectionTitle(doc, title, y)` - Titulo de seccion en bold/mayusculas
- `addConditionsTable(doc, conditions, y)` - Tabla de condiciones particulares con autoTable
- `addSignatureBlock(doc, agent, promoter, y)` - Bloque de firmas

Se usa `jspdf-autotable` (ya en dependencias) para la tabla de condiciones particulares con bordes, estilo y padding identicos al template.

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/ContractGenerator.tsx` | Reescritura completa de `downloadPDF` (~716-792) con formato profesional clonado del template |

No se modifica `contractTemplates.ts` ya que el contenido/wording no cambia; solo cambia como se renderiza en PDF.

