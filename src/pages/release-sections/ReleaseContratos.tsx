import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileSignature, Trash2, Eye, MoreHorizontal, ChevronDown, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRelease } from '@/hooks/useReleases';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReleaseDocument {
  id: string;
  release_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  document_type: string;
  status: string;
  content: string | null;
  contract_token: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = {
  contract: 'Cesión de derechos',
  license: 'Licencia',
  publishing_agreement: 'Acuerdo editorial',
  distribution_agreement: 'Acuerdo de distribución',
  other: 'Otro',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', color: 'bg-blue-500/20 text-blue-600' },
  pending_signature: { label: 'Pendiente firma', color: 'bg-amber-500/20 text-amber-600' },
  signed: { label: 'Firmado', color: 'bg-green-500/20 text-green-600' },
};

export default function ReleaseContratos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: release } = useRelease(id);
  const [documents, setDocuments] = useState<ReleaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newDocType, setNewDocType] = useState('contract');
  const [newDocNotes, setNewDocNotes] = useState('');

  const fetchDocuments = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('release_documents')
      .select('*')
      .eq('release_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as unknown as ReleaseDocument[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user?.id) return;

    setUploading(true);
    try {
      const filePath = `release-documents/${id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('artist-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-files')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('release_documents')
        .insert({
          release_id: id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          document_type: newDocType,
          notes: newDocNotes || null,
          created_by: user.id,
        } as any);

      if (insertError) throw insertError;

      toast.success('Documento subido');
      setShowUploadDialog(false);
      setNewDocType('contract');
      setNewDocNotes('');
      fetchDocuments();
    } catch (err: any) {
      toast.error('Error al subir: ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await supabase.from('release_documents').delete().eq('id', docId);
    toast.success('Documento eliminado');
    fetchDocuments();
  };

  const handleStatusChange = async (docId: string, newStatus: string) => {
    await supabase
      .from('release_documents')
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq('id', docId);
    fetchDocuments();
  };

  const handleNotesChange = async (docId: string, notes: string) => {
    await supabase
      .from('release_documents')
      .update({ notes, updated_at: new Date().toISOString() } as any)
      .eq('id', docId);
  };

  const toggleExpand = (docId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Contratos</h1>
            {release && (
              <p className="text-sm text-muted-foreground">{release.title}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Subir documento
        </Button>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Sin contratos"
          description="Sube contratos de cesión de derechos, licencias o acuerdos editoriales vinculados a este lanzamiento."
        />
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
            const isOpen = expandedIds.has(doc.id);

            return (
              <Collapsible key={doc.id} open={isOpen} onOpenChange={() => toggleExpand(doc.id)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileSignature className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES] || doc.document_type}
                            {' · '}
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="border-t pt-4 space-y-4">
                      {/* Status selector */}
                      <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Estado:</label>
                        <Select value={doc.status} onValueChange={(v) => handleStatusChange(doc.id, v)}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                              <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                          <StickyNote className="h-3.5 w-3.5" />
                          Notas
                        </label>
                        <Textarea
                          placeholder="Añadir notas sobre este documento..."
                          defaultValue={doc.notes || ''}
                          onBlur={(e) => handleNotesChange(doc.id, e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {doc.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-1.5" />
                              Ver documento
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de documento</label>
              <Select value={newDocType} onValueChange={setNewDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                placeholder="Detalles sobre el contrato..."
                value={newDocNotes}
                onChange={(e) => setNewDocNotes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Archivo</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-sm text-muted-foreground">Subiendo...</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
