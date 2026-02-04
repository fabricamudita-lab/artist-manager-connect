import { TeamMemberCard, MemberType } from './TeamMemberCard';

export interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  extraCategories?: string[];
  currentCategory?: string;
  rawData?: any;
}

interface TeamMemberGridProps {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  onMemberEdit?: (member: Member) => void;
  onMemberRemove?: (member: Member) => void;
  onMemberEditRole?: (member: Member) => void;
  onCategoryChange?: (memberId: string, category: string) => void;
  categories?: Array<{ value: string; label: string }>;
  showActions?: boolean;
}

export function TeamMemberGrid({
  members,
  onMemberClick,
  onMemberEdit,
  onMemberRemove,
  onMemberEditRole,
  onCategoryChange,
  categories = [],
  showActions = true,
}: TeamMemberGridProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
      {members.map((member) => (
        <TeamMemberCard
          key={member.id}
          id={member.id}
          name={member.name}
          email={member.email}
          role={member.role}
          avatarUrl={member.avatarUrl}
          type={member.type}
          extraCategories={member.extraCategories}
          onClick={() => onMemberClick?.(member)}
          onEdit={onMemberEdit ? () => onMemberEdit(member) : undefined}
          onRemove={onMemberRemove ? () => onMemberRemove(member) : undefined}
          onEditRole={onMemberEditRole ? () => onMemberEditRole(member) : undefined}
          onCategoryChange={onCategoryChange ? (cat) => onCategoryChange(member.id, cat) : undefined}
          categories={categories}
          currentCategory={member.currentCategory}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
