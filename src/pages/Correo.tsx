import { useState, useMemo } from 'react';
import { Search, RefreshCw, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import EmailSidebar from '@/components/email/EmailSidebar';
import EmailList from '@/components/email/EmailList';
import EmailDetail from '@/components/email/EmailDetail';
import EmailComposer from '@/components/email/EmailComposer';
import { mockEmails, mockAccounts, EmailFolder, MockEmailMessage } from '@/lib/emailMockData';
import { toast } from '@/hooks/use-toast';

export default function Correo() {
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emails, setEmails] = useState<MockEmailMessage[]>(mockEmails);
  const [searchQuery, setSearchQuery] = useState('');
  const [composerState, setComposerState] = useState<null | 'new' | { mode: 'reply' | 'forward'; email: MockEmailMessage }>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const filteredEmails = useMemo(() => {
    let result = emails.filter(e => e.folder === activeFolder);
    if (activeAccountId) {
      result = result.filter(e => e.account_id === activeAccountId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.subject.toLowerCase().includes(q) ||
        e.from_name.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [emails, activeFolder, searchQuery, activeAccountId]);

  const selectedEmail = selectedId ? emails.find(e => e.id === selectedId) : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
  };

  const handleToggleStar = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_starred: !e.is_starred } : e));
  };

  const handleFolderChange = (folder: EmailFolder) => {
    setActiveFolder(folder);
    setSelectedId(null);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <EmailSidebar
        activeFolder={activeFolder}
        onFolderChange={handleFolderChange}
        accounts={mockAccounts}
        emails={emails}
        onCompose={() => setComposerState('new')}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        activeAccountId={activeAccountId}
        onAccountChange={setActiveAccountId}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar correos..."
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: 'Sincronizando...', description: 'Los correos se actualizarán cuando se conecte una cuenta real.' })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* List + Detail */}
        <div className="flex-1 flex min-h-0">
          <div className="w-[340px] border-r flex flex-col">
            <EmailList
              emails={filteredEmails}
              selectedId={selectedId}
              onSelect={handleSelect}
              onToggleStar={handleToggleStar}
            />
          </div>

          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onReply={() => setComposerState({ mode: 'reply', email: selectedEmail })}
              onForward={() => setComposerState({ mode: 'forward', email: selectedEmail })}
              onArchive={() => {
                setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, folder: 'archive' } : e));
                setSelectedId(null);
                toast({ title: 'Archivado' });
              }}
              onDelete={() => {
                setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, folder: 'trash' } : e));
                setSelectedId(null);
                toast({ title: 'Movido a papelera' });
              }}
              onToggleStar={() => handleToggleStar(selectedEmail.id)}
              onAddLink={() => toast({ title: 'Vincular', description: 'Funcionalidad disponible cuando se conecte la base de datos.' })}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm">Selecciona un correo para ver su contenido</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      {composerState && (
        <EmailComposer
          onClose={() => setComposerState(null)}
          replyTo={
            composerState !== 'new' && composerState.mode === 'reply'
              ? { to: composerState.email.from_address, subject: composerState.email.subject }
              : undefined
          }
          forwardData={
            composerState !== 'new' && composerState.mode === 'forward'
              ? { subject: composerState.email.subject, body: composerState.email.body_html }
              : undefined
          }
        />
      )}
    </div>
  );
}
