import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-primary',
  trend,
  className 
}: StatCardProps) {
  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      case 'neutral': return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-elevated", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {value}
              </p>
              {subtitle && (
                <p className="text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {Icon && (
            <div className={cn("p-3 rounded-xl bg-muted/30", iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>

        {trend && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", getTrendColor(trend.direction))}>
                {trend.direction === 'up' && '+'}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function StatsGrid({ 
  children, 
  className,
  columns = { default: 1, sm: 2, md: 3, lg: 4, xl: 5 }
}: StatsGridProps) {
  const getGridCols = () => {
    const cols = [];
    cols.push(`grid-cols-${columns.default}`);
    if (columns.sm) cols.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) cols.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) cols.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) cols.push(`xl:grid-cols-${columns.xl}`);
    return cols.join(' ');
  };

  return (
    <div className={cn("grid gap-6", getGridCols(), className)}>
      {children}
    </div>
  );
}

// Pre-built responsive configurations
export const statsGridConfigs = {
  // 1 column mobile, 2 tablet, 3 desktop
  balanced: { default: 1, sm: 2, lg: 3 },
  // 1 column mobile, 2 tablet, 4 desktop
  wide: { default: 1, sm: 2, lg: 4 },
  // 1 column mobile, 3 tablet, 5 desktop (for many stats)
  comprehensive: { default: 1, md: 3, xl: 5 },
  // 2 columns on all sizes except mobile
  compact: { default: 1, sm: 2 },
};