import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus, Camera, Trash2 } from 'lucide-react';
import { STAGE_LABELS, PHOTO_STAGES } from './DAMConstants';
import type { DAMAsset, PhotoSession } from './DAMTypes';
import DAMAssetCard from './DAMAssetCard';
import { cn } from '@/lib/utils';

interface PhotoSessionPipelineProps {
  session: PhotoSession;
  assets: DAMAsset[];
  viewMode: 'grid' | 'list';
  onSelectAsset: (asset: DAMAsset) => void;
  onDeleteAsset: (asset: DAMAsset) => void;
  onUploadToStage: (sessionId: string, stage: string) => void;
  onDeleteSession: (session: PhotoSession) => void;
}

export default function PhotoSessionPipeline({
  session,
  assets,
  viewMode,
  onSelectAsset,
  onDeleteAsset,
  onUploadToStage,
  onDeleteSession,
}: PhotoSessionPipelineProps) {
  const [expanded, setExpanded] = useState(false);

  const assetsByStage = PHOTO_STAGES.reduce((acc, stage) => {
    acc[stage] = assets.filter(a => a.stage === stage);
    return acc;
  }, {} as Record<string, DAMAsset[]>);

  return (
    <Card className="border-dashed">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{session.name}</span>
          {session.photographer && <span className="text-xs text-muted-foreground">por {session.photographer}</span>}
          <Badge variant="outline" className="text-[10px]">{assets.length} archivos</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDeleteSession(session); }}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          {/* Pipeline visualization */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {PHOTO_STAGES.map((stage, idx) => (
              <div key={stage} className="flex items-center">
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors border',
                    assetsByStage[stage].length > 0
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  )}
                  onClick={() => onUploadToStage(session.id, stage)}
                >
                  {STAGE_LABELS[stage]}
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4">{assetsByStage[stage].length}</Badge>
                </div>
                {idx < PHOTO_STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Assets for each stage */}
          {PHOTO_STAGES.map(stage => {
            const stageAssets = assetsByStage[stage];
            if (stageAssets.length === 0) return null;
            return (
              <div key={stage} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{STAGE_LABELS[stage]}</h5>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => onUploadToStage(session.id, stage)}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir
                  </Button>
                </div>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {stageAssets.map(a => (
                      <DAMAssetCard key={a.id} asset={a} onSelect={onSelectAsset} onDelete={onDeleteAsset} viewMode="grid" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {stageAssets.map(a => (
                      <DAMAssetCard key={a.id} asset={a} onSelect={onSelectAsset} onDelete={onDeleteAsset} viewMode="list" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {assets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin fotos. Haz clic en una etapa del pipeline para subir archivos.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
