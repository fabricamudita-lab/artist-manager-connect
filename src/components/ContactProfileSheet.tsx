import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  FileText,
  User,
  Briefcase,
  X,
  Folder,
  Tag,
  CreditCard,
  Shirt,
  AlertTriangle,
  Clock,
  Globe,
  Link,
  Calendar,
  Home,
  Music,
  Pencil
} from "lucide-react";
import { getTeamCategoryLabel } from '@/lib/teamCategories';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface ContactProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onEdit?: (contactId: string) => void;
  refreshTrigger?: number;
}

interface ContactData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  notes?: string | null;
  category?: string | null;
  city?: string | null;
  country?: string | null;
  stage_name?: string | null;
  legal_name?: string | null;
  address?: string | null;
  tags?: string[] | null;
  iban?: string | null;
  bank_info?: string | null;
  clothing_size?: string | null;
  shoe_size?: string | null;
  allergies?: string | null;
  special_needs?: string | null;
  preferred_hours?: string | null;
  contract_url?: string | null;
  is_public?: boolean | null;
  public_slug?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  field_config?: {
    is_team_member?: boolean;
    is_management_team?: boolean;
    team_categories?: string[];
    [key: string]: any;
  } | null;
}

interface AssignedArtist {
  id: string;
  name: string;
  stage_name?: string | null;
}

interface ProjectRole {
  project_id: string;
  project_name: string;
  role: string;
}

