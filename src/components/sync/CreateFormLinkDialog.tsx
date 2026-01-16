import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Copy, ExternalLink, Loader2, Link as LinkIcon } from 'lucide-react';

interface CreateFormLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFormLinkDialog({ open, onOpenChange }: CreateFormLinkDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  
  const [title, setTitle] = useState('Solicitud de Sincronización');
  const [description, setDescription] = useState('Completa este formulario para solicitar una licencia de sincronización.');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);
  const [hasMaxUses, setHasMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState(10);

  const handleCreate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const expiresAt = hasExpiration 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      const { data, error } = await supabase
        .from('sync_form_links')
        .insert({
          created_by: user.id,
          title: title || null,
          description: description || null,
          expires_at: expiresAt,
          max_uses: hasMaxUses ? maxUses : null,
        })
        .select('token')
        .single();

      if (error) throw error;
      
      const formUrl = `${window.location.origin}/sync-request/${data.token}`;
      setCreatedLink(formUrl);
      
      toast({
        title: "Enlace creado",
        description: "El formulario público está listo para compartir.",
      });
    } catch (error) {
      console.error('Error creating form link:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el enlace del formulario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink);
      toast({
        title: "Enlace copiado",
        description: "El enlace se ha copiado al portapapeles.",
      });
    }
  };

  const openInNewTab = () => {
    if (createdLink) {
      window.open(createdLink, '_blank');
    }
  };

  const handleClose = () => {
    setCreatedLink(null);
    setTitle('Solicitud de Sincronización');
    setDescription('Completa este formulario para solicitar una licencia de sincronización.');
    setHasExpiration(false);
    setExpirationDays(30);
    setHasMaxUses(false);
    setMaxUses(10);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Crear Formulario Público
          </DialogTitle>
          <DialogDescription>
            Genera un enlace para que personas externas puedan enviar solicitudes de sincronización.
          </DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm font-medium text-success mb-2">¡Enlace creado exitosamente!</p>
              <div className="flex items-center gap-2">
                <Input
                  value={createdLink}
                  readOnly
                  className="text-xs"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={copyToClipboard} className="flex-1 gap-2">
                <Copy className="h-4 w-4" />
                Copiar Enlace
              </Button>
              <Button onClick={openInNewTab} variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título del Formulario</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título que verán los solicitantes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instrucciones o contexto para el formulario"
                  rows={2}
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiration">Fecha de Expiración</Label>
                    <p className="text-xs text-muted-foreground">
                      El enlace dejará de funcionar después de este tiempo
                    </p>
                  </div>
                  <Switch
                    id="expiration"
                    checked={hasExpiration}
                    onCheckedChange={setHasExpiration}
                  />
                </div>
                {hasExpiration && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input
                      type="number"
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(parseInt(e.target.value) || 1)}
                      min={1}
                      max={365}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="max-uses">Límite de Respuestas</Label>
                    <p className="text-xs text-muted-foreground">
                      Número máximo de solicitudes permitidas
                    </p>
                  </div>
                  <Switch
                    id="max-uses"
                    checked={hasMaxUses}
                    onCheckedChange={setHasMaxUses}
                  />
                </div>
                {hasMaxUses && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                      min={1}
                      max={1000}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">respuestas</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Crear Enlace
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
