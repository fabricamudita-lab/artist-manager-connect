import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';

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
  
  // Local state for immediate UI updates
  const [localData, setLocalData] = useState<HeaderBlockData>({
    artistName: blockData.artistName || '',
    tourTitle: blockData.tourTitle || '',
    localPromoter: blockData.localPromoter || '',
    globalDates: blockData.globalDates || '',
  });

  // Debounce the local data
  const debouncedData = useDebounce(localData, 500);

  // Sync from parent when data changes externally
  useEffect(() => {
    setLocalData({
      artistName: blockData.artistName || '',
      tourTitle: blockData.tourTitle || '',
      localPromoter: blockData.localPromoter || '',
      globalDates: blockData.globalDates || '',
    });
  }, [blockData.artistName, blockData.tourTitle, blockData.localPromoter, blockData.globalDates]);

  // Save to parent when debounced data changes
  useEffect(() => {
    const hasChanges = 
      debouncedData.artistName !== (blockData.artistName || '') ||
      debouncedData.tourTitle !== (blockData.tourTitle || '') ||
      debouncedData.localPromoter !== (blockData.localPromoter || '') ||
      debouncedData.globalDates !== (blockData.globalDates || '');
    
    if (hasChanges) {
      onChange({ ...data, ...debouncedData });
    }
  }, [debouncedData]);

  const handleChange = (field: keyof HeaderBlockData, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre del Artista</Label>
          <Input
            value={localData.artistName}
            onChange={(e) => handleChange('artistName', e.target.value)}
            placeholder="Ej: Bad Bunny"
          />
        </div>
        <div className="space-y-2">
          <Label>Título del Tour</Label>
          <Input
            value={localData.tourTitle}
            onChange={(e) => handleChange('tourTitle', e.target.value)}
            placeholder="Ej: World's Hottest Tour"
          />
        </div>
        <div className="space-y-2">
          <Label>Promotor Local</Label>
          <Input
            value={localData.localPromoter}
            onChange={(e) => handleChange('localPromoter', e.target.value)}
            placeholder="Ej: Live Nation España"
          />
        </div>
        <div className="space-y-2">
          <Label>Fechas Globales</Label>
          <Input
            value={localData.globalDates}
            onChange={(e) => handleChange('globalDates', e.target.value)}
            placeholder="Ej: 15 Junio - 30 Agosto 2026"
          />
        </div>
      </div>
    </div>
  );
}
