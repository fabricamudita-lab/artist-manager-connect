import { useState } from 'react';
import { CashflowView } from '@/components/finanzas/CashflowView';
import Budgets from '@/pages/Budgets';

interface PagosTabProps {
  artistId: string;
}

export function PagosTab({ artistId }: PagosTabProps) {
  const [subView, setSubView] = useState<'cashflow' | 'presupuestos'>('cashflow');

  return (
    <div className="space-y-4">
      {/* Sub-view toggle */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setSubView('cashflow')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              subView === 'cashflow'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cashflow
          </button>
          <button
            onClick={() => setSubView('presupuestos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              subView === 'presupuestos'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Presupuestos
          </button>
        </div>
      </div>

      {/* Sub-view content */}
      {subView === 'cashflow' ? (
        <CashflowView artistId={artistId} />
      ) : (
        <BudgetsEmbedded />
      )}
    </div>
  );
}

/**
 * Wrapper that renders the Budgets page content without the
 * DashboardLayout (since it's already inside the FinanzasHub layout).
 * We set a flag to indicate it's embedded so it skips page title/header.
 */
function BudgetsEmbedded() {
  return (
    <div className="budgets-embedded">
      <Budgets embedded />
    </div>
  );
}
