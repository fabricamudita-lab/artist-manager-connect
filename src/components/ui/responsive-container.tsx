import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = '6xl',
  padding = 'md'
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "mx-auto w-full",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ResponsiveContainer maxWidth="6xl" padding="lg" className={cn("py-8", className)}>
      {children}
    </ResponsiveContainer>
  );
}