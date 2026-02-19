
# Convertir "Productor/es" de texto libre a selector de perfiles vinculados (multi-selección)

## Situación actual

El campo "Productor/es" en `CreateReleaseBudgetDialog.tsx` es un `<Input>` de texto libre:
```tsx
const [producers, setProducers] = useState('');
// ...
<Input value={producers} onChange={e => setProducers(e.target.value)} placeholder="Nombre(s)" />
```

El valor se guarda como string en `metadata.producers` y aparece en las observaciones de la partida "Producción" como `Productor/es: Arnau Figueres & Kquimi Saigi`.

## Qué se quiere

Reemplazar el input de texto por un selector que:
- Busca en **perfiles** (usuarios del workspace) y **contactos** de la agenda
- Permite seleccionar **varios productores** a la vez
- Muestra badges removibles con los nombres seleccionados
- Filtra preferentemente los contactos vinculados al artista
- Guarda los IDs + nombres en metadata para trazabilidad

## Diseño del componente: `ProducerSelector`

Se creará un nuevo componente `src/components/releases/ProducerSelector.tsx` reutilizando la lógica del `ResponsibleSelector` existente pero con soporte multi-selección.

### Interfaz:
```tsx
interface ProducerRef {
  type: 'profile' | 'contact';
  id: string;
  name: string;
}

interface ProducerSelectorProps {
  value: ProducerRef[];
  onChange: (value: ProducerRef[]) => void;
  artistId?: string | null;
  placeholder?: string;
}
```

### Fuentes de datos (mismo patrón que `ResponsibleSelector`):
1. **Contactos vinculados al artista** via `contact_artist_assignments` → todos los categorías, no solo management
2. **Perfiles del workspace** via `artist_role_bindings` + `profiles`
3. **Fallback sin artistId**: primeros 100 contactos + 50 perfiles

### UI del selector:
- Trigger: botón outline que muestra los nombres como badges compactos, o placeholder si vacío
- Dropdown: `Command` con grupos "Perfiles del equipo" y "Contactos"
- Selección toggle: click añade/quita del array
- Checkmarks en los items ya seleccionados
- No cierra el popover al seleccionar (permite elegir varios)
- Sección de badges removibles debajo del trigger (con `X`)

## Cambios en `CreateReleaseBudgetDialog.tsx`

### 1. Estado: `string` → `ProducerRef[]`
```tsx
// Antes:
const [producers, setProducers] = useState('');

// Después:
const [producers, setProducers] = useState<ProducerRef[]>([]);
```

### 2. Importar y usar `ProducerSelector` en lugar del `Input`
```tsx
// Antes:
<Input value={producers} onChange={e => setProducers(e.target.value)} placeholder="Nombre(s)" />

// Después:
<ProducerSelector 
  value={producers} 
  onChange={setProducers}
  artistId={artistId}
/>
```

### 3. Metadata guardada: `producers: string` → `producers: ProducerRef[]`
```json
// Antes:
{ "producers": "Arnau Figueres & Kquimi Saigi" }

// Después:
{ "producers": [
  { "type": "contact", "id": "uuid-1", "name": "Arnau Figueres" },
  { "type": "profile", "id": "uuid-2", "name": "Kquimi Saigi" }
] }
```

### 4. Observaciones de la partida "Producción"
```tsx
// Antes:
if (itemName.includes('Producción (productor')) return producers ? `Productor/es: ${producers}` : '';

// Después:
if (itemName.includes('Producción (productor')) {
  if (!producers.length) return '';
  return `Productor/es: ${producers.map(p => p.name).join(' & ')}`;
}
```

## Archivos a crear/modificar

**Nuevo archivo**: `src/components/releases/ProducerSelector.tsx`
- Componente de selector multi-selección de perfiles + contactos
- Reutiliza el patrón de `ResponsibleSelector` pero con array de valores
- Grupos: "Equipo del artista" (perfiles con binding) y "Contactos" (agenda)
- Badges removibles debajo del botón

**Modificar**: `src/components/releases/CreateReleaseBudgetDialog.tsx`
- Cambiar estado `producers: string` → `producers: ProducerRef[]`
- Importar `ProducerSelector`
- Reemplazar `<Input>` por `<ProducerSelector>`
- Actualizar `getDefaultObservations` para serializar el array
- Actualizar la metadata del submit

Sin cambios en base de datos — el campo `metadata` es JSONB.
