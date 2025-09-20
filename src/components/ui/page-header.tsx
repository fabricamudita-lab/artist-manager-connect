import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { ChevronRight, Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs, 
  actions,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("pb-6 border-b border-border", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
              {crumb.href ? (
                <a 
                  href={crumb.href} 
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className={index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  onClick?: () => void;
}

export function QuickAction({ 
  icon = <Plus className="h-4 w-4" />, 
  children, 
  variant = 'default',
  onClick 
}: QuickActionProps) {
  return (
    <Button 
      variant={variant} 
      onClick={onClick}
      className="h-10 px-4 font-medium"
    >
      {icon}
      {children}
    </Button>
  );
}