
# Plan: Respetar field_config en ContactProfileSheet

## Problema Identificado

El panel lateral `ContactProfileSheet` muestra todos los campos del contacto (email, teléfono, dirección, IBAN, etc.) sin respetar la configuración de visibilidad almacenada en `field_config`. Cuando el usuario desactiva un campo en "Configuración de Campos", ese campo debería ocultarse del panel lateral.

## Solución

Modificar `ContactProfileSheet` para que filtre los campos basándose en los valores de `contact.field_config`. Solo se mostrarán los campos cuyo toggle esté activo (`true`) en la configuración.

## Mapeo de Campos

La `field_config` controla estos campos:

| Clave en field_config | Campo en ContactProfileSheet |
|----------------------|------------------------------|
| `stage_name` | Nombre artístico |
| `legal_name` | Nombre legal |
| `email` | Email |
| `phone` | Teléfono |
| `address` | Dirección |
| `bank_info` | Banco |
| `iban` | IBAN |
| `clothing_size` | Talla de ropa |
| `shoe_size` | Talla de calzado |
| `allergies` | Alergias |
| `special_needs` | Necesidades especiales |
| `contract_url` | Contrato (URL) |
| `preferred_hours` | Horarios preferidos |
| `company` | Empresa |
| `role` | Rol |
| `notes` | Notas |

## Cambios Técnicos

### Archivo: `src/components/ContactProfileSheet.tsx`

1. **Crear helper para verificar visibilidad**:
```typescript
const isFieldVisible = (fieldKey: string): boolean => {
  // Si no hay field_config, mostrar todos los campos por defecto
  if (!contact.field_config) return true;
  
  // Si el campo no está definido en la config, mostrarlo por defecto
  if (contact.field_config[fieldKey] === undefined) return true;
  
  return contact.field_config[fieldKey] === true;
};
```

2. **Aplicar filtro en cada sección**:

**Header (nombre artístico y rol):**
```tsx
{isFieldVisible('stage_name') && (
  <InlineEdit value={contact.stage_name || ''} ... />
)}
{isFieldVisible('role') && (
  <InlineEdit value={contact.role || ''} ... />
)}
```

**Información de contacto:**
```tsx
{isFieldVisible('email') && (
  <EditableInfoCard icon={Mail} label="Email" ... />
)}
{isFieldVisible('phone') && (
  <EditableInfoCard icon={Phone} label="Teléfono" ... />
)}
{isFieldVisible('company') && (
  <EditableInfoCard icon={Building} label="Empresa" ... />
)}
{isFieldVisible('address') && (
  <EditableInfoCard icon={Home} label="Dirección" ... />
)}
```

**Información personal:**
```tsx
{isFieldVisible('legal_name') && (
  <EditableInfoCard icon={User} label="Nombre legal" ... />
)}
{isFieldVisible('preferred_hours') && (
  <EditableInfoCard icon={Clock} label="Horario preferido" ... />
)}
```

**Información adicional:**
```tsx
{isFieldVisible('clothing_size') && (
  <EditableInfoCard icon={Shirt} label="Talla de ropa" ... />
)}
{isFieldVisible('shoe_size') && (
  <EditableInfoCard icon={Shirt} label="Talla de calzado" ... />
)}
{isFieldVisible('allergies') && (
  <EditableInfoCard icon={AlertTriangle} label="Alergias" ... />
)}
{isFieldVisible('special_needs') && (
  <EditableInfoCard icon={AlertTriangle} label="Necesidades especiales" ... />
)}
```

**Información bancaria:**
```tsx
{isFieldVisible('iban') && (
  <EditableInfoCard icon={CreditCard} label="IBAN" ... />
)}
{isFieldVisible('bank_info') && (
  <EditableInfoCard icon={CreditCard} label="Banco" ... />
)}
```

**Contrato:**
```tsx
{isFieldVisible('contract_url') && (
  <EditableInfoCard icon={Link} label="URL del contrato" ... />
)}
```

**Notas:**
```tsx
{isFieldVisible('notes') && (
  <EditableInfoCard icon={FileText} label="Notas" ... />
)}
```

3. **Ocultar secciones vacías**:
Si todos los campos de una sección están deshabilitados, ocultar el encabezado de la sección:

```tsx
{/* Solo mostrar sección si al menos un campo está visible */}
{(isFieldVisible('clothing_size') || 
  isFieldVisible('shoe_size') || 
  isFieldVisible('allergies') || 
  isFieldVisible('special_needs')) && (
  <div className="space-y-3">
    <h3>Información adicional</h3>
    {/* campos... */}
  </div>
)}
```

## Comportamiento Esperado

1. **Campos desactivados**: No aparecen en el panel lateral
2. **Secciones vacías**: Si todos los campos de una sección están desactivados, la sección entera se oculta
3. **Campos siempre visibles**: El nombre principal del contacto siempre se muestra (no está en field_config)
4. **Retrocompatibilidad**: Si un contacto no tiene field_config o un campo no está definido, se muestra por defecto

## Notas

- Los campos de "ciudad" y "país" no están en field_config, por lo que se mostrarán siempre
- Las secciones de "Configuración de equipo", "Roles en proyectos" y "Visibilidad" no se ven afectadas por field_config
- El botón de "Configuración" en el footer permite al usuario acceder al diálogo de edición para modificar qué campos mostrar
