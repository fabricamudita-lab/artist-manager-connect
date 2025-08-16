import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { ValidationError, ValidationWarning } from '@/lib/bookingValidations';

interface AlertsBadgeProps {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function AlertsBadge({ errors, warnings }: AlertsBadgeProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="badge-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              OK
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sin alertas ni errores</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const allIssues = [...errors, ...warnings];
  const hasBlocking = errors.length > 0;
  const hasRedWarnings = warnings.some(w => w.severity === 'red');
  
  let badgeClass = '';
  let icon = null;
  let summary = '';

  if (hasBlocking) {
    badgeClass = 'badge-error';
    icon = <XCircle className="w-3 h-3 mr-1" />;
    summary = `${errors.length} Error${errors.length > 1 ? 'es' : ''}`;
  } else if (hasRedWarnings) {
    badgeClass = 'badge-error';
    icon = <AlertTriangle className="w-3 h-3 mr-1" />;
    summary = `${warnings.length} Alerta${warnings.length > 1 ? 's' : ''}`;
  } else {
    badgeClass = 'badge-warning';
    icon = <AlertTriangle className="w-3 h-3 mr-1" />;
    summary = `${warnings.length} Aviso${warnings.length > 1 ? 's' : ''}`;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={badgeClass}>
            {icon}
            {summary}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-80">
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={`error-${index}`} className="flex items-start gap-2 text-destructive">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Error de validación:</div>
                  <div className="text-sm">{error.message}</div>
                </div>
              </div>
            ))}
            {warnings.map((warning, index) => (
              <div key={`warning-${index}`} className={`flex items-start gap-2 ${
                warning.severity === 'red' ? 'text-destructive' : 'text-warning'
              }`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Aviso:</div>
                  <div className="text-sm">{warning.message}</div>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}