import { Inbox, Send, FileEdit, Trash2, Archive, Plus, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EmailFolder, folderLabels, MockEmailAccount, MockEmailMessage } from '@/lib/emailMockData';

const folderIcons: Record<EmailFolder, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  trash: Trash2,
  archive: Archive,
};

interface EmailSidebarProps {
  activeFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  accounts: MockEmailAccount[];
  emails: MockEmailMessage[];
  onCompose: () => void;
}

export default function EmailSidebar({ activeFolder, onFolderChange, accounts, emails, onCompose }: EmailSidebarProps) {
  const folders: EmailFolder[] = ['inbox', 'sent', 'drafts', 'trash', 'archive'];

  const getUnreadCount = (folder: EmailFolder) => {
    return emails.filter(e => e.folder === folder && !e.is_read).length;
  };

  return (
    <div className="w-56 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-3">
        <Button onClick={onCompose} className="w-full gap-2 bg-gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          Redactar
        </Button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {folders.map(folder => {
          const Icon = folderIcons[folder];
          const unread = getUnreadCount(folder);
          const isActive = activeFolder === folder;

          return (
            <button
              key={folder}
              onClick={() => onFolderChange(folder)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{folderLabels[folder]}</span>
              {unread > 0 && (
                <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {unread}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      <Separator />

      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Cuentas</p>
        {accounts.map(account => (
          <div key={account.id} className="flex items-center gap-2 px-1 py-1.5">
            <Mail className={cn(
              'w-3.5 h-3.5',
              account.provider === 'gmail' ? 'text-destructive' : 'text-accent'
            )} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{account.display_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{account.email_address}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
