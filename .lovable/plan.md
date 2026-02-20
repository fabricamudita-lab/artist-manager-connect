
# Mejora del Drive: Primera impresión y usabilidad (Carpetas)

## Diagnóstico del problema

La función `renderCategoryFolders()` en `src/pages/Carpetas.tsx` (líneas 381–432) muestra las 12 categorías en un grid uniforme, todas con "0 archivos". Los problemas concretos son:

1. **Orden fijo**: Categorías vacías y con contenido se mezclan sin jerarquía visual.
2. **Sin FAB de subida rápida**: Para subir hay que entrar en una categoría y luego hacer clic en "Subir".
3. **Nombres ambiguos**: "ECONOMÍA", "PERSONAL", "MÚSICA" no son autoexplicativos.
4. **Sin archivos recientes**: El usuario no sabe qué se tocó la última vez.
5. **Sin contexto de contenido esperado**: El usuario no sabe qué subir en cada categoría.

## Cambios propuestos — solo `src/pages/Carpetas.tsx` y `src/hooks/useArtistFiles.ts`

### Cambio 1: Renombrar categorías ambiguas (`useArtistFiles.ts`)

Actualizar `ARTIST_FOLDER_CATEGORIES` con nombres descriptivos e industria-correctos:

| Antes | Después | Razón |
|---|---|---|
| ECONOMÍA | PRESUPUESTOS Y FACTURAS | Término del sector |
| PERSONAL | DOCUMENTOS DEL ARTISTA | Autoexplicativo |
| MÚSICA | AUDIO (stems, masters) | Distingue del concepto genérico |
| DISTRIBUCIÓN | DISTRIBUCIÓN DIGITAL | Claridad |

Se añade también un campo `description` a cada categoría para el subtítulo de ayuda:

```ts
{ id: 'audiovisuales',  name: 'AUDIOVISUALES',            description: 'Vídeos, clips, making-of' }
{ id: 'conciertos',     name: 'CONCIERTOS',                description: 'Riders, hojas de ruta' }
{ id: 'contratos',      name: 'CONTRATOS / LEGAL',         description: 'PDFs firmados, acuerdos' }
{ id: 'diseno',         name: 'DISEÑO',                    description: 'Artes, logos, flyers' }
{ id: 'distribucion',   name: 'DISTRIBUCIÓN DIGITAL',      description: 'Pitches, UPC/ISRC, reportes' }
{ id: 'economia',       name: 'PRESUPUESTOS Y FACTURAS',   description: 'Liquidaciones, facturas' }
{ id: 'imagenes',       name: 'IMÁGENES',                  description: 'Fotos prensa, EPK' }
{ id: 'marketing',      name: 'MARKETING',                 description: 'Campañas, contenido RRSS' }
{ id: 'merch',          name: 'MERCH',                     description: 'Catálogos, proveedores' }
{ id: 'musica',         name: 'AUDIO (stems, masters)',    description: 'Archivos de audio, mixes' }
{ id: 'personal',       name: 'DOCUMENTOS DEL ARTISTA',   description: 'NIF, pasaporte, documentos' }
{ id: 'prensa',         name: 'PRENSA',                    description: 'Dossiers, notas de prensa' }
```

### Cambio 2: Ordenar categorías por contenido primero (`renderCategoryFolders`)

Antes de renderizar el grid, se ordenan las categorías: primero las que tienen archivos (`fileCounts[cat.id] > 0`), luego las vacías. Las vacías se muestran con un estilo visualmente más tenue para reducir la sensación de "todo roto".

```ts
const sortedCategories = [...ARTIST_FOLDER_CATEGORIES].sort((a, b) => {
  const countA = fileCounts[a.id] || 0;
  const countB = fileCounts[b.id] || 0;
  return countB - countA; // con contenido primero
});
```

Las categorías vacías llevarán `opacity-60` y un borde `border-dashed` para distinguirlas sin ocultarlas.

### Cambio 3: Sección "Archivos Recientes" antes del grid

Se añade una query `useQuery` en `Carpetas.tsx` para obtener los últimos 5 archivos del artista seleccionado (de `artist_files`, ordenados por `created_at DESC`, limit 5).

La sección se muestra **solo si hay al menos un archivo**, así no aparece vacía:

