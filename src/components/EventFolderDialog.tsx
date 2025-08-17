import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Link, FileText, Upload, Download } from 'lucide-react';
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
}

interface EventFile {
  name: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

interface EventFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: BookingOffer | null;
}

export function EventFolderDialog({ open, onOpenChange, offer }: EventFolderDialogProps) {
  const { profile } = useAuth();
  const { generateFolderName } = useBookingFolders();
  const [loading, setLoading] = useState(false);
  const [folderContents, setFolderContents] = useState<Record<string, EventFile[]>>({});
  const [showCreateBudgetDialog, setShowCreateBudgetDialog] = useState(false);

  const subfolders = ['Assets', 'Facturas', 'Presupuesto', 'Contrato', 'Sendings'];

  useEffect(() => {
    if (open && offer) {
      loadFolderContents();
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

  const handleFileUpload = async (subfolder: string, file: File) => {
    if (!offer) return;

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

  const handleCreateBudget = () => {
    setShowCreateBudgetDialog(true);
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

  if (!offer) return null;

  const folderName = generateFolderName(offer);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carpeta del Evento</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {folderName}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Fecha:</span>
                    <div>{offer.fecha ? new Date(offer.fecha).toLocaleDateString('es-ES') : '-'}</div>
                  </div>
                  <div>
                    <span className="font-medium">Ciudad:</span>
                    <div>{offer.ciudad || '-'}</div>
                  </div>
                  <div>
                    <span className="font-medium">Lugar:</span>
                    <div>{offer.lugar || '-'}</div>
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>
                    <Badge variant="outline">{offer.estado || 'Pendiente'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gestión de Presupuesto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateBudget}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear presupuesto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleFileUpload('Presupuesto', file);
                        }
                      };
                      input.click();
                    }}
                    className="flex items-center gap-2"
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
                              <FileText className="h-4 w-4 text-muted-foreground" />
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
                      <div className="text-sm text-muted-foreground">
                        No hay archivos en esta carpeta
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
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
