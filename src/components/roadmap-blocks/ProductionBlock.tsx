import { Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface BacklineItem {
  id: string;
  category: string;
  instrument: string;
  model: string;
  provider: string;
  confirmed: boolean;
}

interface VenueBackline {
  id: string;
  venueName: string;
  items: BacklineItem[];
}

interface ProductionBlockData {
  venues?: VenueBackline[];
}

interface ProductionBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

const categories = [
  { value: 'guitar', label: 'Guitarra' },
  { value: 'bass', label: 'Bajo' },
  { value: 'drums', label: 'Batería' },
  { value: 'keys', label: 'Teclados' },
  { value: 'other', label: 'Varios' },
];

export function ProductionBlock({ data, onChange }: ProductionBlockProps) {
  const blockData = data as ProductionBlockData;
  const venues = blockData.venues || [];

  const addVenue = () => {
    const newVenue: VenueBackline = {
      id: crypto.randomUUID(),
      venueName: '',
      items: [],
    };
    onChange({ ...data, venues: [...venues, newVenue] });
  };

  const updateVenue = (venueId: string, updates: Partial<VenueBackline>) => {
    const newVenues = venues.map((v) => (v.id === venueId ? { ...v, ...updates } : v));
    onChange({ ...data, venues: newVenues });
  };

  const removeVenue = (venueId: string) => {
    onChange({ ...data, venues: venues.filter((v) => v.id !== venueId) });
  };

  const addItem = (venueId: string) => {
    const newItem: BacklineItem = {
      id: crypto.randomUUID(),
      category: 'guitar',
      instrument: '',
      model: '',
      provider: '',
      confirmed: false,
    };
    const newVenues = venues.map((v) =>
      v.id === venueId ? { ...v, items: [...v.items, newItem] } : v
    );
    onChange({ ...data, venues: newVenues });
  };

  const updateItem = (venueId: string, itemId: string, updates: Partial<BacklineItem>) => {
    const newVenues = venues.map((v) =>
      v.id === venueId
        ? { ...v, items: v.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) }
        : v
    );
    onChange({ ...data, venues: newVenues });
  };

  const removeItem = (venueId: string, itemId: string) => {
    const newVenues = venues.map((v) =>
      v.id === venueId ? { ...v, items: v.items.filter((i) => i.id !== itemId) } : v
    );
    onChange({ ...data, venues: newVenues });
  };

  return (
    <div className="space-y-4">
      {venues.length > 0 ? (
        <Accordion type="multiple" className="space-y-2">
          {venues.map((venue) => (
            <AccordionItem key={venue.id} value={venue.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={venue.venueName}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateVenue(venue.id, { venueName: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Nombre del venue/ciudad"
                    className="max-w-xs"
                  />
                  <span className="text-sm text-muted-foreground">
                    ({venue.items.length} items)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVenue(venue.id);
                  }}
                  className="text-destructive hover:text-destructive mr-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-4">
                {venue.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-6 gap-2 items-center">
                    <Select
                      value={item.category}
                      onValueChange={(val) => updateItem(venue.id, item.id, { category: val })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={item.instrument}
                      onChange={(e) => updateItem(venue.id, item.id, { instrument: e.target.value })}
                      placeholder="Instrumento"
                      className="h-8"
                    />
                    <Input
                      value={item.model}
                      onChange={(e) => updateItem(venue.id, item.id, { model: e.target.value })}
                      placeholder="Modelo específico"
                      className="h-8 col-span-2"
                    />
                    <Input
                      value={item.provider}
                      onChange={(e) => updateItem(venue.id, item.id, { provider: e.target.value })}
                      placeholder="Proveedor"
                      className="h-8"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={item.confirmed}
                        onCheckedChange={(checked) =>
                          updateItem(venue.id, item.id, { confirmed: !!checked })
                        }
                      />
                      <Label className="text-xs">Confirmado</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(venue.id, item.id)}
                        className="h-6 w-6 text-destructive hover:text-destructive ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => addItem(venue.id)}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Añadir Item
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
          No hay venues configurados
        </p>
      )}
      <Button onClick={addVenue} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        Añadir Venue/Ciudad
      </Button>
    </div>
  );
}
