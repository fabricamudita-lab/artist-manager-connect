import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  "transition-all duration-200",
  {
    variants: {
      variant: {
        default: "hover:shadow-elevated",
        interactive: "cursor-pointer hover:shadow-elevated hover:scale-[1.02]",
        elevated: "shadow-elevated",
        floating: "shadow-floating",
        glass: "bg-card/80 backdrop-blur-md border-border/50",
      },
      size: {
        sm: "",
        md: "",
        lg: "p-8",
        xl: "p-12",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface DesignSystemCardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: ReactNode;
}

export function DesignSystemCard({ 
  className, 
  variant, 
  size, 
  children,
  ...props 
}: DesignSystemCardProps) {
  return (
    <Card 
      className={cn(cardVariants({ variant, size }), className)} 
      {...props}
    >
      {children}
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    period: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  icon,
  className 
}: MetricCardProps) {
  const getChangeColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      case 'neutral': return 'text-muted-foreground';
    }
  };

  return (
    <DesignSystemCard variant="default" className={cn("h-[120px]", className)}>
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
          
          {icon && (
            <div className="p-3 rounded-xl bg-muted/30 text-primary">
              {icon}
            </div>
          )}
        </div>

        {change && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", getChangeColor(change.direction))}>
                {change.direction === 'up' && '+'}
                {change.value}%
              </span>
              <span className="text-xs text-muted-foreground">
                {change.period}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </DesignSystemCard>
  );
}

// Professional empty state card
interface EmptyStateCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyStateCard({ 
  title, 
  description, 
  icon, 
  action,
  className 
}: EmptyStateCardProps) {
  return (
    <DesignSystemCard variant="glass" className={cn("text-center py-12", className)}>
      <CardContent className="space-y-6">
        {icon && (
          <div className="flex justify-center">
            <div className="p-4 rounded-xl bg-muted/30 text-muted-foreground">
              {icon}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        </div>
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}
      </CardContent>
    </DesignSystemCard>
  );
}