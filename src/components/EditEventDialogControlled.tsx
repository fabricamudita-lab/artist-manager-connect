import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location: string | null;
  description: string | null;
}

interface EditEventDialogControlledProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

function toLocalDateInputValue(d: Date) {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function toLocalTimeInputValue(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export function EditEventDialogControlled({ event, open, onOpenChange, onUpdated }: EditEventDialogControlledProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      setTitle(event.title);
      setStartDate(toLocalDateInputValue(start));
      setStartTime(toLocalTimeInputValue(start));
      setEndDate(toLocalDateInputValue(end));
      setEndTime(toLocalTimeInputValue(end));
      setLocation(event.location || "");
      setDescription(event.description || "");
    }
  }, [event]);

  const handleSave = async () => {
    if (!event || !title || !startDate || !startTime || !endDate || !endTime) {
      toast({ title: "Faltan datos", description: "Completa título, fechas y horas", variant: "destructive" });
      return;
    }

    const newStart = new Date(`${startDate}T${startTime}`);
    const newEnd = new Date(`${endDate}T${endTime}`);

    try {
      setSaving(true);
      const { error } = await supabase
        .from('events')
        .update({
          title,
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString(),
          location: location || null,
          description: description || null,
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({ title: "Evento actualizado", description: "Los cambios se guardaron correctamente" });
      onOpenChange(false);
      onUpdated?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || 'No se pudo actualizar el evento', variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ubicación / Enlace</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lugar, teléfono o enlace" />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
