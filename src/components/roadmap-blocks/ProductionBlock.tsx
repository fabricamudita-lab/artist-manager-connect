import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Guitar, Music, Drum, Piano } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';

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
  { value: 'guitar', label: 'Guitarra', icon: Guitar },
  { value: 'bass', label: 'Bajo', icon: Guitar },
  { value: 'drums', label: 'Batería', icon: Drum },
  { value: 'keys', label: 'Teclados', icon: Piano },
  { value: 'other', label: 'Varios', icon: Music },
];

const getCategoryConfig = (cat: string) => categories.find(c => c.value === cat) || categories[categories.length - 1];

export function ProductionBlock({ data, onChange }: ProductionBlockProps) {
  const blockData = data as ProductionBlockData;
  const incomingVenues = blockData.venues || [];

  const [localVenues, setLocalVenues] = useState<VenueBackline[]>(incomingVenues);
  const [editingVenue, setEditingVenue] = useState<VenueBackline | null>(null);
  const [editingItem, setEditingItem] = useState<{ venueId: string; item: BacklineItem } | null>(null);
  
  const lastSyncedRef = useRef<string>(JSON.stringify(incomingVenues));
  const debouncedVenues = useDebounce(localVenues, 500);

  useEffect(() => {
    const next = JSON.stringify(incomingVenues);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalVenues(incomingVenues);
    }
  }, [incomingVenues]);

  useEffect(() => {
    const next = JSON.stringify(debouncedVenues);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, venues: debouncedVenues });
    }
  }, [debouncedVenues]);

  const addVenue = () => {
    const newVenue: VenueBackline = { id: crypto.randomUUID(), venueName: '', items: [] };
    setEditingVenue(newVenue);
  };

  const saveVenue = () => {
    if (!editingVenue) return;
    setLocalVenues((prev) => {
      const idx = prev.findIndex(v => v.id === editingVenue.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = editingVenue; return u; }
      return [...prev, editingVenue];
    });
    setEditingVenue(null);
  };

  const removeVenue = (id: string) => setLocalVenues((prev) => prev.filter((v) => v.id !== id));

  const addItem = (venueId: string) => {
    const newItem: BacklineItem = { id: crypto.randomUUID(), category: 'guitar', instrument: '', model: '', provider: '', confirmed: false };
    setEditingItem({ venueId, item: newItem });
  };

  const saveItem = () => {
    if (!editingItem) return;
    const { venueId, item } = editingItem;
    setLocalVenues((prev) => prev.map((v) => {
      if (v.id !== venueId) return v;
      const idx = v.items.findIndex(i => i.id === item.id);
      if (idx >= 0) { const items = [...v.items]; items[idx] = item; return { ...v, items }; }
      return { ...v, items: [...v.items, item] };
    }));
    setEditingItem(null);
  };

  const removeItem = (venueId: string, itemId: string) => {
    setLocalVenues((prev) => prev.map((v) => v.id === venueId ? { ...v, items: v.items.filter(i => i.id !== itemId) } : v));
  };

  return (
    <div className="space-y-4">
      {localVenues.length > 0 ? (
        <div className="space-y-4">
          {localVenues.map((venue) => (
            <Card key={venue.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{venue.venueName || 'Sin nombre'}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVenue({ ...venue })}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVenue(venue.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {venue.items.map((item) => {
                  const cat = getCategoryConfig(item.category);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/30 group/item">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="gap-1"><cat.icon className="w-3 h-3" />{cat.label}</Badge>
                        <span className="font-medium">{item.instrument}</span>
                        {item.model && <span className="text-sm text-muted-foreground">({item.model})</span>}
                        {item.confirmed && <Badge variant="secondary" className="text-xs">✓ Confirmado</Badge>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingItem({ venueId: venue.id, item: { ...item } })}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(venue.id, item.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  );
                })}
                <Button variant="ghost" size="sm" className="gap-1 mt-2" onClick={() => addItem(venue.id)}><Plus className="w-3 h-3" />Añadir Item</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">No hay venues configurados</div>
      )}
      <Button onClick={addVenue} variant="outline" className="gap-2"><Plus className="w-4 h-4" />Añadir Venue/Ciudad</Button>

      <Dialog open={!!editingVenue} onOpenChange={(o) => !o && setEditingVenue(null)}>
        <DialogContent><DialogHeader><DialogTitle>{editingVenue && localVenues.some(v => v.id === editingVenue.id) ? 'Editar Venue' : 'Nuevo Venue'}</DialogTitle></DialogHeader>
          {editingVenue && <div className="py-4 space-y-4"><div className="space-y-2"><Label>Nombre</Label><Input value={editingVenue.venueName} onChange={(e) => setEditingVenue({ ...editingVenue, venueName: e.target.value })} placeholder="Venue o ciudad" /></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditingVenue(null)}>Cancelar</Button><Button onClick={saveVenue}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Backline Item</DialogTitle></DialogHeader>
          {editingItem && <div className="py-4 space-y-4">
            <div className="space-y-2"><Label>Categoría</Label><Select value={editingItem.item.category} onValueChange={(v) => setEditingItem({ ...editingItem, item: { ...editingItem.item, category: v } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Instrumento</Label><Input value={editingItem.item.instrument} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, instrument: e.target.value } })} placeholder="Ej: Guitarra acústica" /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input value={editingItem.item.model} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, model: e.target.value } })} placeholder="Ej: Taylor 814ce" /></div>
            <div className="space-y-2"><Label>Proveedor</Label><Input value={editingItem.item.provider} onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, provider: e.target.value } })} placeholder="Empresa de backline" /></div>
            <div className="flex items-center gap-2"><Checkbox checked={editingItem.item.confirmed} onCheckedChange={(c) => setEditingItem({ ...editingItem, item: { ...editingItem.item, confirmed: !!c } })} /><Label>Confirmado</Label></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button><Button onClick={saveItem}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
