

# Plan: Añadir Información de Equipo al Panel Lateral de Perfil

## Problema Identificado

El panel lateral de perfil (`ContactProfileSheet`) no muestra la configuración de equipo que sí está disponible en el diálogo de edición:

| Campo | En EditDialog | En ProfileSheet |
|-------|---------------|-----------------|
| Tipo de equipo | ✅ | ❌ Falta |
| Artistas asignados | ✅ | ❌ Falta |
| Categoría de equipo | ✅ | ❌ Solo muestra `category`, no `team_categories` |

## Solución Propuesta

Añadir una nueva sección "Configuración de Equipo" en el panel lateral que muestre:

```text
┌──────────────────────────────────────────┐
│ [Avatar] Juan Rodriguez Berbín           │
│          Juan R. Berbín                  │
│          [Batería]                       │
│                                          │
│ [Email]  [Llamar]                        │
├──────────────────────────────────────────┤
│ Configuración de equipo     <- NUEVO     │
│ ┌──────────────────────────────────────┐ │
│ │ 🏢 Tipo de equipo                    │ │
│ │    Equipo de artista                 │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 🎵 Artistas                          │ │
│ │    [Rita Payés] [M00DITA]            │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 🏷️ Categoría                         │ │
│ │    [Banda] [Productor]               │ │
│ └──────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│ Información de contacto                  │
│ ...                                      │
└──────────────────────────────────────────┘
```

## Implementación Técnica

### Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ContactProfileSheet.tsx` | Añadir sección de configuración de equipo |

### 1. Actualizar Interface ContactData

```tsx
interface ContactData {
  // ... campos existentes ...
  field_config?: {
    is_team_member?: boolean;
    is_management_team?: boolean;
    team_categories?: string[];
    [key: string]: any;
  } | null;
}
```

### 2. Añadir Estado para Artistas Asignados

```tsx
const [assignedArtists, setAssignedArtists] = useState<Array<{
  id: string;
  name: string;
  stage_name?: string;
}>>([]);

const fetchAssignedArtists = async () => {
  try {
    const { data } = await supabase
      .from('contact_artist_assignments')
      .select('artist_id, artists:artist_id(id, name, stage_name)')
      .eq('contact_id', contactId);
    
    if (data) {
      setAssignedArtists(data.map((a: any) => ({
        id: a.artists?.id,
        name: a.artists?.name,
        stage_name: a.artists?.stage_name,
      })).filter(a => a.id));
    }
  } catch (error) {
    console.error('Error fetching assigned artists:', error);
  }
};
```

### 3. Nueva Sección de Configuración de Equipo

```tsx
{/* Configuración de equipo - solo si es miembro de equipo */}
{contact.field_config?.is_team_member && (
  <div className="space-y-3">
    <h3 className="text-sm font-medium text-muted-foreground">
      Configuración de equipo
    </h3>
    
    {/* Tipo de equipo */}
    <InfoCard 
      icon={Building} 
      label="Tipo de equipo" 
      value={contact.field_config?.is_management_team 
        ? "00 Management (empresa)" 
        : "Equipo de artista"} 
    />

    {/* Artistas asignados */}
    {assignedArtists.length > 0 && (
      <InfoCard 
        icon={Music} 
        label="Artistas" 
        value={
          <div className="flex flex-wrap gap-1 mt-1">
            {assignedArtists.map((artist) => (
              <Badge key={artist.id} variant="outline">
                {artist.stage_name || artist.name}
              </Badge>
            ))}
          </div>
        } 
      />
    )}

    {/* Categoría de equipo */}
    {contact.field_config?.team_categories?.length > 0 && (
      <InfoCard 
        icon={Tag} 
        label="Categoría de equipo" 
        value={
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.field_config.team_categories.map((cat) => (
              <Badge key={cat} variant="secondary">
                {getTeamCategoryLabel(cat)}
              </Badge>
            ))}
          </div>
        } 
      />
    )}
  </div>
)}
```

### 4. Importar Dependencias

```tsx
import { Music } from "lucide-react";
import { getTeamCategoryLabel } from '@/lib/teamCategories';
```

## Resumen de Cambios

1. Añadir `field_config` a la interfaz ContactData
2. Crear estado y función para obtener artistas asignados
3. Añadir sección "Configuración de equipo" después del header
4. Mostrar: Tipo de equipo, Artistas asignados, Categoría de equipo
5. Solo mostrar la sección si `is_team_member` es true

## Resultado Visual Esperado

El panel lateral mostrará toda la información disponible en el diálogo de edición, organizada en secciones claras, incluyendo la configuración de equipo que antes no era visible.

