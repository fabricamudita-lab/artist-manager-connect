

## Plan: Reestructurar el PDF de Splits siguiendo el modelo del usuario

### Cambios en la estructura del documento

Basándome en el PDF que has subido, el documento actual necesita estos ajustes de contenido y orden:

**1. Título y secciones**
- Título: "HOJA DE REPARTO DE DERECHOS (SPLIT SHEET)"
- Sección header: "INFORMACIÓN DEL PROYECTO"
- Campos renombrados: "Título del EP/Álbum/Single", "Artista Principal", "Sello Discográfico"
- Antes de las pistas: subtítulo "DETALLE POR PISTA"

**2. Tablas de splits**
- Subtítulos completos: "AUTORÍA / PUBLISHING (Derechos de Obra)" y "MASTER / ROYALTIES (Derechos de Fonograma)"
- Columna de publishing: "% Recaudable" en vez de solo "%"
- Roles agrupados por persona con " / " (ej: "Compositora / Arreglista") — ya funciona así con `groupByPerson`

**3. Nueva sección final: "DATOS DE CONTACTO Y REGISTRO"**
- Tabla con todos los participantes únicos del release
- Columnas: Participante, IPI/CAE, Correo Electrónico, Firma
- Valores "[A completar]" para IPI y email (datos no disponibles en el sistema actualmente)
- Indicar "N/A (Solo Master)" en IPI para personas que solo tienen % master

**4. Pie de documento**
- Texto legal: "Este documento certifica la voluntad de las partes para el registro y reparto de beneficios derivados de la explotación de las obras y fonogramas aquí listados."

**5. Diseño**: Mantener el estilo actual (helvetica, líneas finas grises, sin bordes negros de tabla)

### Archivo a modificar
- `src/utils/exportSplitsPDF.ts`

