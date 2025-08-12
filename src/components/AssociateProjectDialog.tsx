import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProjectOption {
  id: string;
  name: string;
}

interface AssociateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: string | null;
  artistId?: string | null;
  onLinked: () => void;
}

export default function AssociateProjectDialog({ open, onOpenChange, solicitudId, artistId, onLinked }: AssociateProjectDialogProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const fetchProjects = async () => {
      try {
        let qb = supabase.from("projects").select("id,name").order("created_at", { ascending: false });
        if (artistId) qb = qb.eq("artist_id", artistId as any);
        const { data, error } = await qb;
        if (error) throw error;
        setProjects((data as any[]) || []);
      } catch (e) {
        console.error("Error fetching projects", e);
      }
    };
    fetchProjects();
  }, [open, artistId]);

  const handleLink = async () => {
    if (!solicitudId || !selectedId) {
      toast({ title: "Selecciona un proyecto", description: "Debes elegir un proyecto para asociar.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("solicitudes")
        .update({ project_id: selectedId })
        .eq("id", solicitudId);
      if (error) throw error;
      toast({ title: "Asociada", description: "La solicitud fue asociada al proyecto." });
      onLinked();
      onOpenChange(false);
      setSelectedId("");
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo asociar la solicitud.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asociar a proyecto</DialogTitle>
          <DialogDescription>Selecciona un proyecto existente para vincular esta solicitud.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder={projects.length ? "Selecciona un proyecto" : "No hay proyectos"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleLink} disabled={loading || !selectedId}>{loading ? "Guardando…" : "Asociar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
