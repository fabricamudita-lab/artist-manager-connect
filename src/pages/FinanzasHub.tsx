import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '@/hooks/useCommon';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistFilter } from '@/components/royalties/ArtistFilter';
import { Calculator, Receipt, CreditCard, FileSpreadsheet, Landmark } from 'lucide-react';
import { useState } from 'react';
import { FinanzasPanelTab } from '@/components/finanzas/FinanzasPanelTab';
import { CobrosTab } from '@/components/finanzas/CobrosTab';
import { PagosTab } from '@/components/finanzas/PagosTab';
import { LiquidacionesTab } from '@/components/finanzas/LiquidacionesTab';
import { FiscalTab } from '@/components/finanzas/FiscalTab';

const TABS = [
  { value: 'panel', label: 'Panel', icon: Calculator, path: '/finanzas' },
  { value: 'cobros', label: 'Cobros', icon: Receipt, path: '/finanzas/cobros' },
  { value: 'pagos', label: 'Pagos', icon: CreditCard, path: '/finanzas/pagos' },
  { value: 'liquidaciones', label: 'Liquidaciones', icon: FileSpreadsheet, path: '/finanzas/liquidaciones' },
  { value: 'fiscal', label: 'Fiscal', icon: Landmark, path: '/finanzas/fiscal' },
] as const;

function getTabFromPath(pathname: string): string {
  const match = TABS.find(t => t.path !== '/finanzas' && pathname.startsWith(t.path));
  return match?.value ?? 'panel';
}

export default function FinanzasHub() {
  usePageTitle('Finanzas');
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedArtist, setSelectedArtist] = useState('all');

  const activeTab = getTabFromPath(location.pathname);

  const handleTabChange = (value: string) => {
    const tab = TABS.find(t => t.value === value);
    if (tab) navigate(tab.path);
  };

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
          <ArtistFilter value={selectedArtist} onChange={setSelectedArtist} />
        </div>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {TABS.map(tab => (
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
        {activeTab === 'panel' ? (
          <FinanzasPanelTab artistId={selectedArtist} />
        ) : activeTab === 'cobros' ? (
          <CobrosTab artistId={selectedArtist} />
        ) : activeTab === 'pagos' ? (
          <PagosTab artistId={selectedArtist} />
        ) : activeTab === 'liquidaciones' ? (
          <LiquidacionesTab artistId={selectedArtist} />
        ) : activeTab === 'fiscal' ? (
          <FiscalTab artistId={selectedArtist} />
        ) : null}
      </div>
    </div>
  );
}
