import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, CheckCircle2, Reply } from 'lucide-react';
import type { DraftComment } from '@/hooks/useContractDrafts';

interface DraftCommentsSidebarProps {
  comments: DraftComment[];
  onAddComment: (sectionKey: string, message: string, authorName: string, parentId?: string) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
  isOwner: boolean;
  defaultAuthorName?: string;
}

export function DraftCommentsSidebar({ comments, onAddComment, onResolve, isOwner, defaultAuthorName = '' }: DraftCommentsSidebarProps) {
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [sectionKey, setSectionKey] = useState('general');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const sections = [...new Set(comments.map(c => c.section_key))];
  const groupedComments = sections.reduce((acc, key) => {
    acc[key] = comments.filter(c => c.section_key === key && !c.parent_comment_id);
    return acc;
  }, {} as Record<string, DraftComment[]>);

  const getReplies = (parentId: string) => comments.filter(c => c.parent_comment_id === parentId);

  const handleSubmit = async () => {
    if (!newMessage.trim() || !authorName.trim()) return;
    await onAddComment(sectionKey, newMessage, authorName, replyTo || undefined);
    setNewMessage('');
    setReplyTo(null);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  const SECTION_LABELS: Record<string, string> = {
    general: 'General',
    datos_productora: 'Datos Productora',
    datos_colaboradora: 'Datos Colaboradora',
    grabacion: 'Grabación y Derechos',
    clausulas: 'Cláusulas',
    condiciones: 'Condiciones',
    pago: 'Pago',
    legal: 'Cláusulas Legales',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Comentarios ({comments.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay comentarios aún. Añade el primero.
          </p>
        )}

        {Object.entries(groupedComments).map(([section, sectionComments]) => (
          <div key={section} className="space-y-2">
            <Badge variant="secondary" className="text-xs">{SECTION_LABELS[section] || section}</Badge>
            {sectionComments.map(comment => (
              <div key={comment.id} className={`rounded-lg border p-3 text-sm space-y-1 ${comment.resolved ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs">{comment.author_name}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                </div>
                <p className="text-sm">{comment.message}</p>
                <div className="flex gap-1 pt-1">
                  {!comment.resolved && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                      setReplyTo(comment.id);
                      setSectionKey(comment.section_key);
                    }}>
                      <Reply className="h-3 w-3 mr-1" />
                      Responder
                    </Button>
                  )}
                  {isOwner && !comment.resolved && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-green-600" onClick={() => onResolve(comment.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolver
                    </Button>
                  )}
                </div>

                {/* Replies */}
                {getReplies(comment.id).map(reply => (
                  <div key={reply.id} className="ml-4 mt-2 border-l-2 pl-3 text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{reply.author_name}</span>
                      <span className="text-muted-foreground">{formatTime(reply.created_at)}</span>
                    </div>
                    <p>{reply.message}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* New comment form */}
      <div className="border-t p-3 space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Reply className="h-3 w-3" />
            <span>Respondiendo a comentario</span>
            <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setReplyTo(null)}>✕</Button>
          </div>
        )}
        {!replyTo && (
          <select
            value={sectionKey}
            onChange={e => setSectionKey(e.target.value)}
            className="w-full text-xs rounded-md border bg-background px-2 py-1.5"
          >
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        )}
        {!defaultAuthorName && (
          <Input
            placeholder="Tu nombre"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            className="text-sm h-8"
          />
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder="Escribe un comentario..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="text-sm min-h-[60px]"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!newMessage.trim() || !authorName.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" />
          Enviar
        </Button>
      </div>
    </div>
  );
}
