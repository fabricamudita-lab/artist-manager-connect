import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  User,
  StickyNote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingNote {
  id: string;
  booking_id: string;
  content: string;
  created_by: string;
  created_at: string;
  author_name?: string;
}

interface BookingNotesProps {
  bookingId: string;
}

export function BookingNotes({ bookingId }: BookingNotesProps) {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<BookingNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [bookingId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      // For now, we'll store notes in the booking's notas field as JSON
      // In a full implementation, you'd have a separate booking_notes table
      const { data, error } = await supabase
        .from('booking_offers')
        .select('notas')
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      // Parse notes from JSON stored in notas field
      let parsedNotes: BookingNote[] = [];
      if (data?.notas) {
        try {
          const notasData = JSON.parse(data.notas);
          if (Array.isArray(notasData)) {
            parsedNotes = notasData;
          }
        } catch {
          // If it's not JSON, treat as legacy single note
          parsedNotes = [{
            id: 'legacy',
            booking_id: bookingId,
            content: data.notas,
            created_by: 'unknown',
            created_at: new Date().toISOString(),
            author_name: 'Sistema'
          }];
        }
      }
      
      setNotes(parsedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      const newNoteObj: BookingNote = {
        id: crypto.randomUUID(),
        booking_id: bookingId,
        content: newNote.trim(),
        created_by: profile?.user_id || 'unknown',
        created_at: new Date().toISOString(),
        author_name: profile?.full_name || 'Usuario'
      };

      const updatedNotes = [...notes, newNoteObj];

      const { error } = await supabase
        .from('booking_offers')
        .update({ notas: JSON.stringify(updatedNotes) })
        .eq('id', bookingId);

      if (error) throw error;

      setNotes(updatedNotes);
      setNewNote('');
      toast.success('Nota añadida');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Error al añadir nota');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddNote();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          Notas Internas
          <Badge variant="secondary" className="ml-auto text-xs">
            {notes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes List */}
        <ScrollArea className="h-[200px] pr-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                  <div className="h-12 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay notas todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div 
                  key={note.id} 
                  className="bg-muted/50 rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {note.author_name || 'Usuario'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(note.created_at), { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Add Note */}
        <div className="space-y-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una nota... (Cmd+Enter para enviar)"
            className="min-h-[80px] text-sm"
          />
          <Button 
            size="sm" 
            onClick={handleAddNote}
            disabled={!newNote.trim() || submitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Añadiendo...' : 'Añadir Nota'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
