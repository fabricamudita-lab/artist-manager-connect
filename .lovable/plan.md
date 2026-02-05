

# Plan: Convertir ContactProfileSheet en Editor Inline

## Contexto

| Componente | Propósito Actual | Propósito Futuro |
|------------|------------------|------------------|
| `ContactProfileSheet` | Solo visualización | Visualización + Edición inline |
| `EditContactDialog` | Edición completa + Configuración de campos | Solo propietarios (configuración avanzada) |

El panel lateral se convertirá en el **editor principal** para todos los usuarios, mientras que el diálogo de edición completo (con los toggles de configuración de campos) quedará restringido a propietarios/administradores.

## Arquitectura de la Solución

```text
┌───────────────────────────────────────────────────────────────┐
│ ContactProfileSheet (Panel Lateral)                          │
├───────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Header: Avatar + Nombre (editable) + Stage name        │   │
│ └─────────────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Botones: Email / Llamar                                 │   │
│ └─────────────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Secciones con EditableInfoCard:                         │   │
│ │   - Información de contacto (email, phone, etc.)       │   │
│ │   - Información personal                               │   │
│ │   - Información adicional (tallas, alergias)           │   │
│ │   - Información bancaria                               │   │
│ │   - Notas                                              │   │
│ └─────────────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Footer: Solo "Cerrar" (o "Configuración avanzada"       │   │
│ │         para propietarios)                              │   │
│ └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

## Cambios Principales

### 1. Nuevo componente EditableInfoCard

Crear un componente que combine visualización y edición inline:

```tsx
const EditableInfoCard = ({ 
  icon: Icon, 
  label, 
  value, 
  field,
  onSave,
  type = 'text' // 'text' | 'textarea' | 'email' | 'tel'
}) => (
  <Card>
    <CardContent className="py-3 flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <InlineEdit
          value={value || ''}
          onSave={async (newValue) => {
            await onSave(field, newValue);
          }}
          placeholder={`Añadir ${label.toLowerCase()}...`}
        />
      </div>
    </CardContent>
  </Card>
);
```

### 2. Función de guardado centralizada

Añadir una función `updateContactField` que actualice un campo específico en Supabase:

```tsx
const updateContactField = async (field: string, value: string) => {
  const { error } = await supabase
    .from('contacts')
    .update({ [field]: value })
    .eq('id', contactId);
  
  if (error) throw error;
  
  // Actualizar estado local
  setContact(prev => prev ? { ...prev, [field]: value } : null);
  
  toast({ title: "Guardado" });
};
```

### 3. Mostrar TODOS los campos (vacíos y con valor)

Actualmente solo se muestran campos con valor. Cambiar para mostrar todos los campos configurados, permitiendo añadir información directamente:

```tsx
// ANTES: Solo muestra si tiene valor
{contact.email && (
  <InfoCard icon={Mail} label="Email" value={contact.email} />
)}

// DESPUÉS: Siempre muestra, editable
<EditableInfoCard 
  icon={Mail} 
  label="Email" 
  value={contact.email}
  field="email"
  onSave={updateContactField}
/>
```

### 4. Campos no editables inline

Algunos campos requieren UI más compleja y NO serán editables inline:
- **Artistas asignados** (requiere selector múltiple)
- **Categorías de equipo** (requiere selector)
- **Tipo de equipo** (management vs artista)
- **Etiquetas** (requiere input especial con tags)
- **Configuración de campos visibles** (toggles - solo propietarios)

Estos campos se mostrarán en modo lectura con un botón "Editar configuración" que abrirá el EditContactDialog.

### 5. Actualización del Footer

```tsx
<div className="p-4 border-t bg-background flex gap-2">
  {/* Solo para propietarios: acceso a configuración avanzada */}
  {onEdit && (
    <Button 
      variant="outline"
      className="flex-1" 
      onClick={() => {
        onEdit(contact.id);
        onOpenChange(false);
      }}
    >
      <Settings className="h-4 w-4 mr-2" />
      Configuración
    </Button>
  )}
  <Button 
    variant="outline" 
    className="flex-1"
    onClick={() => onOpenChange(false)}
  >
    <X className="h-4 w-4 mr-2" />
    Cerrar
  </Button>
</div>
```

## Campos Editables Inline

| Sección | Campo | Tipo de Input |
|---------|-------|---------------|
| Información de contacto | email | text (email) |
| | phone | text (tel) |
| | company | text |
| | address | textarea |
| | city | text |
| | country | text |
| Información personal | stage_name | text |
| | legal_name | text |
| | role | text |
| | preferred_hours | text |
| Información adicional | clothing_size | text |
| | shoe_size | text |
| | allergies | textarea |
| | special_needs | textarea |
| Información bancaria | bank_info | text |
| | iban | text |
| Otros | contract_url | text (url) |
| | notes | textarea |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/ContactProfileSheet.tsx` | Implementar edición inline con `InlineEdit`, función `updateContactField`, mostrar campos vacíos, cambiar footer |

## Flujo de Usuario

1. Usuario hace clic en contacto → Se abre ContactProfileSheet
2. Usuario ve todos los campos del perfil
3. Usuario hace clic en cualquier campo → Se activa modo edición inline
4. Usuario escribe y presiona Enter o hace clic fuera → Se guarda automáticamente
5. Si es propietario, puede acceder a "Configuración" para toggles de campos y configuración de equipo

## Consideraciones Técnicas

- **Optimistic updates**: El componente InlineEdit ya maneja esto
- **Manejo de errores**: InlineEdit hace rollback automático si falla
- **Refresh**: Después de guardar, el estado local se actualiza sin necesidad de refetch
- **Consistencia**: Las páginas que usan ContactProfileSheet (Teams, Agenda, ArtistProfile) verán los cambios reflejados

