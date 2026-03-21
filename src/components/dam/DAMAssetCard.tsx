import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Download, Share2, Trash2, Video, Image, FileText, ExternalLink } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from './DAMConstants';
import type { DAMAsset } from './DAMTypes';
import { cn } from '@/lib/utils';
import { getVideoThumbnail } from '@/lib/video-thumbnails';
import { Play } from 'lucide-react';

interface DAMAssetCardProps {
  asset: DAMAsset;
  onSelect: (asset: DAMAsset) => void;
  onDelete: (asset: DAMAsset) => void;
  viewMode: 'grid' | 'list';
}

export default function DAMAssetCard({ asset, onSelect, onDelete, viewMode }: DAMAssetCardProps) {
  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';
  const videoThumb = isVideo ? getVideoThumbnail(asset.external_url) : null;
  const statusLabel = STATUS_LABELS[asset.status || 'en_produccion'] || asset.status;
  const statusColor = STATUS_COLORS[asset.status || 'en_produccion'] || STATUS_COLORS.en_produccion;

  const isOverdue = asset.delivery_date && new Date(asset.delivery_date) < new Date() && asset.status !== 'publicado' && asset.status !== 'listo';

  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
        onClick={() => onSelect(asset)}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
          {isImage && asset.file_url ? (
            <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover" />
          ) : isVideo ? (
            <div className="w-full h-full flex items-center justify-center"><Video className="h-5 w-5 text-muted-foreground" /></div>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><FileText className="h-5 w-5 text-muted-foreground" /></div>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{asset.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {asset.sub_type && <span className="text-xs text-muted-foreground">{asset.sub_type}</span>}
            {asset.format_spec && <Badge variant="outline" className="text-[10px] h-4">{asset.format_spec}</Badge>}
          </div>
        </div>
        {/* Status */}
        <Badge className={cn('text-[10px] h-5', statusColor)}>{statusLabel}</Badge>
        {/* Overdue */}
        {isOverdue && <Badge variant="destructive" className="text-[10px] h-5">Vencido</Badge>}
        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); window.open(asset.file_url, '_blank'); }}>
              <Download className="h-3.5 w-3.5 mr-2" /> Descargar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(asset.file_url); }}>
              <Share2 className="h-3.5 w-3.5 mr-2" /> Copiar enlace
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(asset); }}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Grid view
  return (
    <Card
      className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
      onClick={() => onSelect(asset)}
    >
      <div className="aspect-square relative bg-muted">
        {isImage && asset.file_url ? (
          <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover" />
        ) : isVideo ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Video className="w-10 h-10 text-muted-foreground" />
            {asset.external_url && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                URL
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <div className="flex gap-1">
            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={e => { e.stopPropagation(); window.open(asset.file_url, '_blank'); }}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(asset.file_url); }}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="destructive" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(asset); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge className={cn('text-[10px]', statusColor)}>{statusLabel}</Badge>
          {isOverdue && <Badge variant="destructive" className="text-[10px]">Vencido</Badge>}
        </div>
        {asset.is_watermarked && (
          <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-background/80">WM</Badge>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-sm font-medium truncate">{asset.title}</p>
        <div className="flex items-center gap-1 flex-wrap">
          {asset.sub_type && <Badge variant="outline" className="text-[10px] h-4">{asset.sub_type}</Badge>}
          {asset.format_spec && <Badge variant="secondary" className="text-[10px] h-4">{asset.format_spec}</Badge>}
          {asset.resolution && <Badge variant="secondary" className="text-[10px] h-4">{asset.resolution}</Badge>}
        </div>
        {asset.platform_tags && asset.platform_tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {asset.platform_tags.map(p => (
              <span key={p} className="text-[10px] text-muted-foreground">{p}</span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
