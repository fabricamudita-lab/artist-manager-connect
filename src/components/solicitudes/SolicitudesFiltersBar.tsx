import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Music } from 'lucide-react';

interface ProfileSuggestion {
  id: string;
  full_name: string;
  email?: string | null;
  type: 'artist' | 'contact';
}

interface SolicitudesFiltersBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  profileSearchTerm: string;
  setProfileSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  showProfileSuggestions: boolean;
  setShowProfileSuggestions: (show: boolean) => void;
  profileSuggestions: ProfileSuggestion[];
}

export function SolicitudesFiltersBar({
  searchTerm,
  setSearchTerm,
  profileSearchTerm,
  setProfileSearchTerm,
  filterType,
  setFilterType,
  showProfileSuggestions,
  setShowProfileSuggestions,
  profileSuggestions,
}: SolicitudesFiltersBarProps) {
  const artistSuggestions = profileSuggestions.filter(p => p.type === 'artist');
  const contactSuggestions = profileSuggestions.filter(p => p.type === 'contact');
  const hasArtists = artistSuggestions.length > 0;
  const hasContacts = contactSuggestions.length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar solicitudes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="relative w-full sm:w-60">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar perfiles..."
          value={profileSearchTerm}
          onChange={(e) => { setProfileSearchTerm(e.target.value); setShowProfileSuggestions(true); }}
          onFocus={() => setShowProfileSuggestions(true)}
          onBlur={() => setTimeout(() => setShowProfileSuggestions(false), 150)}
          className="pl-9 h-9 text-sm"
        />
        {showProfileSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover text-popover-foreground shadow-md">
            <ul className="max-h-72 overflow-auto py-1">
              {profileSearchTerm.trim().length === 0 && !hasArtists ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">Escribe para buscar perfiles…</li>
              ) : (
                <>
                  {hasArtists && (
                    <>
                      <li className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                        Artistas
                      </li>
                      {artistSuggestions.map((p) => (
                        <li key={`artist-${p.id}`}>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                            onMouseDown={(e) => { e.preventDefault(); setProfileSearchTerm(p.full_name || ''); setShowProfileSuggestions(false); }}
                          >
                            <Music className="w-3 h-3 text-primary" />
                            <span className="font-medium">{p.full_name}</span>
                          </button>
                        </li>
                      ))}
                    </>
                  )}
                  {hasContacts && (
                    <>
                      <li className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                        Contactos en solicitudes
                      </li>
                      {contactSuggestions.map((p) => (
                        <li key={`contact-${p.id}`}>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                            onMouseDown={(e) => { e.preventDefault(); setProfileSearchTerm(p.full_name || ''); setShowProfileSuggestions(false); }}
                          >
                            <div className="font-medium">{p.full_name}</div>
                            {p.email ? <div className="text-xs text-muted-foreground">{p.email}</div> : null}
                          </button>
                        </li>
                      ))}
                    </>
                  )}
                  {!hasArtists && !hasContacts && profileSearchTerm.trim().length > 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
                  )}
                </>
              )}
              {profileSearchTerm && (
                <li className="border-t">
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(e) => { e.preventDefault(); setProfileSearchTerm(''); setShowProfileSuggestions(false); }}
                  >
                    Limpiar filtro
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="entrevista">Entrevista</SelectItem>
          <SelectItem value="booking">Booking</SelectItem>
          <SelectItem value="consulta">Consulta</SelectItem>
          <SelectItem value="informacion">Información</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
