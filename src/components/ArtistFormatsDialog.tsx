import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembersByArtist, TeamMemberWithCategory } from '@/hooks/useTeamMembersByArtist';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Trash2, Upload, Loader2, Users, Clock, Euro, 
  FileText, Music, GripVertical, Settings2, X, UserPlus, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

interface CrewMember {
  memberId: string;
  memberType: 'workspace' | 'contact';
  roleLabel?: string;
  name: string;
  feeNational?: number;
  feeInternational?: number;
}

interface BookingProduct {
  id?: string;
  name: string;
  description?: string;
  feeNational?: number;
  feeInternational?: number;
  crewMembers: CrewMember[];
  performanceDurationMinutes?: number;
  riderUrl?: string;
  hospitalityRequirements?: string;
}

interface ArtistFormatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
}

const PRESET_FORMATS = [
  { name: 'Acústico', crewSize: 2 },
  { name: 'Dúo', crewSize: 2 },
  { name: 'Trío', crewSize: 3 },
  { name: 'Cuarteto', crewSize: 4 },
  { name: 'Quinteto', crewSize: 5 },
  { name: 'Banda Completa', crewSize: 6 },
  { name: 'Full Band + Luces', crewSize: 8 },
  { name: 'DJ Set', crewSize: 1 },
];

// Sortable Crew Member Component
interface SortableCrewMemberProps {
  crew: CrewMember;
  formatIndex: number;
  onUpdateFeeNational: (formatIndex: number, memberId: string, fee: number | undefined) => void;
  onUpdateFeeInternational: (formatIndex: number, memberId: string, fee: number | undefined) => void;
  onRemove: (formatIndex: number, memberId: string) => void;
}

