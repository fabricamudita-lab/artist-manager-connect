import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Upload,
  Download,
  Trash2,
  Send,
  Link as LinkIcon,
  CheckCircle,
  Edit3,
  Eye,
  MoreHorizontal,
  Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { ContractGenerator } from '@/components/ContractGenerator';
import jsPDF from 'jspdf';

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
    ciudad?: string;
    hora?: string;
    capacidad?: number;
    duracion?: string;
    contacto?: string;
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
  const [showContractGenerator, setShowContractGenerator] = useState(false);
  const [editingContract, setEditingContract] = useState<BookingDocument | null>(null);
  const [viewingContract, setViewingContract] = useState<BookingDocument | null>(null);
  const [contractContents, setContractContents] = useState<Record<string, string>>({});

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

      const fileExt = file.name.split('.').pop();
      const fileName = `${booking.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

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

  // Old handleContractSave removed - now using the new one defined below

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

  // Download contract as PDF
  const handleDownloadPDF = (doc: BookingDocument) => {
    const content = contractContents[doc.id];
    if (!content) {
      // If no generated content, just open the file URL
      if (doc.file_url && doc.file_url !== 'generated') {
        window.open(doc.file_url, '_blank');
      }
      return;
    }
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 5;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    
    const lines = pdf.splitTextToSize(content, maxWidth);
    let y = margin;
    
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      if (line.includes("═") || (line.length < 60 && line === line.toUpperCase() && line.trim().length > 0)) {
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setFont("helvetica", "normal");
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    
    pdf.save(doc.file_name.replace(/\.[^/.]+$/, '') + '.pdf');
    toast({ description: "PDF descargado correctamente" });
  };

  // View contract in a dialog
  const handleViewContract = (doc: BookingDocument) => {
    if (doc.file_url && doc.file_url !== 'generated') {
      window.open(doc.file_url, '_blank');
    } else {
      setViewingContract(doc);
    }
  };

  // Edit contract (only if not signed)
  const handleEditContract = (doc: BookingDocument) => {
    if (doc.status === 'signed') {
      toast({
        title: "No se puede editar",
        description: "Los contratos firmados no se pueden editar.",
        variant: "destructive",
      });
      return;
    }
    setEditingContract(doc);
    setShowContractGenerator(true);
  };

  // Save contract content when generated
  const handleContractSave = async (contract: { title: string; content: string }) => {
    try {
      if (editingContract) {
        // Update existing
        await (supabase as any)
          .from('booking_documents')
          .update({ file_name: contract.title + '.pdf' })
          .eq('id', editingContract.id);
        
        setContractContents(prev => ({ ...prev, [editingContract.id]: contract.content }));
        setEditingContract(null);
      } else {
        // Create new
        const { data, error } = await (supabase as any)
          .from('booking_documents')
          .insert({
            booking_id: booking.id,
            file_name: contract.title + '.pdf',
            file_url: 'generated',
            file_type: 'application/pdf',
            document_type: 'contract',
            status: 'draft',
            created_by: profile?.user_id,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setContractContents(prev => ({ ...prev, [data.id]: contract.content }));
        }
      }
      
      fetchDocuments();
      toast({ description: "Contrato guardado correctamente" });
    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el contrato.",
        variant: "destructive",
      });
    }
  };

  // Pre-fill contract data from booking
  const getBookingDataForContract = () => ({
    artista: '', // Will be filled by the contract generator or user
    ciudad: booking.ciudad || '',
    venue: booking.venue || '',
    fecha: booking.fecha || '',
    hora: booking.hora || '',
    fee: booking.fee || undefined,
    aforo: booking.capacidad || undefined,
    duracion: booking.duracion || '',
    promotor: booking.promotor || '',
    festival_ciclo: booking.festival_ciclo || '',
  });

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
      {/* Contract Generator Dialog */}
      <ContractGenerator
        open={showContractGenerator}
        onOpenChange={(open) => {
          setShowContractGenerator(open);
          if (!open) setEditingContract(null);
        }}
        bookingData={getBookingDataForContract()}
        onSave={handleContractSave}
      />

      {/* Contract Viewer Dialog */}
      <Dialog open={!!viewingContract} onOpenChange={(open) => !open && setViewingContract(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingContract?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {viewingContract && contractContents[viewingContract.id] 
                ? contractContents[viewingContract.id]
                : 'No hay contenido disponible para este contrato. Puede que haya sido subido externamente.'}
            </pre>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            {viewingContract && contractContents[viewingContract.id] && (
              <Button variant="outline" onClick={() => viewingContract && handleDownloadPDF(viewingContract)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewingContract(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <Button size="sm" onClick={() => setShowContractGenerator(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Generar Contrato
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileUpload(e, 'contract')}
                disabled={uploading}
              />
              <Button size="sm" variant="outline" asChild disabled={uploading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir
                </span>
              </Button>
            </label>
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
                const isGenerated = doc.file_url === 'generated';

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
                          {isGenerated && ' • Generado'}
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewContract(doc)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver contrato
                          </DropdownMenuItem>
                          {doc.status !== 'signed' && (
                            <DropdownMenuItem onClick={() => handleEditContract(doc)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar contrato
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDownloadPDF(doc)}>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </DropdownMenuItem>
                          {doc.file_url && doc.file_url !== 'generated' && (
                            <DropdownMenuItem onClick={() => handleCopyLink(doc.file_url)}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copiar enlace
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    {doc.file_url && doc.file_url !== 'generated' && (
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
