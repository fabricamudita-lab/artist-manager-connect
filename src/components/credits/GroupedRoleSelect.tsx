import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLES_BY_CATEGORY, getRolesByType, type CreditRole } from '@/lib/creditRoles';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupedRoleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Filter to only publishing or master roles */
  filterType?: 'publishing' | 'master';
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function GroupedRoleSelect({
  value,
  onValueChange,
  filterType,
  placeholder = 'Selecciona un rol',
  className,
  triggerClassName,
}: GroupedRoleSelectProps) {
  const groups = filterType ? getRolesByType(filterType) : ROLES_BY_CATEGORY;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={className}>
        <ScrollArea className="max-h-[300px]" onWheel={(e) => e.stopPropagation()}>
          {groups.map((group) => (
            <SelectGroup key={group.category.id}>
              <SelectLabel className={`${group.category.textClass} font-semibold`}>
                {group.category.label}
              </SelectLabel>
              {group.roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
