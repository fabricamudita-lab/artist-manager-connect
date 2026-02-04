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
                          <AvatarImage src={team.avatarUrl} alt={team.name} />
                        )}
                        <AvatarFallback className="bg-secondary">
                          {(team.stageName || team.name).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {team.stageName || team.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {team.memberCount} {team.memberCount === 1 ? 'miembro' : 'miembros'}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
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
                          className="text-destructive focus:text-destructive"
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
