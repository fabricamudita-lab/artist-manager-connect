
# Visualizador de ajuste de imagen universal

## Resumen

Crear un componente reutilizable `ImageCropperDialog` que se muestre automaticamente cada vez que el usuario selecciona una imagen (avatar, portada, cabecera, etc.) antes de subirla. Permite hacer zoom y mover la imagen para encuadrarla correctamente.

## Componente nuevo: `ImageCropperDialog`

Se creara `src/components/ui/image-cropper-dialog.tsx` con las siguientes caracteristicas:

- **Dialog modal** que muestra la imagen seleccionada
- **Zoom automatico inicial** (1.2x) para que la imagen no quede exactamente al borde
- **Slider de zoom** (1x a 3x) para ampliar o reducir
- **Arrastrar para mover** (drag to pan) la imagen dentro del area visible
- **Area de recorte visible** con bordes redondeados opcionales (circular para avatares, rectangular para portadas)
- **Botones "Cancelar" y "Confirmar"** - al confirmar, genera un Blob recortado via canvas
- Props: `file`, `open`, `onConfirm(croppedBlob: Blob)`, `onCancel`, `aspectRatio` (1 para avatares, 16/9 para cabeceras, etc.), `circular` (boolean)

La implementacion usara un `<canvas>` oculto para renderizar el recorte final. No se necesitan dependencias externas - se usara CSS transform para zoom/pan y Canvas API para el crop.

## Integraciones (archivos a modificar)

Se interceptara el flujo de seleccion de archivo en cada punto de upload de imagenes:

1. **`src/components/ContactProfileSheet.tsx`** - `handleAvatarUpload`: abrir cropper antes de subir (circular, 1:1)
2. **`src/components/onboarding/steps/Step1Identity.tsx`** - `handleImageUpload`: abrir cropper para avatar (circular 1:1) y header (16:9)
3. **`src/pages/Contacts.tsx`** - `handleDocumentUpload`: abrir cropper para fotos de DNI/pasaporte (rectangular, libre)
4. **`src/components/ArtistFormatsDialog.tsx`** - rider uploads (rectangular)
5. **`src/components/onboarding/steps/Step5BookingFormats.tsx`** - rider uploads (rectangular)

En cada caso, el patron sera:
- El `onChange` del input ya no llama directamente al upload
- En su lugar, guarda el archivo en estado y abre el `ImageCropperDialog`
- Al confirmar el crop, se ejecuta la funcion de upload existente con el blob recortado

## Detalles tecnicos

### ImageCropperDialog - Funcionamiento interno

```text
+----------------------------------+
|  Dialog                          |
|  +----------------------------+  |
|  |   Area de visualizacion    |  |
|  |   (overflow: hidden)       |  |
|  |                            |  |
|  |   [imagen con transform]   |  |
|  |   scale + translate        |  |
|  |                            |  |
|  +----------------------------+  |
|                                  |
|  [--- Slider de Zoom ---]        |
|                                  |
|  [Cancelar]        [Confirmar]   |
+----------------------------------+
```

- **Zoom**: CSS `transform: scale(zoom)` controlado por Slider (Radix)
- **Pan**: `onPointerDown/Move/Up` para arrastrar, guardando `translateX/Y`
- **Crop final**: Dibujar la porcion visible en un `<canvas>` y exportar como Blob (`canvas.toBlob`)
- **Zoom inicial**: 1.2x automatico
- **Aspect ratio**: Configurable, el area de visualizacion se adapta

### Patron de integracion (ejemplo ContactProfileSheet)

```typescript
// Estado nuevo
const [cropFile, setCropFile] = useState<File | null>(null);

// onChange del input: abre cropper en vez de subir
onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) setCropFile(file);
}}

// Cropper dialog
<ImageCropperDialog
  file={cropFile}
  open={!!cropFile}
  onCancel={() => setCropFile(null)}
  onConfirm={(blob) => {
    setCropFile(null);
    uploadAvatar(blob); // reutiliza logica existente
  }}
  aspectRatio={1}
  circular
/>
```

## Archivos

| Archivo | Accion |
|---------|--------|
| `src/components/ui/image-cropper-dialog.tsx` | Crear (nuevo componente) |
| `src/components/ContactProfileSheet.tsx` | Modificar - integrar cropper en avatar upload |
| `src/components/onboarding/steps/Step1Identity.tsx` | Modificar - integrar cropper en avatar y header |
| `src/pages/Contacts.tsx` | Modificar - integrar cropper en fotos de documentos |
| `src/components/ArtistFormatsDialog.tsx` | Modificar - integrar cropper en rider upload |
| `src/components/onboarding/steps/Step5BookingFormats.tsx` | Modificar - integrar cropper en rider upload |