function SortableCrewMember({ 
  crew, 
  formatIndex, 
  onUpdateFeeNational, 
  onUpdateFeeInternational, 
  onRemove 
}: SortableCrewMemberProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: crew.memberId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 border border-border/50"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium min-w-[100px]">{crew.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Nacional €</Label>
          <Input
            type="number"
            value={crew.feeNational || ''}
            onChange={(e) => onUpdateFeeNational(formatIndex, crew.memberId, parseFloat(e.target.value) || undefined)}
            placeholder="0"
            className="w-20 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Internacional €</Label>
          <Input
            type="number"
            value={crew.feeInternational || ''}
            onChange={(e) => onUpdateFeeInternational(formatIndex, crew.memberId, parseFloat(e.target.value) || undefined)}
            placeholder="0"
            className="w-20 h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(formatIndex, crew.memberId)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function ArtistFormatsDialog({ 
  open, 
  onOpenChange, 
  artistId, 
  artistName 
}: ArtistFormatsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formats, setFormats] = useState<BookingProduct[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [selectingCrewForIndex, setSelectingCrewForIndex] = useState<number | null>(null);
  const [expandedFormats, setExpandedFormats] = useState<Set<number>>(new Set());
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Fetch team members for this artist
  const selectedArtistIds = useMemo(() => (artistId ? [artistId] : []), [artistId]);
  const { allTeamMembers, filteredMembers, groupedByCategory, loading: loadingTeam } = useTeamMembersByArtist(selectedArtistIds);

  // Fetch artist profile data
  const { data: artistProfile } = useQuery({
    queryKey: ['artist-profile', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('id', artistId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!artistId,
  });

  // Fetch existing formats
  const { data: existingFormats, isLoading } = useQuery({
    queryKey: ['booking-products', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_products')
        .select('*')
        .eq('artist_id', artistId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: open && !!artistId,
  });

  // Fetch crew assignments for existing formats
  const { data: existingCrew } = useQuery({
    queryKey: ['booking-product-crew', artistId],
    queryFn: async () => {
      if (!existingFormats || existingFormats.length === 0) return [];
      
      const productIds = existingFormats.map(f => f.id);
      const { data, error } = await supabase
        .from('booking_product_crew')
        .select('*')
        .in('booking_product_id', productIds);
      if (error) throw error;
      return data;
    },
    enabled: open && !!artistId && !!existingFormats && existingFormats.length > 0,
  });

  // Initialize formats from database
  useEffect(() => {
    if (existingFormats) {
      const crewByProduct = new Map<string, CrewMember[]>();
      
      if (existingCrew) {
        existingCrew.forEach((c: any) => {
          if (!crewByProduct.has(c.booking_product_id)) {
            crewByProduct.set(c.booking_product_id, []);
          }
          // Find member name from ALL team members (not filtered)
          const member = allTeamMembers.find(m => m.id === c.member_id);
          crewByProduct.get(c.booking_product_id)!.push({
            memberId: c.member_id,
            memberType: c.member_type,
            roleLabel: c.role_label || undefined,
            name: member?.name || 'Desconocido',
            feeNational: c.fee_national || undefined,
            feeInternational: c.fee_international || undefined,
          });
        });
      }
      
      setFormats(existingFormats.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description || undefined,
        feeNational: f.fee_national || undefined,
        feeInternational: f.fee_international || undefined,
        crewMembers: crewByProduct.get(f.id) || [],
        performanceDurationMinutes: f.performance_duration_minutes || undefined,
        riderUrl: f.rider_url || undefined,
        hospitalityRequirements: f.hospitality_requirements || undefined,
      })));
    }
  }, [existingFormats, existingCrew, allTeamMembers]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');

      // Delete all existing formats and crew for this artist
      const { data: existingProducts } = await supabase
        .from('booking_products')
        .select('id')
        .eq('artist_id', artistId);
      
      if (existingProducts && existingProducts.length > 0) {
        const productIds = existingProducts.map(p => p.id);
        await supabase
          .from('booking_product_crew')
          .delete()
          .in('booking_product_id', productIds);
      }
      
      await supabase
        .from('booking_products')
        .delete()
        .eq('artist_id', artistId);

      // Insert all new/updated formats
      if (formats.length > 0) {
        for (let idx = 0; idx < formats.length; idx++) {
          const f = formats[idx];
          const { data: newProduct, error } = await supabase
            .from('booking_products')
            .insert({
              artist_id: artistId,
              name: f.name,
              description: f.description || null,
              fee_national: f.feeNational || null,
              fee_international: f.feeInternational || null,
              crew_size: f.crewMembers.length,
              performance_duration_minutes: f.performanceDurationMinutes || null,
              rider_url: f.riderUrl || null,
              hospitality_requirements: f.hospitalityRequirements || null,
              sort_order: idx,
              created_by: user.id,
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Insert crew members
          if (f.crewMembers.length > 0 && newProduct) {
            const crewInserts = f.crewMembers.map(cm => ({
              booking_product_id: newProduct.id,
              member_id: cm.memberId,
              member_type: cm.memberType,
              role_label: cm.roleLabel || null,
              fee_national: cm.feeNational || null,
              fee_international: cm.feeInternational || null,
            }));
            
            const { error: crewError } = await supabase
              .from('booking_product_crew')
              .insert(crewInserts);
            
            if (crewError) throw crewError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-products', artistId] });
      queryClient.invalidateQueries({ queryKey: ['booking-product-crew', artistId] });
      toast.success('Formatos guardados correctamente');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving formats:', error);
      toast.error('Error al guardar los formatos');
    },
  });

  const handleAddFormat = (preset?: { name: string; crewSize: number }) => {
    setFormats([
      ...formats,
      {
        name: preset?.name || 'Nuevo Formato',
        crewMembers: [],
      },
    ]);
  };

  const handleRemoveFormat = (index: number) => {
    setFormats(formats.filter((_, i) => i !== index));
  };

  const handleUpdateFormat = (index: number, updates: Partial<BookingProduct>) => {
    setFormats(formats.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const handleAddCrewMember = (formatIndex: number, member: TeamMemberWithCategory) => {
    const format = formats[formatIndex];
    if (format.crewMembers.some(cm => cm.memberId === member.id)) return;
    
    handleUpdateFormat(formatIndex, {
      crewMembers: [
        ...format.crewMembers,
        {
          memberId: member.id,
          memberType: member.type,
          name: member.name,
        },
      ],
    });
  };

  const handleRemoveCrewMember = (formatIndex: number, memberId: string) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.filter(cm => cm.memberId !== memberId),
    });
  };

  const handleUpdateCrewRole = (formatIndex: number, memberId: string, roleLabel: string) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, roleLabel } : cm
      ),
    });
  };

  const handleUpdateCrewFeeNational = (formatIndex: number, memberId: string, feeNational: number | undefined) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, feeNational } : cm
      ),
    });
  };

  const handleUpdateCrewFeeInternational = (formatIndex: number, memberId: string, feeInternational: number | undefined) => {
    const format = formats[formatIndex];
    handleUpdateFormat(formatIndex, {
      crewMembers: format.crewMembers.map(cm =>
        cm.memberId === memberId ? { ...cm, feeInternational } : cm
      ),
    });
  };

  const handleReorderCrewMembers = (formatIndex: number, activeId: string, overId: string) => {
    const format = formats[formatIndex];
    const oldIndex = format.crewMembers.findIndex(cm => cm.memberId === activeId);
    const newIndex = format.crewMembers.findIndex(cm => cm.memberId === overId);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      handleUpdateFormat(formatIndex, {
        crewMembers: arrayMove(format.crewMembers, oldIndex, newIndex),
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRiderUpload = async (index: number, file: File) => {
    if (!user || !artistId) return;

    setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${artistId}/riders/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      handleUpdateFormat(index, { riderUrl: urlData.publicUrl });
      toast.success('Rider subido correctamente');
    } catch (error) {
      console.error('Error uploading rider:', error);
      toast.error('Error al subir el rider');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Filter out presets that are already added
  const availablePresets = PRESET_FORMATS.filter(
    preset => !formats.some(f => f.name.toLowerCase() === preset.name.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Formatos de Booking - {artistName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Add Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Añadir formato rápido</Label>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.map((preset) => (
                    <Badge
                      key={preset.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleAddFormat(preset)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Format Cards */}
            <div className="space-y-4">
              {formats.map((format, index) => {
                const isExpanded = expandedFormats.has(index);
                return (
                <Collapsible
                  key={index}
                  open={isExpanded}
                  onOpenChange={(open) => {
                    setExpandedFormats(prev => {
                      const next = new Set(prev);
                      if (open) {
                        next.add(index);
                      } else {
                        next.delete(index);
                      }
                      return next;
                    });
                  }}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-semibold">{format.name || 'Nuevo Formato'}</span>
                          {format.crewMembers.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {format.crewMembers.length} miembros
                            </Badge>
                          )}
                          {(format.feeNational || format.feeInternational) && (
                            <Badge variant="outline" className="ml-1">
                              {format.feeNational ? `NAC €${format.feeNational}` : ''}{format.feeNational && format.feeInternational ? ' / ' : ''}{format.feeInternational ? `INT €${format.feeInternational}` : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFormat(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-4 border-t">
                        {/* Editable Name */}
                        <div className="space-y-2">
                          <Label className="text-sm">Nombre del formato</Label>
                          <Input
                            value={format.name}
                            onChange={(e) => handleUpdateFormat(index, { name: e.target.value })}
                            placeholder="Nombre del formato"
                          />
                        </div>

                        {/* Tarifas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                              <Euro className="w-4 h-4" />
                              Tarifa Nacional
                            </Label>
                            <Input
                              type="number"
                              placeholder="€"
                              value={format.feeNational || ''}
                              onChange={(e) =>
                                handleUpdateFormat(index, { feeNational: parseFloat(e.target.value) || undefined })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                              <Euro className="w-4 h-4" />
                              Tarifa Internacional
                            </Label>
                            <Input
                              type="number"
                              placeholder="€"
                              value={format.feeInternational || ''}
                              onChange={(e) =>
                                handleUpdateFormat(index, { feeInternational: parseFloat(e.target.value) || undefined })
                              }
                            />
                          </div>
                        </div>

                    {/* Crew Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4" />
                        Equipo ({format.crewMembers.length} miembros)
                      </Label>
                      
                      {/* Selected Crew Members with Drag & Drop */}
                      {format.crewMembers.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event: DragEndEvent) => {
                            const { active, over } = event;
                            if (over && active.id !== over.id) {
                              handleReorderCrewMembers(index, active.id as string, over.id as string);
                            }
                          }}
                        >
                          <SortableContext
                            items={format.crewMembers.map(cm => cm.memberId)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2 mb-2">
                              {format.crewMembers.map((cm) => (
                                <SortableCrewMember
                                  key={cm.memberId}
                                  crew={cm}
                                  formatIndex={index}
                                  onUpdateFeeNational={handleUpdateCrewFeeNational}
                                  onUpdateFeeInternational={handleUpdateCrewFeeInternational}
                                  onRemove={handleRemoveCrewMember}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                      
                      {/* Add Crew Button */}
                      {selectingCrewForIndex === index ? (
                        <div className="border rounded-md p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Seleccionar miembros</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectingCrewForIndex(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {loadingTeam ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <ScrollArea className="h-48">
                              <div className="space-y-3">
                                {/* Artist Profile - Highlighted at top */}
                                {artistProfile && (
                                  <div>
                                    <p className="text-xs font-medium text-primary mb-1">
                                      Artista Principal
                                    </p>
                                    <div className="space-y-1">
                                      {(() => {
                                        const isSelected = format.crewMembers.some(
                                          cm => cm.memberId === artistProfile.id
                                        );
                                        return (
                                          <div
                                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer bg-primary/10 border border-primary/20"
                                            onClick={() => {
                                              if (isSelected) {
                                                handleRemoveCrewMember(index, artistProfile.id);
                                              } else {
                                                handleAddCrewMember(index, {
                                                  id: artistProfile.id,
                                                  name: artistProfile.name,
                                                  type: 'workspace',
                                                  category: undefined,
                                                  artistIds: [artistProfile.id],
                                                });
                                              }
                                            }}
                                          >
                                            <Checkbox checked={isSelected} />
                                            <span className="text-sm font-medium">{artistProfile.name}</span>
                                            <Badge className="text-xs bg-primary/20 text-primary">
                                              Artista
                                            </Badge>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Team categories */}
                                {groupedByCategory.map((category) => (
                                  <div key={category.value}>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {category.label}
                                    </p>
                                    <div className="space-y-1">
                                      {category.members.map((member) => {
                                        const isSelected = format.crewMembers.some(
                                          cm => cm.memberId === member.id
                                        );
                                        return (
                                          <div
                                            key={member.id}
                                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer"
                                            onClick={() => {
                                              if (isSelected) {
                                                handleRemoveCrewMember(index, member.id);
                                              } else {
                                                handleAddCrewMember(index, member);
                                              }
                                            }}
                                          >
                                            <Checkbox checked={isSelected} />
                                            <span className="text-sm">{member.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                              {member.type === 'workspace' ? 'Usuario' : 'Contacto'}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectingCrewForIndex(index)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Añadir miembros
                        </Button>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4" />
                        Duración (min)
                      </Label>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        placeholder="90"
                        value={format.performanceDurationMinutes || ''}
                        onChange={(e) =>
                          handleUpdateFormat(index, {
                            performanceDurationMinutes: parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>

                    {/* Rider Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm">Rider Técnico (PDF)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={uploadingIndex === index}
                          className="flex-1"
                        >
                          {uploadingIndex === index ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {format.riderUrl ? 'Cambiar Rider' : 'Subir Rider'}
                        </Button>
                        {format.riderUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={format.riderUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              Ver
                            </a>
                          </Button>
                        )}
                        <input
                          type="file"
                          ref={(el) => (fileInputRefs.current[index] = el)}
                          className="hidden"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRiderUpload(index, file);
                          }}
                        />
                      </div>
                    </div>

                    {/* Hospitality Requirements */}
                    <div className="space-y-2">
                      <Label className="text-sm">Requisitos de Hospitalidad</Label>
                      <Textarea
                        placeholder="Catering, camerino, etc."
                        value={format.hospitalityRequirements || ''}
                        onChange={(e) =>
                          handleUpdateFormat(index, { hospitalityRequirements: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
              );
              })}

              {formats.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sin formatos configurados</h3>
                    <p className="text-muted-foreground mb-4">
                      Añade formatos de booking para este artista
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Add Custom Format */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddFormat()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Formato Personalizado
            </Button>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Formatos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}