export function ContactProfileSheet({
  open,
  onOpenChange,
  contactId,
  onEdit,
  refreshTrigger
}: ContactProfileSheetProps) {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [assignedArtists, setAssignedArtists] = useState<AssignedArtist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
      fetchProjectRoles();
      fetchAssignedArtists();
    }
  }, [open, contactId, refreshTrigger]);

  const fetchContact = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      setContact(data as ContactData);
    } catch (error) {
      console.error('Error fetching contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('project_id, role')
        .eq('contact_id', contactId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const projectIds = data.map(d => d.project_id);
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        
        const rolesWithNames = data.map(d => ({
          project_id: d.project_id,
          project_name: projects?.find(p => p.id === d.project_id)?.name || 'Proyecto',
          role: d.role || 'Sin rol'
        }));
        
        setProjectRoles(rolesWithNames);
      } else {
        setProjectRoles([]);
      }
    } catch (error) {
      console.error('Error fetching project roles:', error);
    }
  };

  const fetchAssignedArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_artist_assignments')
        .select('artist_id, artists:artist_id(id, name, stage_name)')
        .eq('contact_id', contactId);
      
      if (error) throw error;
      
      if (data) {
        setAssignedArtists(data.map((a: any) => ({
          id: a.artists?.id,
          name: a.artists?.name,
          stage_name: a.artists?.stage_name,
        })).filter((a: AssignedArtist) => a.id));
      } else {
        setAssignedArtists([]);
      }
    } catch (error) {
      console.error('Error fetching assigned artists:', error);
      setAssignedArtists([]);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const InfoCard = ({ icon: Icon, label, value, className = "" }: { 
    icon: React.ElementType; 
    label: string; 
    value: React.ReactNode;
    className?: string;
  }) => (
    <Card className={className}>
      <CardContent className="py-3 flex items-start gap-3">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="text-sm break-words">{value}</div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyValue = () => (
    <span className="text-muted-foreground italic">No especificado</span>
  );

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="sr-only">Perfil de {contact.name}</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="flex items-center gap-4 pt-2">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-semibold truncate">{contact.name}</h2>
                {contact.stage_name && (
                  <p className="text-muted-foreground truncate">{contact.stage_name}</p>
                )}
                {contact.role && (
                  <Badge variant="secondary" className="mt-2">{contact.role}</Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                disabled={!contact.email}
                onClick={() => contact.email && (window.location.href = `mailto:${contact.email}`)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                disabled={!contact.phone}
                onClick={() => contact.phone && (window.location.href = `tel:${contact.phone}`)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Llamar
              </Button>
            </div>

            <Separator />

            {/* Roles en proyectos */}
            {projectRoles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Roles en proyectos</h3>
                <div className="flex flex-wrap gap-2">
                  {projectRoles.map((pr, idx) => (
                    <Badge key={idx} variant="outline" className="py-1.5">
                      <Folder className="h-3 w-3 mr-1" />
                      {pr.role} <span className="text-muted-foreground ml-1">en {pr.project_name}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Configuración de equipo - solo si es miembro de equipo */}
            {contact.field_config?.is_team_member && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Configuración de equipo
                </h3>
                
                <InfoCard 
                  icon={Building} 
                  label="Tipo de equipo" 
                  value={contact.field_config?.is_management_team 
                    ? "00 Management (empresa)" 
                    : "Equipo de artista"} 
                />

                {assignedArtists.length > 0 && (
                  <InfoCard 
                    icon={Music} 
                    label="Artistas" 
                    value={
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assignedArtists.map((artist) => (
                          <Badge key={artist.id} variant="outline">
                            {artist.stage_name || artist.name}
                          </Badge>
                        ))}
                      </div>
                    } 
                  />
                )}

                {contact.field_config?.team_categories && contact.field_config.team_categories.length > 0 && (
                  <InfoCard 
                    icon={Tag} 
                    label="Categoría de equipo" 
                    value={
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.field_config.team_categories.map((cat: string) => (
                          <Badge key={cat} variant="secondary">
                            {getTeamCategoryLabel(cat)}
                          </Badge>
                        ))}
                      </div>
                    } 
                  />
                )}
              </div>
            )}

            {/* Información de contacto */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Información de contacto</h3>
              
              {contact.email && (
                <InfoCard 
                  icon={Mail} 
                  label="Email" 
                  value={contact.email} 
                />
              )}

              {contact.phone && (
                <InfoCard 
                  icon={Phone} 
                  label="Teléfono" 
                  value={contact.phone} 
                />
              )}

              {contact.company && (
                <InfoCard 
                  icon={Building} 
                  label="Empresa" 
                  value={contact.company} 
                />
              )}

              {contact.address && (
                <InfoCard 
                  icon={Home} 
                  label="Dirección" 
                  value={contact.address} 
                />
              )}

              {contact.city && (
                <InfoCard 
                  icon={MapPin} 
                  label="Ciudad" 
                  value={contact.city} 
                />
              )}

              {contact.country && (
                <InfoCard 
                  icon={Globe} 
                  label="País" 
                  value={contact.country} 
                />
              )}

              {!contact.email && !contact.phone && !contact.company && !contact.address && !contact.city && !contact.country && (
                <p className="text-sm text-muted-foreground italic">Sin información de contacto</p>
              )}
            </div>

            {/* Información personal */}
            {(contact.legal_name || contact.category || (contact.tags && contact.tags.length > 0) || contact.preferred_hours) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información personal</h3>
                
                {contact.legal_name && (
                  <InfoCard 
                    icon={User} 
                    label="Nombre legal" 
                    value={contact.legal_name} 
                  />
                )}

                {contact.category && (
                  <InfoCard 
                    icon={Briefcase} 
                    label="Categoría" 
                    value={<Badge variant="outline">{contact.category}</Badge>} 
                  />
                )}

                {contact.tags && contact.tags.length > 0 && (
                  <InfoCard 
                    icon={Tag} 
                    label="Etiquetas" 
                    value={
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    } 
                  />
                )}

                {contact.preferred_hours && (
                  <InfoCard 
                    icon={Clock} 
                    label="Horario preferido" 
                    value={contact.preferred_hours} 
                  />
                )}
              </div>
            )}

            {/* Información adicional */}
            {(contact.clothing_size || contact.shoe_size || contact.allergies || contact.special_needs) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información adicional</h3>
                
                {contact.clothing_size && (
                  <InfoCard 
                    icon={Shirt} 
                    label="Talla de ropa" 
                    value={contact.clothing_size} 
                  />
                )}

                {contact.shoe_size && (
                  <InfoCard 
                    icon={Shirt} 
                    label="Talla de calzado" 
                    value={contact.shoe_size} 
                  />
                )}

                {contact.allergies && (
                  <InfoCard 
                    icon={AlertTriangle} 
                    label="Alergias" 
                    value={contact.allergies} 
                  />
                )}

                {contact.special_needs && (
                  <InfoCard 
                    icon={AlertTriangle} 
                    label="Necesidades especiales" 
                    value={contact.special_needs} 
                  />
                )}
              </div>
            )}

            {/* Información bancaria */}
            {(contact.iban || contact.bank_info) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Información bancaria</h3>
                
                {contact.iban && (
                  <InfoCard 
                    icon={CreditCard} 
                    label="IBAN" 
                    value={contact.iban} 
                  />
                )}

                {contact.bank_info && (
                  <InfoCard 
                    icon={CreditCard} 
                    label="Información bancaria" 
                    value={contact.bank_info} 
                  />
                )}
              </div>
            )}

            {/* Contrato */}
            {contact.contract_url && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Contrato</h3>
                <InfoCard 
                  icon={Link} 
                  label="URL del contrato" 
                  value={
                    <a 
                      href={contact.contract_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {contact.contract_url}
                    </a>
                  } 
                />
              </div>
            )}

            {/* Visibilidad */}
            {(contact.is_public || contact.public_slug) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Visibilidad</h3>
                
                {contact.is_public !== null && (
                  <InfoCard 
                    icon={Globe} 
                    label="Contacto público" 
                    value={contact.is_public ? "Sí" : "No"} 
                  />
                )}

                {contact.public_slug && (
                  <InfoCard 
                    icon={Link} 
                    label="Slug público" 
                    value={contact.public_slug} 
                  />
                )}
              </div>
            )}

            {/* Notas */}
            {contact.notes && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Notas</h3>
                <InfoCard 
                  icon={FileText} 
                  label="Notas" 
                  value={<p className="whitespace-pre-wrap">{contact.notes}</p>} 
                />
              </div>
            )}

            {/* Fechas */}
            {(contact.created_at || contact.updated_at) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Registro</h3>
                
                {contact.created_at && (
                  <InfoCard 
                    icon={Calendar} 
                    label="Creado" 
                    value={format(new Date(contact.created_at), "d 'de' MMMM, yyyy", { locale: es })} 
                  />
                )}

                {contact.updated_at && (
                  <InfoCard 
                    icon={Calendar} 
                    label="Última actualización" 
                    value={format(new Date(contact.updated_at), "d 'de' MMMM, yyyy", { locale: es })} 
                  />
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-background flex gap-2">
          {onEdit && (
            <Button 
              className="flex-1" 
              onClick={() => {
                onEdit(contact.id);
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <Button 
            variant="outline" 
            className={onEdit ? "flex-1" : "w-full"}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
