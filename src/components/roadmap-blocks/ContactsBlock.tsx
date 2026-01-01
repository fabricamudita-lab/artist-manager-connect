import { Plus, Trash2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
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
  const contacts = blockData.contacts || [];

  const addContact = () => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: '',
      role: '',
      phone: '',
      email: '',
    };
    onChange({ ...data, contacts: [...contacts, newContact] });
  };

  const updateContact = (contactId: string, updates: Partial<Contact>) => {
    const newContacts = contacts.map((c) => (c.id === contactId ? { ...c, ...updates } : c));
    onChange({ ...data, contacts: newContacts });
  };

  const removeContact = (contactId: string) => {
    onChange({ ...data, contacts: contacts.filter((c) => c.id !== contactId) });
  };

  return (
    <div className="space-y-4">
      {contacts.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
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
