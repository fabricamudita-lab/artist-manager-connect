import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HeaderBlockData {
  artistName?: string;
  tourTitle?: string;
  localPromoter?: string;
  globalDates?: string;
}

interface HeaderBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function HeaderBlock({ data, onChange }: HeaderBlockProps) {
  const blockData = data as HeaderBlockData;

  const handleChange = (field: keyof HeaderBlockData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre del Artista</Label>
          <Input
            value={blockData.artistName || ''}
            onChange={(e) => handleChange('artistName', e.target.value)}
            placeholder="Ej: Bad Bunny"
          />
        </div>
        <div className="space-y-2">
          <Label>Título del Tour</Label>
          <Input
            value={blockData.tourTitle || ''}
            onChange={(e) => handleChange('tourTitle', e.target.value)}
            placeholder="Ej: World's Hottest Tour"
          />
        </div>
        <div className="space-y-2">
          <Label>Promotor Local</Label>
          <Input
            value={blockData.localPromoter || ''}
            onChange={(e) => handleChange('localPromoter', e.target.value)}
            placeholder="Ej: Live Nation España"
          />
        </div>
        <div className="space-y-2">
          <Label>Fechas Globales</Label>
          <Input
            value={blockData.globalDates || ''}
            onChange={(e) => handleChange('globalDates', e.target.value)}
            placeholder="Ej: 15 Junio - 30 Agosto 2026"
          />
        </div>
      </div>
    </div>
  );
}
