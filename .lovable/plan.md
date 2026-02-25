

## Descargar Label Copy en PDF desde la pestana de Creditos y Autoria

### Que es un Label Copy

Un Label Copy es el documento oficial que acompana a un lanzamiento musical con toda la informacion de creditos, derechos y letras de cada cancion. Incluye: titulo del release, artista, sello, UPC, y por cada cancion: titulo, ISRC, creditos agrupados por rol, porcentajes de autoria/master, y la letra completa.

---

### Cambios

**1. Nuevo archivo `src/utils/exportLabelCopyPDF.ts`**

Funcion `exportLabelCopyPDF` que genera un PDF vertical (portrait) con:

- **Cabecera**: Titulo del release, artista, sello, UPC, fecha de lanzamiento, tipo (Single/EP/Album), fecha de exportacion
- **Por cada cancion** (ordenadas por track_number):
  - Numero y titulo de la cancion
  - ISRC (si existe)
  - Creditos agrupados por categoria (Compositor, Autoria, Produccion, Interprete, Contribuidor) usando `CREDIT_CATEGORIES` de `creditRoles.ts`
  - Porcentajes de autoria y master si estan registrados
  - Letra completa (con formato preservado)
  - Separador visual entre canciones

Usa `jsPDF` (ya instalado) sin autoTable, con texto formateado manualmente para un aspecto limpio tipo documento legal/profesional.

**2. Modificacion de `src/pages/release-sections/ReleaseCreditos.tsx`**

- Agregar boton "Descargar Label Copy" (icono `FileDown`) junto al boton "Nueva Cancion" en el header
- El boton necesita los creditos de TODAS las canciones, asi que se hara un fetch directo de `track_credits` filtrado por los IDs de los tracks del release
- Al hacer clic, se llama a `exportLabelCopyPDF` pasando release, tracks y creditos

---

### Detalle tecnico

**Estructura del PDF generado:**

```text
LABEL COPY
──────────────────────────────
Titulo: Con una mano delante y otra detras
Artista: Leyre
Sello: [sello]
UPC: [upc]
Tipo: Single
Fecha: 14 de marzo 2026

──────────────────────────────
1. Titulo de la cancion
   ISRC: ES-XXX-00-00001

   CREDITOS:
   Compositor: Nombre (50% Autoria)
   Letrista: Nombre (50% Autoria)
   Productor: Nombre (100% Master)
   Voz Principal: Nombre
   Guitarra: Nombre

   LETRA:
   [texto completo de la letra]

──────────────────────────────
2. Siguiente cancion...
```

**Datos necesarios para el boton:**
- `release` (ya disponible en el componente)
- `tracks` (ya disponible)
- Creditos de todos los tracks: se hara una query `supabase.from('track_credits').select('*').in('track_id', trackIds)` al momento de exportar

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/utils/exportLabelCopyPDF.ts` | Nuevo archivo con la funcion de generacion del PDF |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Agregar boton "Descargar Label Copy" y logica de fetch + export |

