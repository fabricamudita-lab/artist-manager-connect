import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Phone, Mail, MapPin, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  origin: string;
}

interface ContactsBlockData {
  contacts?: Contact[];
}

interface ContactsBlockProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function ContactsBlock({ data, onChange }: ContactsBlockProps) {
  const blockData = data as ContactsBlockData;
  const incomingContacts = blockData.contacts || [];

  const [localContacts, setLocalContacts] = useState<Contact[]>(incomingContacts);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  const lastSyncedRef = useRef<string>(JSON.stringify(incomingContacts));
  const debouncedContacts = useDebounce(localContacts, 500);

  useEffect(() => {
    const next = JSON.stringify(incomingContacts);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalContacts(incomingContacts);
    }
  }, [incomingContacts]);

  useEffect(() => {
    const next = JSON.stringify(debouncedContacts);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, contacts: debouncedContacts });
    }
  }, [debouncedContacts]);

  const addContact = () => {
    const newContact: Contact = { id: crypto.randomUUID(), name: '', role: '', phone: '', email: '', origin: '' };
    setEditingContact(newContact);
  };

  const saveContact = () => {
    if (!editingContact) return;
    setLocalContacts((prev) => {
      const idx = prev.findIndex(c => c.id === editingContact.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = editingContact; return u; }
      return [...prev, editingContact];
    });
    setEditingContact(null);
  };

  const removeContact = (id: string) => setLocalContacts((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="space-y-4">
      {localContacts.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 p-3 bg-muted/50 font-medium text-sm">
            <div>NOMBRE</div>
            <div>ROL</div>
            <div>CONTACTO</div>
            <div></div>
          </div>
          <div className="divide-y">
            {localContacts.map((contact) => (
              <div key={contact.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 p-3 items-center hover:bg-muted/30 group">
                <div>
                  <span className="font-medium">{contact.name || '—'}</span>
                  {contact.origin && <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1 inline-flex"><MapPin className="w-3 h-3" />{contact.origin}</span>}
                </div>
                <div><Badge variant="outline">{contact.role || 'Sin rol'}</Badge></div>
                <div className="flex items-center gap-2">
                  {contact.phone && <a href={`tel:${contact.phone}`} className="text-sm hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</a>}
                  {contact.email && <a href={`mailto:${contact.email}`} className="text-sm hover:underline flex items-center gap-1"><Mail className="w-3 h-3" /></a>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingContact({ ...contact })}><Pencil className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeContact(contact.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">No hay contactos configurados</div>
      )}
      <Button onClick={addContact} variant="outline" className="gap-2"><Plus className="w-4 h-4" />Añadir Contacto</Button>

      <Dialog open={!!editingContact} onOpenChange={(o) => !o && setEditingContact(null)}>
        <DialogContent><DialogHeader><DialogTitle>{editingContact && localContacts.some(c => c.id === editingContact.id) ? 'Editar Contacto' : 'Nuevo Contacto'}</DialogTitle></DialogHeader>
          {editingContact && <div className="py-4 space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} placeholder="Nombre completo" /></div>
            <div className="space-y-2"><Label>Rol</Label><Input value={editingContact.role} onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })} placeholder="Ej: Tour Manager" /></div>
            <div className="space-y-2"><Label>Origen</Label><Input value={editingContact.origin} onChange={(e) => setEditingContact({ ...editingContact, origin: e.target.value })} placeholder="Ciudad" /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={editingContact.phone} onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })} placeholder="+34 XXX XXX XXX" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={editingContact.email} onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })} placeholder="email@ejemplo.com" /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditingContact(null)}>Cancelar</Button><Button onClick={saveContact}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
