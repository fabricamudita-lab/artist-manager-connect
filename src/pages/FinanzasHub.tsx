import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '@/hooks/useCommon';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistFilter } from '@/components/royalties/ArtistFilter';
import { Calculator, Receipt, CreditCard, FileSpreadsheet, Landmark, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FinanzasPanelTab } from '@/components/finanzas/FinanzasPanelTab';
import { CobrosTab } from '@/components/finanzas/CobrosTab';
import { PagosTab } from '@/components/finanzas/PagosTab';
import { LiquidacionesTab } from '@/components/finanzas/LiquidacionesTab';
import { FiscalTab } from '@/components/finanzas/FiscalTab';
import Budgets from '@/pages/Budgets';
import { useAutoRealizado } from '@/hooks/useAutoRealizado';
import { ForbiddenView } from '@/components/permissions/ForbiddenView';
import { useCan } from '@/hooks/useFunctionalPermissions';
import type { ModuleKey } from '@/lib/permissions/types';

const TABS = [
  { value: 'panel',         label: 'Panel',         icon: Calculator,     path: '/finanzas',                 module: 'cashflow' as ModuleKey },
  { value: 'cobros',        label: 'Cobros',        icon: Receipt,        path: '/finanzas/cobros',          module: 'cashflow' as ModuleKey },
  { value: 'pagos',         label: 'Pagos',         icon: CreditCard,     path: '/finanzas/pagos',           module: 'cashflow' as ModuleKey },
  { value: 'presupuestos',  label: 'Presupuestos',  icon: Wallet,         path: '/finanzas/presupuestos',    module: 'budgets'  as ModuleKey },
  { value: 'liquidaciones', label: 'Liquidaciones', icon: FileSpreadsheet,path: '/finanzas/liquidaciones',   module: 'cashflow' as ModuleKey },
  { value: 'fiscal',        label: 'Fiscal',        icon: Landmark,       path: '/finanzas/fiscal',          module: 'cashflow' as ModuleKey },
] as const;

type TabDef = typeof TABS[number];

function getTabFromPath(pathname: string): string {
  const match = TABS.find(t => t.path !== '/finanzas' && pathname.startsWith(t.path));
  return match?.value ?? 'panel';
}

export default function FinanzasHub() {
  usePageTitle('Finanzas');
  useAutoRealizado();
  const navigate = useNavigate();
  const location = useLocation();
  const { can, loading } = useCan();
  const [selectedArtist, setSelectedArtist] = useState(() => {
    return sessionStorage.getItem('finanzas-artist-filter') || 'all';
  });

  const handleArtistChange = (value: string) => {
    setSelectedArtist(value);
    sessionStorage.setItem('finanzas-artist-filter', value);
  };

  const activeTab = getTabFromPath(location.pathname);

  // Filtrar tabs por permiso funcional. Mientras carga, las dejamos pasar
  // para evitar parpadeo / redirects innecesarios.
  const visibleTabs: readonly TabDef[] = useMemo(
    () => TABS.filter(t => loading || can(t.module, 'view')),
    [loading, can],
  );

  // Si la tab activa no está permitida, redirigir a la primera visible.
  useEffect(() => {
    if (loading) return;
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.find(t => t.value === activeTab)) {
      navigate(visibleTabs[0].path, { replace: true });
    }
  }, [loading, activeTab, visibleTabs, navigate]);

  const handleTabChange = (value: string) => {
    const tab = visibleTabs.find(t => t.value === value);
    if (tab) navigate(tab.path);
  };

  // Sin tabs visibles: no tiene ni cashflow ni budgets.
  if (!loading && visibleTabs.length === 0) {
    return <ForbiddenView module="cashflow" required="view" />;
  }

  // Si la tab activa todavía no está autorizada (mientras llega el redirect),
  // no renderizamos su contenido para no disparar queries bloqueadas por RLS.
  const activeAllowed = visibleTabs.some(t => t.value === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Calculator className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
              <p className="text-muted-foreground">Panel de control económico</p>
            </div>
          </div>
          <ArtistFilter value={selectedArtist} onChange={handleArtistChange} />
        </div>

        {/* Tab navigation (solo tabs permitidas) */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {visibleTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-background"
              >
                <tab.icon className="h-4 w-4 mr-1.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tab content */}
        {activeAllowed && activeTab === 'panel' ? (
          <FinanzasPanelTab artistId={selectedArtist} />
        ) : activeAllowed && activeTab === 'cobros' ? (
          <CobrosTab artistId={selectedArtist} />
        ) : activeAllowed && activeTab === 'pagos' ? (
          <PagosTab artistId={selectedArtist} />
        ) : activeAllowed && activeTab === 'presupuestos' ? (
          <Budgets embedded artistId={selectedArtist !== 'all' ? selectedArtist : undefined} />
        ) : activeAllowed && activeTab === 'liquidaciones' ? (
          <LiquidacionesTab artistId={selectedArtist} />
        ) : activeAllowed && activeTab === 'fiscal' ? (
          <FiscalTab artistId={selectedArtist} />
        ) : null}
      </div>
    </div>
  );
}
