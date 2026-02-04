
# Plan: Arreglar Scroll y Añadir Botón Editar al Panel de Perfil

## Problemas Identificados

1. **Scroll no funciona**: El contenido del panel lateral se corta y no permite desplazarse para ver toda la información
2. **Falta botón Editar**: Solo está el botón "Cerrar perfil" en el footer

## Solución Propuesta

```text
ANTES:                          DESPUES:
┌──────────────────────────┐    ┌──────────────────────────┐
│ [Avatar] Juan Rodriguez  │    │ [Avatar] Juan Rodriguez  │
│          Batería         │    │          Batería         │
│                          │    │                          │
│ [Email]  [Llamar]        │    │ [Email]  [Llamar]        │
│──────────────────────────│    │──────────────────────────│
│ Configuración de equipo  │    │ Configuración de equipo  │
│ ...                      │    │ ...                      │
│ Información de contacto  │    │ Información de contacto  │  <- SCROLL
│ ...                      │    │ ...                      │     FUNCIONA
│                          │    │ ...más secciones...      │
│ (contenido cortado!)     │    │ ...                      │
│                          │    │──────────────────────────│
│──────────────────────────│    │ [✏️ Editar] [✕ Cerrar]   │  <- DOS BOTONES
│ [✕ Cerrar perfil]        │    └──────────────────────────┘
└──────────────────────────┘
```

## Implementacion Tecnica

### Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ContactProfileSheet.tsx` | Arreglar scroll + añadir callback onEdit + botón Editar |
| `src/pages/Teams.tsx` | Pasar handler onEdit al componente |
| `src/pages/ArtistProfile.tsx` | Pasar handler onEdit al componente |

### 1. Modificar ContactProfileSheet.tsx

**Añadir prop `onEdit` a la interfaz:**
```tsx
interface ContactProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onEdit?: (contactId: string) => void;  // NUEVO
}
```

**Añadir icono Pencil a las importaciones:**
```tsx
import { 
  Mail, Phone, Building, ... , Pencil  // AÑADIR Pencil
} from "lucide-react";
```

**Arreglar estructura del SheetContent para scroll correcto:**
```tsx
<SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full overflow-hidden">
```

**Modificar el footer con dos botones:**
```tsx
<div className="p-4 border-t bg-background flex gap-2">
  {onEdit && (
    <Button 
      variant="default" 
      className="flex-1" 
      onClick={() => {
        onEdit(contact.id);
        onOpenChange(false);
      }}
    >
      <Pencil className="h-4 w-4 mr-2" />
      Editar
    </Button>
  )}
  <Button 
    variant="outline" 
    className={onEdit ? "flex-1" : "w-full"}
    onClick={() => onOpenChange(false)}
  >
    <X className="h-4 w-4 mr-2" />
    Cerrar
  </Button>
</div>
```

### 2. Modificar Teams.tsx

Pasar el handler `onEdit` que abre el diálogo de edición:

```tsx
<ContactProfileSheet
  open={!!selectedContactId}
  onOpenChange={(open) => !open && setSelectedContactId(null)}
  contactId={selectedContactId || ''}
  onEdit={(contactId) => {
    // Buscar el contacto completo para pasarlo al EditContactDialog
    const contact = teamContacts.find(c => c.id === contactId);
    if (contact) {
      setEditingContact(contact);
      setSelectedContactId(null);
    }
  }}
/>
```

### 3. Modificar ArtistProfile.tsx

Similar al de Teams.tsx - pasar handler que abra el diálogo de edición.

## Resumen de Cambios

1. Añadir `h-full overflow-hidden` al SheetContent para que el scroll funcione
2. Añadir prop `onEdit?: (contactId: string) => void` al componente
3. Cambiar el footer para mostrar dos botones: "Editar" (primario) y "Cerrar" (outline)
4. Actualizar Teams.tsx y ArtistProfile.tsx para pasar el handler de edición
