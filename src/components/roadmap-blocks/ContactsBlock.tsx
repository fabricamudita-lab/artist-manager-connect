import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  origin: string; // Ciudad base / origen del contacto
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

  // Local state for immediate UI updates
  const [localContacts, setLocalContacts] = useState<Contact[]>(incomingContacts);
  const lastSyncedRef = useRef<string>(JSON.stringify(incomingContacts));
  const debouncedContacts = useDebounce(localContacts, 500);

  // Sync from parent when data changes externally
  useEffect(() => {
    const next = JSON.stringify(incomingContacts);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      setLocalContacts(incomingContacts);
    }
  }, [incomingContacts]);

  // Save to parent when debounced data changes
  useEffect(() => {
    const next = JSON.stringify(debouncedContacts);
    if (next !== lastSyncedRef.current) {
      lastSyncedRef.current = next;
      onChange({ ...data, contacts: debouncedContacts });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContacts]);

  const addContact = () => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: '',
      role: '',
      phone: '',
      email: '',
      origin: '',
    };
    setLocalContacts((prev) => [...prev, newContact]);
  };

  const updateContact = (contactId: string, updates: Partial<Contact>) => {
    setLocalContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, ...updates } : c))
    );
  };

  const removeContact = (contactId: string) => {
    setLocalContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Contactos de la Gira</Label>
      </div>
      
      {localContacts.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                      placeholder="Nombre completo"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.role}
                      onChange={(e) => updateContact(contact.id, { role: e.target.value })}
                      placeholder="Ej: Tour Manager"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.origin || ''}
                      onChange={(e) => updateContact(contact.id, { origin: e.target.value })}
                      placeholder="Madrid"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                      placeholder="+34 XXX XXX XXX"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.email}
                      onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                      placeholder="email@ejemplo.com"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {contact.phone && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                          <a href={`tel:${contact.phone}`}>
                            <Phone className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {contact.email && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                          <a href={`mailto:${contact.email}`}>
                            <Mail className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContact(contact.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
          No hay contactos configurados
        </p>
      )}
      <Button onClick={addContact} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        Añadir Contacto
      </Button>
    </div>
  );
}
