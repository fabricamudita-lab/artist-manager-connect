import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, Link, ExternalLink, AlertCircle } from 'lucide-react';
import { useProjectShare } from '@/hooks/useProjectFiles';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function ProjectShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ProjectShareDialogProps) {
  const [expiresInDays, setExpiresInDays] = useState(7);
  
  const {
    shareInfo,
    isLoading,
    enableShare,
    disableShare,
    isEnabling,
    isDisabling,
    getPublicUrl,
    isShared,
  } = useProjectShare(projectId);

  const publicUrl = getPublicUrl();

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace público se ha copiado al portapapeles.',
      });
    }
  };

  const handleToggleShare = () => {
    if (isShared) {
      disableShare();
    } else {
      enableShare(expiresInDays);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Compartir Proyecto
          </DialogTitle>
          <DialogDescription>
            Genera un enlace público para compartir los archivos de "{projectName}" con externos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle share */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share-toggle" className="font-medium">
                Enlace público
              </Label>
              <p className="text-sm text-muted-foreground">
                Cualquiera con el enlace puede ver los archivos
              </p>
            </div>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggleShare}
              disabled={isEnabling || isDisabling}
            />
          </div>

          {/* Expiration selector (only when enabling) */}
          {!isShared && (
            <div className="space-y-2">
              <Label>Duración del enlace</Label>
              <div className="flex gap-2">
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    variant={expiresInDays === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpiresInDays(days)}
                  >
                    {days} días
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Public URL display */}
          {isShared && publicUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={publicUrl}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              {/* Expiration info */}
              {shareInfo?.public_share_expires_at && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Expira el{' '}
                    {format(new Date(shareInfo.public_share_expires_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isShared ? 'default' : 'secondary'}>
              {isShared ? 'Compartido' : 'Privado'}
            </Badge>
            {isShared && (
              <span className="text-xs text-muted-foreground">
                Los archivos son accesibles públicamente
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
