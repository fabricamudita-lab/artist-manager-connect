import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Link, FileText, Upload, Download, Image, FileBarChart, FileSignature, Clock, Share2, Copy, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useBookingFolders } from '@/hooks/useBookingFolders';
import CreateBudgetDialog from './CreateBudgetDialog';
import { useAuth } from '@/hooks/useAuth';

interface BookingOffer {
  id: string;
  fecha?: string;
  ciudad?: string;
  festival_ciclo?: string;
  lugar?: string;
  formato?: string;
  estado?: string;
  capacidad?: number;
  oferta?: string;
  contacto?: string;
}

interface EventFile {
  name: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  subfolder?: string;
}

interface EventFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: BookingOffer | null;
}

export function EventFolderDialog({ open, onOpenChange, offer }: EventFolderDialogProps) {
  const { profile } = useAuth();
  const { generateFolderName, generateSendingsShareLink, checkContractExists } = useBookingFolders();
  const [loading, setLoading] = useState(false);
  const [folderContents, setFolderContents] = useState<Record<string, EventFile[]>>({});
  const [showCreateBudgetDialog, setShowCreateBudgetDialog] = useState(false);
  const [recentFiles, setRecentFiles] = useState<EventFile[]>([]);
  const [sendingsShareLink, setSendingsShareLink] = useState<string | null>(null);
  const [hasContract, setHasContract] = useState(false);

  const subfolders = ['Assets', 'Facturas', 'Contrato', 'Agente IA'];

  useEffect(() => {
    if (open && offer) {
      loadFolderContents();
      checkContractStatus();
    }
  }, [open, offer]);

  const loadFolderContents = async () => {
    if (!offer) return;

    setLoading(true);
    try {
      const folderName = generateFolderName(offer);
      const contents: Record<string, EventFile[]> = {};

      // Load contents for each subfolder
      for (const subfolder of subfolders) {
        const { data, error } = await supabase.storage
          .from('documents')
          .list(`events/${folderName}/${subfolder}`, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          console.error(`Error loading ${subfolder}:`, error);
          contents[subfolder] = [];
        } else {
          // Filter out .keep files
          contents[subfolder] = (data || []).filter(file => file.name !== '.keep');
        }
      }

      setFolderContents(contents);
      
      // Collect all files for recent files panel
      const allFiles: EventFile[] = [];
      Object.entries(contents).forEach(([subfolder, files]) => {
        files.forEach(file => {
          allFiles.push({ ...file, subfolder });
        });
      });
      
      // Sort by creation date and take the 10 most recent
      const sortedFiles = allFiles
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      setRecentFiles(sortedFiles);
    } catch (error) {
      console.error('Error loading folder contents:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el contenido de la carpeta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkContractStatus = async () => {
    if (!offer) return;
    
    try {
      const contractExists = await checkContractExists(offer);
      setHasContract(contractExists);
    } catch (error) {
      console.error('Error checking contract status:', error);
    }
  };

  const handleFileUpload = async (subfolder: string, file: File) => {
    if (!offer) return;

    // Contract replacement confirmation
    if (subfolder === 'Contrato' && hasContract) {
      const confirm = window.confirm('Ya existe un contrato en esta carpeta. ¿Deseas reemplazarlo?');
      if (!confirm) return;
    }

    setLoading(true);
    try {
      const folderName = generateFolderName(offer);
      const filePath = `events/${folderName}/${subfolder}/${file.name}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Archivo subido",
        description: `${file.name} se ha subido a ${subfolder}.`,
      });

      loadFolderContents();
      
      // Update contract field if uploading to Contrato folder
      if (subfolder === 'Contrato') {
        await updateBookingContract(file.name);
        await checkContractStatus();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpload = async (subfolder: string, enableDragDrop = false) => {
    if (!offer) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // Allow any file type for Assets, Facturas, and Contrato
    if (['Assets', 'Facturas', 'Contrato'].includes(subfolder)) {
      input.accept = '*/*';
    }
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (const file of Array.from(files)) {
          await handleFileUpload(subfolder, file);
        }
      }
    };
    input.click();
  };

  const updateBookingContract = async (fileName: string) => {
    if (!offer) return;

    try {
      const folderName = generateFolderName(offer);
      const fileUrl = `events/${folderName}/Contrato/${fileName}`;
      
      const { error } = await supabase
        .from('booking_offers')
        .update({ contratos: fileUrl })
        .eq('id', offer.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Contrato vinculado",
        description: "El enlace del contrato se ha actualizado en la oferta de booking.",
      });
    } catch (error) {
      console.error('Error updating booking contract:', error);
      toast({
        title: "Error",
        description: "No se pudo vincular el contrato a la oferta.",
        variant: "destructive",
      });
    }
  };

  const handleCreateBudget = () => {
    // Validate required fields
    if (!offer?.fecha || !offer?.ciudad) {
      toast({
        title: "Error de validación",
        description: "La fecha y la ciudad son requeridos para crear un presupuesto.",
        variant: "destructive",
      });
      return;
    }
    setShowCreateBudgetDialog(true);
  };

  const handleLinkBudget = () => {
    // Validate required fields
    if (!offer?.fecha || !offer?.ciudad) {
      toast({
        title: "Error de validación",
        description: "La fecha y la ciudad son requeridos para vincular un presupuesto.",
        variant: "destructive",
      });
      return;
    }
    handleQuickUpload('Agente IA');
  };

  const handleShareSendings = async () => {
    if (!offer) return;

    try {
      const shareLink = await generateSendingsShareLink(offer);
      if (shareLink) {
        setSendingsShareLink(shareLink);
        await navigator.clipboard.writeText(shareLink);
        toast({
          title: "Enlace copiado",
          description: "El enlace de la carpeta Sendings se ha copiado al portapapeles.",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo generar el enlace compartible.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sharing sendings:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace compartible.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAccess = () => {
    setSendingsShareLink(null);
    toast({
      title: "Acceso revocado",
      description: "El enlace compartible ha sido revocado.",
    });
  };

  const handleBudgetCreated = () => {
    // When budget is created, we could potentially create a link or reference in the folder
    toast({
      title: "Presupuesto creado",
      description: "El presupuesto se ha creado y vinculado al evento.",
    });
    setShowCreateBudgetDialog(false);
    loadFolderContents();
  };

  const downloadFile = async (subfolder: string, fileName: string) => {
    if (!offer) return;

    try {
      const folderName = generateFolderName(offer);
      const filePath = `events/${folderName}/${subfolder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="h-4 w-4 text-blue-500" />;
      case 'pdf':
        return <FileSignature className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileBarChart className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!offer) return null;

  const folderName = generateFolderName(offer);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carpeta del Evento</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {folderName}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Contract Warning for Confirmed Events */}
              {offer.estado === 'confirmado' && !hasContract && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aviso:</strong> Este evento está confirmado pero no tiene contrato subido en la carpeta /Contrato.
                  </AlertDescription>
                </Alert>
              )}

              {/* Event Info */}
              <Card className="card-moodita">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold tracking-tight text-gradient-primary">
                    Información del Evento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Información principal del evento */}
                  <div className="bg-gradient-card rounded-xl p-6 space-y-4">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Fecha:</span>
                        <span className="text-sm font-semibold text-foreground">
                          {offer.fecha ? new Date(offer.fecha).toLocaleDateString('es-ES') : '-'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Ciudad:</span>
                        <span className="text-sm font-semibold text-foreground">{offer.ciudad || '-'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Lugar:</span>
                        <span className="text-sm font-semibold text-foreground">{offer.lugar || '-'}</span>
                      </div>
                      
                      {offer.festival_ciclo && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Festival/Ciclo:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.festival_ciclo}</span>
                        </div>
                      )}
                      
                      {offer.formato && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Formato:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.formato}</span>
                        </div>
                      )}
                      
                      {offer.capacidad && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Capacidad:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.capacidad.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {offer.oferta && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">Oferta:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.oferta}</span>
                        </div>
                      )}
                      
                      {offer.contacto && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-muted-foreground">Contacto:</span>
                          <span className="text-sm font-semibold text-foreground">{offer.contacto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Estado en sección separada */}
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                      <Badge 
                        variant="outline" 
                        className="bg-primary/10 text-primary border-primary/20 font-medium rounded-full px-3 py-1"
                      >
                        {offer.estado || 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      onClick={() => handleQuickUpload('Assets')}
                      variant="outline"
                      className="flex items-center gap-2 h-auto p-4 flex-col"
                    >
                      <Image className="h-5 w-5" />
                      <span className="text-sm">Subir Asset</span>
                    </Button>
                    <Button
                      onClick={() => handleQuickUpload('Facturas')}
                      variant="outline"
                      className="flex items-center gap-2 h-auto p-4 flex-col"
                    >
                      <FileBarChart className="h-5 w-5" />
                      <span className="text-sm">Subir Factura</span>
                    </Button>
                    <Button
                      onClick={() => handleQuickUpload('Contrato')}
                      variant="outline"
                      className="flex items-center gap-2 h-auto p-4 flex-col"
                    >
                      <FileSignature className="h-5 w-5" />
                      <span className="text-sm">Subir Contrato</span>
                    </Button>
                    <Button
                      onClick={handleCreateBudget}
                      variant="outline"
                      className="flex items-center gap-2 h-auto p-4 flex-col"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-sm">Agente IA</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Agent Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agente IA</CardTitle>
                </CardHeader>
                <CardContent>
                  {(!offer.fecha || !offer.ciudad) && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Se requiere fecha y ciudad para crear o vincular presupuestos.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateBudget}
                      className="flex items-center gap-2"
                      disabled={!offer.fecha || !offer.ciudad}
                    >
                      <Plus className="h-4 w-4" />
                      Crear presupuesto
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleLinkBudget}
                      className="flex items-center gap-2"
                      disabled={!offer.fecha || !offer.ciudad}
                    >
                      <Link className="h-4 w-4" />
                      Vincular presupuesto
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Subfolders */}
              <div className="grid gap-4">
                {subfolders.map((subfolder) => (
                  <Card key={subfolder}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{subfolder}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {folderContents[subfolder]?.length || 0} archivos
                          </Badge>
                           <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              // Allow any file type for upload folders
                              if (['Assets', 'Facturas', 'Contrato'].includes(subfolder)) {
                                input.accept = '*/*';
                              }
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement).files;
                                if (files) {
                                  Array.from(files).forEach(file => {
                                    handleFileUpload(subfolder, file);
                                  });
                                }
                              };
                              input.click();
                            }}
                            className="flex items-center gap-1"
                          >
                            <Upload className="h-3 w-3" />
                            Subir
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-sm text-muted-foreground">Cargando...</div>
                      ) : folderContents[subfolder]?.length > 0 ? (
                        <div className="space-y-2">
                          {folderContents[subfolder].map((file) => (
                            <div
                              key={file.name}
                              className="flex items-center justify-between p-2 rounded border"
                            >
                              <div className="flex items-center gap-2">
                                {getFileIcon(file.name)}
                                <span className="text-sm">{file.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(file.created_at).toLocaleDateString('es-ES')}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadFile(subfolder, file.name)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="min-h-[100px] border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center text-center p-4 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-primary');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary');
                            const files = e.dataTransfer.files;
                            if (files && ['Assets', 'Facturas', 'Contrato'].includes(subfolder)) {
                              Array.from(files).forEach(file => {
                                handleFileUpload(subfolder, file);
                              });
                            }
                          }}
                          onClick={() => {
                            if (['Assets', 'Facturas', 'Contrato'].includes(subfolder)) {
                              handleQuickUpload(subfolder);
                            }
                          }}
                        >
                          <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <div className="text-sm text-muted-foreground">
                            {['Assets', 'Facturas', 'Contrato'].includes(subfolder) ? (
                              <>
                                <div>Arrastra archivos aquí o haz clic para subir</div>
                                <div className="text-xs mt-1">Cualquier tipo de archivo: psd, ai, indd, sketch, fig, ttf, otf, zip, rar, 7z, wav, aiff, mp3, mov, mp4, pdf, doc, docx, xls, xlsx, csv, jpg, png, webp, svg, etc.</div>
                              </>
                            ) : (
                              'No hay archivos en esta carpeta'
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar - Recent Files */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Últimos Archivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Cargando...</div>
                  ) : recentFiles.length > 0 ? (
                    <div className="space-y-3">
                      {recentFiles.map((file, index) => (
                        <div key={`${file.subfolder}-${file.name}-${index}`} className="space-y-1">
                          <div className="flex items-start gap-2">
                            {getFileIcon(file.name)}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {file.subfolder}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(file.created_at).toLocaleDateString('es-ES')}
                              </div>
                            </div>
                          </div>
                          {index < recentFiles.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No hay archivos recientes
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {offer && profile && (
        <CreateBudgetDialog
          open={showCreateBudgetDialog}
          onOpenChange={setShowCreateBudgetDialog}
          onSuccess={handleBudgetCreated}
        />
      )}
    </>
  );
}
