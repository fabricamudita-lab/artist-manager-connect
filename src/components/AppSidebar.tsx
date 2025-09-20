import RoleSelector from '@/components/RoleSelector';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Calendar, 
  FileText, 
  MessageCircle, 
  DollarSign, 
  Users, 
  Send,
  LogOut,
  Music,
  Menu,
  Calculator,
  ClipboardList,
  Folder,
  Mic,
  FileImage
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import NotificationBell from './NotificationBell';
import { useState } from 'react';

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Presupuestos", url: "/budgets", icon: Calculator },
  { title: "Booking", url: "/booking", icon: Calendar },
  { title: "EPKs", url: "/epks", icon: Mic },
  { title: "Contactos", url: "/contacts", icon: Users },
];

const managementItems = [
  { title: "Proyectos", url: "/projects", icon: Folder },
  { title: "Solicitudes", url: "/solicitudes", icon: ClipboardList },
  { title: "Aprobaciones", url: "/approvals", icon: Send },
];

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      return currentPath === pathname && location.search.includes(query);
    }
    return currentPath === path;
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  return (
    <Card className={`h-screen border-r rounded-none ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-200 bg-sidebar border-sidebar-border`}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-soft">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">MOODITA</h1>
                <p className="text-xs text-sidebar-foreground/60">Gestión Artística</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-2 space-y-6">
          {/* Main Navigation */}
          <div>
            {!isCollapsed && (
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Principal
              </h3>
            )}
            <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={({ isActive: navIsActive }) =>
                  `nav-item group ${
                    navIsActive
                      ? 'active bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                {!isCollapsed && <span className="font-medium">{item.title}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                    {item.title}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

          {/* Management Tools */}
          {profile?.active_role === 'management' && (
            <div>
              {!isCollapsed && (
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Gestión
                </h3>
              )}
              <nav className="space-y-1">
                {managementItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={({ isActive: navIsActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.url)
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          {!isCollapsed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {profile?.active_role}
                  </p>
                </div>
                <NotificationBell />
              </div>
              <RoleSelector />
            </div>
          )}
          
          <Button
            variant="outline"
            size={isCollapsed ? "icon" : "sm"}
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
          
          {isCollapsed && (
            <div className="flex justify-center">
              <NotificationBell />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}