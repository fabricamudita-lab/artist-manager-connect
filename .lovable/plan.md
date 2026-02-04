

# Plan: Gestor de Equipos en Panel Lateral

## Cambio Propuesto

Reemplazar la opción "Nuevo Equipo" en el dropdown por "Editar Equipos", que abrirá un panel lateral (Sheet) con todas las operaciones de gestión de equipos.

```text
ANTES:                          DESPUES:
┌────────────────────┐          ┌────────────────────┐
│ 00 Management (1)  │          │ 00 Management (1)  │
│─────────────────── │          │─────────────────── │
│ Rita Payés (5)     │          │ Rita Payés (5)     │
│ ✓ VIC (6)          │          │ ✓ VIC (6)          │
│─────────────────── │          │─────────────────── │
│ + Nuevo Equipo     │          │ ⚙️ Editar Equipos   │
└────────────────────┘          └────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │ Gestor de Equipos    [X] │
                              │─────────────────────────-│
                              │ Administra tus equipos   │
                              │                          │
                              │ [+ Nuevo Equipo]         │
                              │                          │
                              │ ┌──────────────────────┐ │
                              │ │ 🎵 Rita Payés        │ │
                              │ │    5 miembros        │ │
                              │ │    [✏️] [📋] [🗑️]    │ │
                              │ └──────────────────────┘ │
                              │ ┌──────────────────────┐ │
                              │ │ 🎵 VIC               │ │
                              │ │    6 miembros        │ │
                              │ │    [✏️] [📋] [🗑️]    │ │
                              │ └──────────────────────┘ │
                              └──────────────────────────┘
```

## Implementacion Tecnica

### Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/components/TeamManagerSheet.tsx` | Crear | Nuevo panel lateral con lista de equipos y acciones |
| `src/components/TeamDropdown.tsx` | Modificar | Cambiar "Nuevo Equipo" por "Editar Equipos" |
| `src/pages/Teams.tsx` | Modificar | Conectar el nuevo panel |

### 1. Nuevo Componente: TeamManagerSheet

```tsx
// src/components/TeamManagerSheet.tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, MoreVertical, Pencil, Copy, Trash2, Users, Music 
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  stageName?: string | null;
  avatarUrl?: string | null;
  memberCount: number;
  description?: string | null;
}

interface TeamManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  onCreateNew: () => void;
  onEdit: (teamId: string) => void;
  onDuplicate: (teamId: string) => void;
  onDelete: (teamId: string) => void;
}

export function TeamManagerSheet({
  open,
  onOpenChange,
  teams,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
}: TeamManagerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestor de Equipos
          </SheetTitle>
          <SheetDescription>
            Administra, edita o elimina equipos
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Button onClick={onCreateNew} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Equipo
          </Button>

          <div className="space-y-3">
            {teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay equipos creados</p>
              </div>
            ) : (
              teams.map((team) => (
                <Card key={team.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {team.avatarUrl && (
                          <AvatarImage src={team.avatarUrl} />
                        )}
                        <AvatarFallback>
                          {(team.stageName || team.name).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {team.stageName || team.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {team.memberCount} miembros
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(team.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate(team.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(team.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 2. Modificar TeamDropdown

Cambiar la prop y el texto del boton final:

```tsx
// Cambios en TeamDropdown.tsx

interface TeamDropdownProps {
  // ... props existentes ...
  onCreateNew?: () => void;    // ELIMINAR
  onManageTeams?: () => void;  // NUEVO
}

// En el JSX, cambiar:
{onManageTeams && (
  <>
    <SelectSeparator />
    <SelectItem value="__manage__" className="text-primary">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" />  {/* Cambiar icono */}
        <span>Editar Equipos</span>        {/* Cambiar texto */}
      </div>
    </SelectItem>
  </>
)}

// En handleValueChange:
const handleValueChange = (value: string) => {
  if (value === '__manage__') {
    onManageTeams?.();
  } else {
    onTeamChange(value);
  }
};
```

### 3. Modificar Teams.tsx

Conectar el nuevo panel:

```tsx
// Nuevo estado
const [teamManagerOpen, setTeamManagerOpen] = useState(false);

// Cambiar props de TeamDropdown
<TeamDropdown
  teams={...}
  selectedTeamId={selectedArtistId}
  onTeamChange={setSelectedArtistId}
  managementMemberCount={teamMembers.length}
  onManageTeams={() => setTeamManagerOpen(true)}  // NUEVO
/>

// Añadir el Sheet al final
<TeamManagerSheet
  open={teamManagerOpen}
  onOpenChange={setTeamManagerOpen}
  teams={artists.map(a => ({
    id: a.id,
    name: a.name,
    stageName: a.stage_name,
    avatarUrl: a.avatar_url,
    memberCount: teamMemberCounts.get(a.id) || 0,
    description: a.description,
  }))}
  onCreateNew={() => {
    setTeamManagerOpen(false);
    setCreateTeamDialogOpen(true);
  }}
  onEdit={(teamId) => {
    setTeamManagerOpen(false);
    handleEditTeam(teamId);
  }}
  onDuplicate={handleDuplicateTeam}
  onDelete={handleDeleteTeam}
/>
```

## Flujo de Usuario

1. Usuario hace clic en dropdown de Equipo
2. Selecciona "Editar Equipos" al final
3. Se abre panel lateral con lista de equipos
4. Puede hacer clic en "Nuevo Equipo" o usar el menu de 3 puntos para Editar/Duplicar/Eliminar
5. Al seleccionar una accion, el panel se cierra y se abre el dialogo correspondiente

## Resultado Visual

El dropdown se mantiene limpio con la opcion de gestion al final, y todas las operaciones de equipo se centralizan en un panel lateral dedicado, evitando saturar la interfaz principal.

