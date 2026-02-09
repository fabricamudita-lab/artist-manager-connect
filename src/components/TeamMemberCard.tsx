import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, UserCheck, MoreVertical, Edit2, UserMinus, Settings, Pencil } from 'lucide-react';

export type MemberType = 'artist' | 'user' | 'profile';

interface TeamMemberCardProps {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  onClick?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onEditRole?: () => void;
  onCategoryChange?: (category: string) => void;
  categories?: Array<{ value: string; label: string }>;
  currentCategory?: string;
  showActions?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const getTypeStyles = (type: MemberType) => {
  switch (type) {
    case 'artist':
      return {
        ring: 'ring-2 ring-primary ring-offset-2',
        bg: 'bg-primary/10',
        text: 'text-primary',
        badge: 'bg-primary/20 text-primary border-primary/30',
        indicator: Star,
      };
    case 'user':
      return {
        ring: 'ring-2 ring-green-500 ring-offset-2',
        bg: 'bg-green-50 dark:bg-green-950/30',
        text: 'text-green-700 dark:text-green-400',
        badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        indicator: UserCheck,
      };
    case 'profile':
    default:
      return {
        ring: '',
        bg: 'bg-secondary',
        text: 'text-muted-foreground',
        badge: 'bg-secondary text-muted-foreground border-border',
        indicator: null,
      };
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TeamMemberCard({
  id,
  name,
  email,
  role,
  avatarUrl,
  type,
  onClick,
  onEdit,
  onRemove,
  onEditRole,
  onCategoryChange,
  categories = [],
  currentCategory,
  showActions = true,
  selectable = false,
  selected = false,
  onSelect,
}: TeamMemberCardProps) {
  const styles = getTypeStyles(type);
  const Indicator = styles.indicator;

  return (
    <TooltipProvider>
      <div 
        className="group relative flex flex-col items-center p-3 rounded-xl hover:bg-accent/50 transition-all cursor-pointer"
        onClick={onClick}
      >
        {/* Selection indicator */}
        {selectable && (
          <div 
            className="absolute top-0 left-0 z-10"
            onClick={(e) => { e.stopPropagation(); onSelect?.(id); }}
          >
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected 
                ? 'bg-primary border-primary' 
                : 'border-muted-foreground/40 bg-background/80 hover:border-primary/60'
            }`}>
              {selected && (
                <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Avatar with type indicator */}
        <div className="relative">
          <Avatar className={`h-14 w-14 ${styles.ring} ${styles.bg} ${selected ? 'ring-primary ring-2 ring-offset-2' : ''}`}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className={`text-sm font-semibold ${styles.bg} ${styles.text}`}>
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          
          {/* Type indicator badge */}
          {Indicator && (
            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${type === 'artist' ? 'bg-primary' : 'bg-green-500'}`}>
              <Indicator className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Name */}
        <Tooltip>
          <TooltipTrigger asChild>
            <h4 className="mt-2 text-sm font-medium text-center truncate max-w-[100px]">
              {name}
            </h4>
          </TooltipTrigger>
          <TooltipContent>
            <p>{name}</p>
            {email && <p className="text-xs text-muted-foreground">{email}</p>}
          </TooltipContent>
        </Tooltip>

        {/* Role */}
        {role && (
          <p className="text-xs text-muted-foreground text-center truncate max-w-[100px]">
            {role}
          </p>
        )}


        {/* Actions dropdown - visible on hover */}
        {showActions && (onEdit || onRemove || onEditRole || onCategoryChange) && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                {onEditRole && type === 'user' && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditRole(); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar rol
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onCategoryChange && categories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {categories.map(cat => (
                      <DropdownMenuItem
                        key={cat.value}
                        onClick={(e) => { e.stopPropagation(); onCategoryChange(cat.value); }}
                        className={currentCategory === cat.value ? 'bg-accent' : ''}
                      >
                        Mover a {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Quitar del equipo
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
