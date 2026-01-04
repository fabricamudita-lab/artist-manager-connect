import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Plus, CalendarDays } from 'lucide-react';

interface HeaderBlockData {
  artistName?: string;
  tourTitle?: string;
  localPromoter?: string;
  tourDates?: string[]; // Array of dates for the tour
}

interface BookingSuggestion {
  artistName?: string;
  tourTitle?: string;
  promoter?: string;
  eventDate?: string;
}

interface HeaderBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  bookingSuggestion?: BookingSuggestion;
}

export function HeaderBlock({ data, onChange, bookingSuggestion }: HeaderBlockProps) {
  const blockData = data as HeaderBlockData;
  
  // Local state for immediate UI updates
  const [localData, setLocalData] = useState<HeaderBlockData>({
    artistName: blockData.artistName || '',
    tourTitle: blockData.tourTitle || '',
    localPromoter: blockData.localPromoter || '',
    tourDates: blockData.tourDates || [],
  });

  const [newDate, setNewDate] = useState('');

  // Debounce the local data
  const debouncedData = useDebounce(localData, 500);

  // Sync from parent when data changes externally
  useEffect(() => {
    setLocalData({
      artistName: blockData.artistName || '',
      tourTitle: blockData.tourTitle || '',
      localPromoter: blockData.localPromoter || '',
      tourDates: blockData.tourDates || [],
    });
  }, [blockData.artistName, blockData.tourTitle, blockData.localPromoter, JSON.stringify(blockData.tourDates)]);

  // Auto-fill from booking suggestion if fields are empty
  useEffect(() => {
    if (bookingSuggestion) {
      const updates: Partial<HeaderBlockData> = {};
      let hasUpdates = false;

      if (!localData.artistName && bookingSuggestion.artistName) {
        updates.artistName = bookingSuggestion.artistName;
        hasUpdates = true;
      }
      if (!localData.tourTitle && bookingSuggestion.tourTitle) {
        updates.tourTitle = bookingSuggestion.tourTitle;
        hasUpdates = true;
      }
      if (!localData.localPromoter && bookingSuggestion.promoter) {
        updates.localPromoter = bookingSuggestion.promoter;
        hasUpdates = true;
      }
      if ((!localData.tourDates || localData.tourDates.length === 0) && bookingSuggestion.eventDate) {
        updates.tourDates = [bookingSuggestion.eventDate];
        hasUpdates = true;
      }

      if (hasUpdates) {
        setLocalData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [bookingSuggestion?.artistName, bookingSuggestion?.tourTitle, bookingSuggestion?.promoter, bookingSuggestion?.eventDate]);

  // Save to parent when debounced data changes
  useEffect(() => {
    const hasChanges = 
      debouncedData.artistName !== (blockData.artistName || '') ||
      debouncedData.tourTitle !== (blockData.tourTitle || '') ||
      debouncedData.localPromoter !== (blockData.localPromoter || '') ||
      JSON.stringify(debouncedData.tourDates) !== JSON.stringify(blockData.tourDates || []);
    
    if (hasChanges) {
      onChange({ ...data, ...debouncedData });
    }
  }, [debouncedData]);

  const handleChange = (field: keyof HeaderBlockData, value: string | string[]) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const addDate = () => {
    if (newDate && !localData.tourDates?.includes(newDate)) {
      const updatedDates = [...(localData.tourDates || []), newDate].sort();
      handleChange('tourDates', updatedDates);
      setNewDate('');
    }
  };

  const removeDate = (dateToRemove: string) => {
    const updatedDates = (localData.tourDates || []).filter(d => d !== dateToRemove);
    handleChange('tourDates', updatedDates);
  };

  const formatDateRange = () => {
    const dates = localData.tourDates || [];
    if (dates.length === 0) return 'Sin fechas';
    if (dates.length === 1) return format(new Date(dates[0]), 'd MMMM yyyy', { locale: es });
    
    const sortedDates = [...dates].sort();
    const firstDate = format(new Date(sortedDates[0]), 'd MMM', { locale: es });
    const lastDate = format(new Date(sortedDates[sortedDates.length - 1]), 'd MMMM yyyy', { locale: es });
    return `${firstDate} - ${lastDate} (${dates.length} días)`;
  };

  const hasSuggestion = (field: 'artistName' | 'tourTitle' | 'localPromoter') => {
    if (!bookingSuggestion) return false;
    const suggestionMap = {
      artistName: bookingSuggestion.artistName,
      tourTitle: bookingSuggestion.tourTitle,
      localPromoter: bookingSuggestion.promoter,
    };
    return !!suggestionMap[field] && !localData[field];
  };

  const applySuggestion = (field: 'artistName' | 'tourTitle' | 'localPromoter') => {
    if (!bookingSuggestion) return;
    const suggestionMap = {
      artistName: bookingSuggestion.artistName,
      tourTitle: bookingSuggestion.tourTitle,
      localPromoter: bookingSuggestion.promoter,
    };
    if (suggestionMap[field]) {
      handleChange(field, suggestionMap[field]!);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
      {bookingSuggestion && (
        <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 mb-4">
          💡 Los campos vacíos se rellenarán automáticamente con la información del evento vinculado
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Nombre del Artista</span>
            {hasSuggestion('artistName') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary"
                onClick={() => applySuggestion('artistName')}
              >
                Usar: {bookingSuggestion?.artistName}
              </Button>
            )}
          </Label>
          <Input
            value={localData.artistName}
            onChange={(e) => handleChange('artistName', e.target.value)}
            placeholder={bookingSuggestion?.artistName || "Ej: Bad Bunny"}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Título del Tour</span>
            {hasSuggestion('tourTitle') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary"
                onClick={() => applySuggestion('tourTitle')}
              >
                Usar: {bookingSuggestion?.tourTitle}
              </Button>
            )}
          </Label>
          <Input
            value={localData.tourTitle}
            onChange={(e) => handleChange('tourTitle', e.target.value)}
            placeholder={bookingSuggestion?.tourTitle || "Ej: World's Hottest Tour"}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Promotor Local</span>
            {hasSuggestion('localPromoter') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary"
                onClick={() => applySuggestion('localPromoter')}
              >
                Usar: {bookingSuggestion?.promoter}
              </Button>
            )}
          </Label>
          <Input
            value={localData.localPromoter}
            onChange={(e) => handleChange('localPromoter', e.target.value)}
            placeholder={bookingSuggestion?.promoter || "Ej: Live Nation España"}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Fechas del Tour
          </Label>
          <div className="space-y-2">
            {/* Current dates summary */}
            <div className="text-sm font-medium text-muted-foreground">
              {formatDateRange()}
            </div>
            
            {/* Date badges */}
            {localData.tourDates && localData.tourDates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {[...localData.tourDates].sort().map((date) => (
                  <Badge key={date} variant="secondary" className="gap-1 pr-1">
                    {format(new Date(date), 'd MMM', { locale: es })}
                    <button
                      onClick={() => removeDate(date)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new date */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addDate}
                disabled={!newDate}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Añadir
              </Button>
            </div>

            {bookingSuggestion?.eventDate && !localData.tourDates?.includes(bookingSuggestion.eventDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => {
                  const updatedDates = [...(localData.tourDates || []), bookingSuggestion.eventDate!].sort();
                  handleChange('tourDates', updatedDates);
                }}
              >
                + Añadir fecha del evento: {format(new Date(bookingSuggestion.eventDate), 'd MMM yyyy', { locale: es })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
