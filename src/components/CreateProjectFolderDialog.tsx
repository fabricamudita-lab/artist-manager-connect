import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Folder } from "lucide-react";

interface CreateProjectFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  parentFolderId?: string | null;
}

export function CreateProjectFolderDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  parentFolderId = null 
}: CreateProjectFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          is_folder: true,
          parent_folder_id: parentFolderId,
          created_by: userData.user.id,
          status: 'en_curso'
        });

      if (error) throw error;

      toast({
        title: "Carpeta creada",
        description: `La carpeta "${name}" ha sido creada exitosamente.`,
      });

      setName("");
      setDescription("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la carpeta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-primary" />
            Nueva Carpeta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nombre de la carpeta</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Gira 2025, Festival de Verano..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="folder-description">Descripción (opcional)</Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la carpeta..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear carpeta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}