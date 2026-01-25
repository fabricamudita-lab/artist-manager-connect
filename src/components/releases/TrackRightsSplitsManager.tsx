import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, FileText, Music, User, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  usePublishingSplits,
  useMasterSplits,
  useCreatePublishingSplit,
  useUpdatePublishingSplit,
  useDeletePublishingSplit,
  useCreateMasterSplit,
  useUpdateMasterSplit,
  useDeleteMasterSplit,
  useTrackRightsStats,
  PUBLISHING_ROLES,
  MASTER_ROLES,
  PRO_OPTIONS,
  type PublishingSplit,
  type MasterSplit,
} from '@/hooks/useTrackRightsSplits';
import { Track } from '@/hooks/useReleases';

interface TrackRightsSplitsManagerProps {
  track: Track;
  type: 'publishing' | 'master';
}

export function TrackRightsSplitsManager({ track, type }: TrackRightsSplitsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: publishingSplits = [] } = usePublishingSplits(track.id);
  const { data: masterSplits = [] } = useMasterSplits(track.id);
  const stats = useTrackRightsStats(track.id);

  const splits = type === 'publishing' ? publishingSplits : masterSplits;
  const totalPercentage = type === 'publishing' ? stats.publishingTotal : stats.masterTotal;
  const isComplete = totalPercentage === 100;

  const createPublishing = useCreatePublishingSplit();
  const updatePublishing = useUpdatePublishingSplit();
  const deletePublishing = useDeletePublishingSplit();
  const createMaster = useCreateMasterSplit();
  const updateMaster = useUpdateMasterSplit();
  const deleteMaster = useDeleteMasterSplit();

  const roles = type === 'publishing' ? PUBLISHING_ROLES : MASTER_ROLES;
  const Icon = type === 'publishing' ? FileText : Music;
  const title = type === 'publishing' ? 'Derechos de Autor' : 'Royalties Master';
  const subtitle = type === 'publishing' 
    ? 'Compositores, letristas, editoriales' 
    : 'Artistas, productores, sello';

  const handleCreate = async (data: any) => {
    if (type === 'publishing') {
      await createPublishing.mutateAsync({ ...data, track_id: track.id });
    } else {
      await createMaster.mutateAsync({ ...data, track_id: track.id });
    }
    setIsAdding(false);
  };

  const handleUpdate = async (id: string, data: any) => {
    if (type === 'publishing') {
      await updatePublishing.mutateAsync({ id, trackId: track.id, ...data });
    } else {
      await updateMaster.mutateAsync({ id, trackId: track.id, ...data });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (type === 'publishing') {
      await deletePublishing.mutateAsync({ id, trackId: track.id });
    } else {
      await deleteMaster.mutateAsync({ id, trackId: track.id });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'publishing' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
              <Icon className={`h-4 w-4 ${type === 'publishing' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className="font-medium text-sm">{track.title}</p>
              <p className="text-xs text-muted-foreground">
                {splits.length} {splits.length === 1 ? 'participante' : 'participantes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={isComplete ? 'default' : 'outline'} 
              className={isComplete ? 'bg-green-500' : totalPercentage > 100 ? 'border-red-500 text-red-500' : ''}
            >
              {totalPercentage}%
            </Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pl-4 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <Progress 
            value={Math.min(totalPercentage, 100)} 
            className={`h-2 ${totalPercentage > 100 ? '[&>div]:bg-red-500' : ''}`}
          />
          <p className="text-xs text-muted-foreground">
            {isComplete ? '✓ Completo' : `${100 - totalPercentage}% restante`}
          </p>
        </div>

        {/* Existing splits */}
        {splits.map((split) => (
          <SplitRow
            key={split.id}
            split={split}
            type={type}
            roles={roles}
            isEditing={editingId === split.id}
            onEdit={() => setEditingId(split.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(data) => handleUpdate(split.id, data)}
            onDelete={() => handleDelete(split.id)}
          />
        ))}

        {/* Add new split form */}
        {isAdding ? (
          <AddSplitForm
            type={type}
            roles={roles}
            onSave={handleCreate}
            onCancel={() => setIsAdding(false)}
            isLoading={createPublishing.isPending || createMaster.isPending}
          />
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir {type === 'publishing' ? 'autor' : 'participante'}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Split Row Component
function SplitRow({
  split,
  type,
  roles,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  split: PublishingSplit | MasterSplit;
  type: 'publishing' | 'master';
  roles: { value: string; label: string }[];
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
}) {
  const [editName, setEditName] = useState(split.name);
  const [editRole, setEditRole] = useState(split.role);
  const [editPercentage, setEditPercentage] = useState(split.percentage);
  const [editPro, setEditPro] = useState((split as PublishingSplit).pro_name || '');
  const [editLabel, setEditLabel] = useState((split as MasterSplit).label_name || '');

  const handleSave = () => {
    const data: any = {
      name: editName,
      role: editRole,
      percentage: editPercentage,
    };
    if (type === 'publishing') {
      data.pro_name = editPro || null;
    } else {
      data.label_name = editLabel || null;
    }
    onSave(data);
  };

  const roleLabel = roles.find(r => r.value === split.role)?.label || split.role;

  if (isEditing) {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre"
          />
          <Select value={editRole} onValueChange={setEditRole}>
            <SelectTrigger>
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <Slider
            value={[editPercentage]}
            onValueChange={([val]) => setEditPercentage(val)}
            max={100}
            step={0.5}
            className="flex-1"
          />
          <div className="w-16 text-right font-medium">{editPercentage}%</div>
        </div>
        {type === 'publishing' && (
          <Select value={editPro} onValueChange={setEditPro}>
            <SelectTrigger>
              <SelectValue placeholder="PRO (Sociedad de Gestión)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin especificar</SelectItem>
              {PRO_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {type === 'master' && (
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Sello discográfico (opcional)"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          split.contact_id ? 'bg-primary/10' : 'bg-muted'
        }`}>
          <User className={`h-4 w-4 ${split.contact_id ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{split.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
            {type === 'publishing' && (split as PublishingSplit).pro_name && (
              <span>{(split as PublishingSplit).pro_name}</span>
            )}
            {type === 'master' && (split as MasterSplit).label_name && (
              <span>{(split as MasterSplit).label_name}</span>
            )}
            {split.contact_id && (
              <Badge variant="secondary" className="text-xs bg-primary/10">
                Vinculado
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{split.percentage}%</Badge>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Contact interface
interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

// Add Split Form with Contact Selection
function AddSplitForm({
  type,
  roles,
  onSave,
  onCancel,
  isLoading,
}: {
  type: 'publishing' | 'master';
  roles: { value: string; label: string }[];
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<'select' | 'create' | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(roles[0]?.value || '');
  const [percentage, setPercentage] = useState(50);
  const [pro, setPro] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (mode === 'select') {
      fetchContacts();
    }
  }, [mode]);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, stage_name, email, phone, company')
        .order('name', { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleCreateContactAndSave = async () => {
    if (!name || !role) return;
    
    try {
      // Create contact first
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          created_by: profile?.user_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Now save split with contact_id
      const splitData: any = { 
        name, 
        role, 
        percentage,
        contact_id: newContact.id 
      };
      if (type === 'publishing' && pro) splitData.pro_name = pro;
      if (type === 'master' && label) splitData.label_name = label;
      
      onSave(splitData);
      toast.success('Contacto creado y vinculado');
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Error al crear el contacto');
    }
  };

  const handleSelectContactAndSave = () => {
    if (!selectedContactId || !role) return;
    
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;
    
    const splitData: any = { 
      name: contact.stage_name || contact.name, 
      role, 
      percentage,
      contact_id: selectedContactId 
    };
    if (type === 'publishing' && pro) splitData.pro_name = pro;
    if (type === 'master' && label) splitData.label_name = label;
    
    onSave(splitData);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initial mode selection
  if (mode === null) {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
        <p className="text-sm text-muted-foreground text-center mb-2">
          ¿Cómo quieres añadir el participante?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => setMode('select')}
          >
            <Search className="h-5 w-5" />
            <span className="text-sm">Desde la Agenda</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => setMode('create')}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-sm">Nuevo Perfil</span>
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Select from contacts mode
  if (mode === 'select') {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
            ← Volver
          </Button>
          <span className="text-sm font-medium">Seleccionar desde la Agenda</span>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar contacto..."
            className="pl-9"
          />
        </div>
        
        {/* Contact list */}
        <div className="max-h-40 overflow-y-auto border rounded-md">
          {loadingContacts ? (
            <p className="text-sm text-muted-foreground p-3 text-center">Cargando...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 text-center">No hay contactos</p>
          ) : (
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                className={`p-2 cursor-pointer hover:bg-muted/50 flex items-center gap-2 border-b last:border-b-0 ${
                  selectedContactId === contact.id ? 'bg-primary/10' : ''
                }`}
                onClick={() => setSelectedContactId(contact.id)}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contact.stage_name || contact.name}
                  </p>
                  {contact.email && (
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  )}
                </div>
                {selectedContactId === contact.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Role and percentage */}
        {selectedContactId && (
          <>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-4">
              <Label className="text-sm text-muted-foreground">Porcentaje</Label>
              <Slider
                value={[percentage]}
                onValueChange={([val]) => setPercentage(val)}
                max={100}
                step={0.5}
                className="flex-1"
              />
              <div className="w-16 text-right font-medium">{percentage}%</div>
            </div>
            
            {type === 'publishing' && (
              <Select value={pro} onValueChange={setPro}>
                <SelectTrigger>
                  <SelectValue placeholder="PRO / Sociedad de Gestión (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin especificar</SelectItem>
                  {PRO_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {type === 'master' && (
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Sello discográfico (opcional)"
              />
            )}
          </>
        )}
        
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSelectContactAndSave} 
            disabled={isLoading || !selectedContactId}
          >
            Añadir
          </Button>
        </div>
      </div>
    );
  }

  // Create new profile mode
  return (
    <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
          ← Volver
        </Button>
        <span className="text-sm font-medium">Crear nuevo perfil</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre *"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (opcional)"
          type="email"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono (opcional)"
        />
      </div>
      
      <div className="flex items-center gap-4">
        <Label className="text-sm text-muted-foreground">Porcentaje</Label>
        <Slider
          value={[percentage]}
          onValueChange={([val]) => setPercentage(val)}
          max={100}
          step={0.5}
          className="flex-1"
        />
        <div className="w-16 text-right font-medium">{percentage}%</div>
      </div>
      
      {type === 'publishing' && (
        <Select value={pro} onValueChange={setPro}>
          <SelectTrigger>
            <SelectValue placeholder="PRO / Sociedad de Gestión (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin especificar</SelectItem>
            {PRO_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {type === 'master' && (
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Sello discográfico (opcional)"
        />
      )}
      
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          size="sm" 
          onClick={handleCreateContactAndSave} 
          disabled={isLoading || !name}
        >
          Crear y Añadir
        </Button>
      </div>
    </div>
  );
}
