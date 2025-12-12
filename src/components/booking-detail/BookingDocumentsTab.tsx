import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Upload,
  Download,
  Trash2,
  Send,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  Edit3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';

interface BookingDocument {
  id: string;
  booking_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  document_type: 'contract' | 'rider' | 'press_kit' | 'invoice' | 'other';
  status: 'draft' | 'sent' | 'signed';
  created_at: string;
}

interface BookingDocumentsTabProps {
  booking: {
    id: string;
    festival_ciclo?: string;
    venue?: string;
    promotor?: string;
    fee?: number;
    fecha?: string;
  };
  onUpdate: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contrato', icon: FileText },
  { value: 'rider', label: 'Rider', icon: FileText },
  { value: 'press_kit', label: 'Press Kit', icon: FileText },
  { value: 'invoice', label: 'Factura', icon: FileText },
  { value: 'other', label: 'Otro', icon: FileText },
];

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-gray-500', icon: Edit3 },
  sent: { label: 'Enviado', color: 'bg-blue-500', icon: Send },
  signed: { label: 'Firmado', color: 'bg-green-500', icon: CheckCircle },
};

export function BookingDocumentsTab({ booking, onUpdate }: BookingDocumentsTabProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('standard');

  useEffect(() => {
    fetchDocuments();
  }, [booking.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('booking_documents')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as BookingDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${booking.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Create document record
      const { error: dbError } = await (supabase as any)
        .from('booking_documents')
        .insert({
          booking_id: booking.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          document_type: docType,
          status: 'draft',
          created_by: profile?.user_id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Documento subido",
        description: "El documento se ha subido correctamente.",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateContract = async () => {
    try {
      // For now, we'll create a placeholder - in production this would use a template engine
      toast({
        title: "Generando contrato...",
        description: "El contrato se generará con las variables del evento.",
      });

      // Create a placeholder contract record
      const { error } = await (supabase as any)
        .from('booking_documents')
        .insert({
          booking_id: booking.id,
          file_name: `Contrato_${booking.festival_ciclo || booking.venue || 'Evento'}.pdf`,
          file_url: '', // Would be generated
          file_type: 'application/pdf',
          document_type: 'contract',
          status: 'draft',
          created_by: profile?.user_id,
        });

      if (error) throw error;

      toast({
        title: "Contrato generado",
        description: "El borrador del contrato está listo para revisión.",
      });

      setShowGenerateDialog(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el contrato.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (docId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('booking_documents')
        .update({ status: newStatus })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `El documento ahora está: ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`,
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('booking_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado correctamente.",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Enlace copiado",
      description: "El enlace se ha copiado al portapapeles.",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const contracts = documents.filter(d => d.document_type === 'contract');
  const otherDocs = documents.filter(d => d.document_type !== 'contract');

  return (
    <div className="space-y-6">
      {/* Contract Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contratos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Genera y gestiona contratos del evento
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Contrato
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generar Contrato</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Plantilla</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Contrato Estándar</SelectItem>
                        <SelectItem value="festival">Contrato Festival</SelectItem>
                        <SelectItem value="international">Contrato Internacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <p className="font-medium">Variables que se incluirán:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Artista: [Nombre del artista]</li>
                      <li>• Evento: {booking.festival_ciclo || booking.venue || '-'}</li>
                      <li>• Promotor: {booking.promotor || '-'}</li>
                      <li>• Fee: {booking.fee ? `${booking.fee.toLocaleString()}€` : '-'}</li>
                      <li>• Fecha: {booking.fecha || '-'}</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleGenerateContract}>
                      Generar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-10 h-10 text-muted-foreground" />}
              title="Sin contratos"
              description="Genera un contrato desde una plantilla o sube uno existente"
            />
          ) : (
            <div className="space-y-3">
              {contracts.map((doc) => {
                const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={doc.status}
                        onValueChange={(value) => handleUpdateStatus(doc.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Borrador</SelectItem>
                          <SelectItem value="sent">Enviado</SelectItem>
                          <SelectItem value="signed">Firmado</SelectItem>
                        </SelectContent>
                      </Select>

                      {doc.file_url && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(doc.file_url)}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Anexos y Documentos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Riders, Press Kits, acreditaciones y otros archivos
            </p>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'other')}
                disabled={uploading}
              />
              <Button size="sm" variant="outline" asChild disabled={uploading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Subir Archivo'}
                </span>
              </Button>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {otherDocs.length === 0 ? (
            <EmptyState
              icon={<Upload className="w-10 h-10 text-muted-foreground" />}
              title="Sin documentos adicionales"
              description="Sube riders, acreditaciones, tickets de parking u otros archivos"
            />
          ) : (
            <div className="space-y-3">
              {otherDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
