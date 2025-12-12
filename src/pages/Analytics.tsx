import { usePageTitle } from '@/hooks/useCommon';
import { 
  MonthlyTrendChart, 
  EarningsTrendChart, 
  PlatformBreakdownChart, 
  RecentActivityFeed,
  AnalyticsSummaryCards 
} from '@/components/AnalyticsCharts';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  usePageTitle('Analytics');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-primary rounded-xl">
          <BarChart3 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Visualiza el rendimiento de tu actividad
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <AnalyticsSummaryCards />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTrendChart />
        <EarningsTrendChart />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformBreakdownChart />
        <RecentActivityFeed />
      </div>
    </div>
  );
}