```tsx
{recentFiles.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Archivos Recientes
      </h3>
    </div>
    <Card>
      <CardContent className="p-0 divide-y">
        {recentFiles.map(file => (
          <div className="flex items-center gap-3 p-3 hover:bg-muted/50">
            <FileIcon /> 
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[file.category]} · {format(date, 'd MMM')}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={open}>Abrir</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
)}
```

### Cambio 4: Card de categoría con subtítulo descriptivo

En lugar de solo "0 archivos", cada card mostrará un subtítulo con el tipo de contenido esperado:

```text
┌─────────────────────────────────┐
│  📄  CONTRATOS / LEGAL          │
│      PDFs firmados, acuerdos    │ ← nuevo subtítulo contextual
│      3 archivos                 │ ← existente
└─────────────────────────────────┘
```

El campo `description` añadido al Cambio 1 alimenta este subtítulo.

### Cambio 5: FAB (Floating Action Button) de subida rápida

Se añade un botón flotante verde en la esquina inferior derecha de la vista `renderCategoryFolders`. Al hacer clic, abre un pequeño popover/dialog que pregunta la categoría antes de subir:

```tsx
{/* FAB — solo visible en el nivel de categorías */}
<div className="fixed bottom-8 right-8 z-50">
  <Button
    size="lg"
    className="rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white h-14 w-14"
    onClick={() => setShowFABDialog(true)}
  >
    <Plus className="w-6 h-6" />
  </Button>
</div>

{/* FAB Dialog */}
<Dialog open={showFABDialog} onOpenChange={setShowFABDialog}>
  <DialogContent>
    <DialogTitle>Subir archivo</DialogTitle>
    <p>¿A qué categoría pertenece este archivo?</p>
    <Select value={fabCategory} onValueChange={setFabCategory}>
      {ARTIST_FOLDER_CATEGORIES.map(cat => (
        <SelectItem value={cat.id}>{cat.name}</SelectItem>
      ))}
    </Select>
    <Button onClick={handleFABUpload}>Seleccionar archivo</Button>
    <input type="file" hidden ref={fabFileRef} onChange={handleFABFileSelect} />
  </DialogContent>
</Dialog>
```

## Resultado visual esperado

```text
┌──────────────────────────────────────────────────────────────────┐
│  Artista / Categorías de Archivos                                │
│                                                                  │
│  🕐 ARCHIVOS RECIENTES                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📄 contrato_festival_X.pdf  Contratos/Legal · 12 feb   Abrir│  │
│  │ 🎵 stem_guitarra.wav        Audio (stems) · 10 feb      Abrir│  │
│  │ 🖼️ foto_prensa_2025.jpg     Imágenes · 8 feb            Abrir│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ 📄          │ │ 🎵          │ │ 🖼️          │               │
│  │ CONTRATOS   │ │ AUDIO       │ │ IMÁGENES    │               │
│  │ Legal/PDFs  │ │ stems,mast. │ │ Fotos EPK   │               │
│  │ 3 archivos  │ │ 2 archivos  │ │ 5 archivos  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                  │
│  ← (vacías, con opacity-60 y borde discontinuo) →               │
│  ┌ - - - - - - ┐ ┌ - - - - - - ┐ ┌ - - - - - - ┐             │
│  │  DISEÑO     │ │  MERCH      │ │  MARKETING  │              │
│  │  Artes, log │ │  Catálogos  │ │  Campañas   │              │
│  │  0 archivos │ │  0 archivos │ │  0 archivos │              │
│  └ - - - - - - ┘ └ - - - - - - ┘ └ - - - - - - ┘             │
│                                                           [+]    │ ← FAB verde
└──────────────────────────────────────────────────────────────────┘
```

## Archivos afectados

| Archivo | Qué cambia | Líneas aproximadas |
|---|---|---|
| `src/hooks/useArtistFiles.ts` | Añadir `description` a cada categoría + renombrar 4 nombres | 8–21 |
| `src/pages/Carpetas.tsx` | `renderCategoryFolders()`: orden, subtítulos; nueva sección "recientes"; FAB con dialog | 381–432 + nuevo estado + nueva query |

**Sin tocar**: lógica de upload, hooks, Supabase, rutas, `FileExplorer`, `ConciertosView`. Cambio puramente de presentación/UX sobre datos ya existentes.

**Sin cambios de base de datos.** Los archivos recientes se obtienen de `artist_files` que ya existe.
