import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ScheduleEncounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: {
    id: string;
    artist_id?: string | null;
    tipo: string;
    nombre_solicitante: string;
    ciudad?: string | null;
    medio?: string | null;
    lugar_concierto?: string | null;
  } | null;
  onCreated?: () => void;
}

export function ScheduleEncounterDialog({ open, onOpenChange, solicitud, onCreated }: ScheduleEncounterDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<'llamada' | 'videollamada' | 'chat' | ''>('');
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [linkOrPhone, setLinkOrPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setType(''); setDate(''); setTime(''); setLinkOrPhone(''); setNotes('');
  };

  const handleSubmit = async () => {
    if (!solicitud) return;

    if (type === 'chat') {
      toast({ title: 'Chat interno', description: 'Abriendo chat interno…' });
      onOpenChange(false);
      navigate('/chat');
      return;
    }

    if (!date || !time) {
      toast({ title: 'Faltan datos', description: 'Selecciona fecha y hora', variant: 'destructive' });
      return;
    }

    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    try {
      setLoading(true);
      const { error } = await supabase.from('events').insert([
        {
          title: `Encuentro (${type === 'llamada' ? 'Llamada' : 'Videollamada'}) – ${solicitud.nombre_solicitante}`,
          event_type: 'meeting',
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          location: linkOrPhone || (type === 'llamada' ? 'Phone' : 'Online'),
          description: `Relacionado con solicitud ${solicitud.id}\n${notes || ''}`,
          created_by: profile?.user_id,
          artist_id: solicitud.artist_id || null,
          ...(solicitud.tipo === 'booking' ? {
            booking_id: solicitud.id,
          } : {})
        }
      ]);

      if (error) throw error;

      toast({ title: 'Encuentro creado', description: 'Se ha añadido al calendario' });
      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo crear el encuentro', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Organizar encuentro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="llamada">Llamada</SelectItem>
                <SelectItem value="videollamada">Videollamada</SelectItem>
                <SelectItem value="chat">Abrir chat interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type && type !== 'chat' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          )}

          {type && type !== 'chat' && (
            <div className="space-y-2">
              <Label>{type === 'llamada' ? 'Teléfono' : 'Enlace de videollamada'}</Label>
              <Input
                placeholder={type === 'llamada' ? '+34 600 000 000' : 'https://meet...'}
                value={linkOrPhone}
                onChange={(e) => setLinkOrPhone(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda, objetivos…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {type === 'chat' ? 'Abrir chat' : 'Crear encuentro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
