

## Plan: Replicar formato exacto del PDF en la vista pública del borrador

### Problema
La vista pública (`/contract-draft/:token`) muestra el contrato como una lista plana de campos sin formato legal. El PDF generado tiene un formato profesional con secciones REUNIDOS, MANIFIESTAN, CLAUSULAS numeradas, sub-items con letras, texto justificado, tipografía serif, etc.

### Solución
Reescribir completamente la funcion `renderIPLicenseContent` en `ContractDraftView.tsx` para que reproduzca fielmente la estructura del PDF, usando los datos de `form_data` y `clauses_data` (que contienen las clausulas con keys como `objeto_1_1`, `alcance_2_1`, `contraprestacion_3_1`, etc.).

### Cambios en `src/pages/ContractDraftView.tsx`

**1. Contenedor del documento** — Cambiar las clases CSS del wrapper para simular una pagina A4:
- Fondo blanco, sombra, padding amplio (80px laterales, 60px vertical)
- Fuente: `Georgia, 'Times New Roman', serif` a 16px
- Texto justificado, interlineado 1.7
- Max-width ~210mm (aprox 794px) para simular A4

**2. Reescribir `renderIPLicenseContent`** con la estructura exacta del PDF:

```
TITULO (centrado, mayusculas, negrita, 18px)
Lugar y fecha (centrado)

REUNIDOS
  DE UNA PARTE, [productora datos]... la PRODUCTORA.
  DE OTRA PARTE, [colaboradora datos]... la COLABORADORA.
  Parrafo "ambas partes..."
  Parrafo "Las Partes se reconocen..."

MANIFIESTAN
  I) [clausula manifiestan con datos interpolados]
  II) ...
  III) ...
  IV) ...
  Parrafo de transicion "Con la finalidad..."

CLAUSULAS
  1. OBJETO
    clausula objeto_1_1
      a. Titulo...
      b. Calidad...
      c. Duracion...
      d. Videoclip...
      e. Fecha fijacion...
      f. Caracter...
    clausula objeto_1_2

  2. ALCANCE DE LA CESION
    clausula alcance_2_1
      a. PERIODO...
      b. TERRITORIO...
      c. MEDIOS...
    clausula alcance_2_2
    clausula alcance_2_3
      a. Nombre artistico...
      b. Caracter...
    clausula alcance_2_4
    clausula alcance_2_5

  3. CONTRAPRESTACION
    clausulas 3_1 a 3_5

  4. NOTIFICACIONES
    clausula 4_1
      a. De la PRODUCTORA: email
      b. De la COLABORADORA: email

  5. CONFIDENCIALIDAD
    clausulas 5_1, 5_2, 5_2b

  6. LEY APLICABLE
    clausulas 6_1, 6_2

  Parrafo cierre "Y en señal de conformidad..."

  FIRMAS (dos columnas)
```

**3. Estilos CSS inline/Tailwind** para cada nivel:
- Titulos de seccion: `text-center font-bold uppercase mt-8 mb-4`
- Clausulas numeradas: `text-justify mb-3` con interlineado 1.7
- Sub-items (a, b, c): `ml-10 mb-1` (sangria 40px)
- Numeracion romana: `ml-0` con etiqueta en negrita
- Firmas: grid 2 columnas, centrado, linea de 200px

**4. Funcion helper `resolveClause`** — Copiar la logica de interpolacion de variables (`{{royalty_porcentaje}}`, `{{productora_nombre_artistico}}`, etc.) desde `IPLicenseGenerator.tsx` para que las clausulas muestren los valores reales en vez de placeholders.

### Archivos a modificar
- `src/pages/ContractDraftView.tsx` — Reescritura completa de `renderIPLicenseContent` (~250 lineas) y ajuste del contenedor CSS

### Resultado
La vista publica del borrador se vera identica al PDF: documento legal profesional con tipografia serif, texto justificado, secciones numeradas correctamente, sub-items con letras, y firmas al final.

