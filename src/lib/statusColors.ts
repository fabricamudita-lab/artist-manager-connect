// Mapeo de phases del Kanban a labels en español
export function getPhaseLabel(phase?: string): string {
  const normalizedPhase = phase?.toLowerCase().trim();
  
  switch (normalizedPhase) {
    case 'interes':
    case 'interés':
      return 'Interés';
    case 'oferta':
      return 'Oferta';
    case 'negociacion':
    case 'negociación':
      return 'Negociación';
    case 'confirmado':
    case 'confirmada':
      return 'Confirmado';
    case 'realizado':
      return 'Realizado';
    case 'facturado':
      return 'Facturado';
    case 'cerrado':
      return 'Cerrado';
    case 'cancelado':
    case 'cancelada':
      return 'Cancelado';
    default:
      return phase || 'Sin estado';
  }
}

export function getStatusBadgeVariant(estado?: string): "success" | "warning" | "accent" | "destructive" | "muted" | "secondary" | "outline" {
  const normalizedEstado = estado?.toLowerCase().trim();
  
  switch (normalizedEstado) {
    case 'confirmado': 
    case 'confirmada':
      return 'success';
    case 'realizado':
      return 'accent';
    case 'facturado':
      return 'secondary';
    case 'negociacion':
    case 'negociación':
      return 'accent';
    case 'oferta':
      return 'warning';
    case 'interés': 
    case 'interes':
      return 'outline';
    case 'cancelado': 
    case 'cancelada':
      return 'destructive';
    case 'cerrado':
      return 'muted';
    default: 
      return 'muted';
  }
}

// Mantener la función original para compatibilidad
export function getStatusBadgeColor(estado?: string) {
  const normalizedEstado = estado?.toLowerCase().trim();
  
  switch (normalizedEstado) {
    case 'confirmado': 
    case 'confirmada':
      return 'bg-success/10 text-success border-success/20 font-medium';
    case 'realizado':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-medium';
    case 'facturado':
      return 'bg-secondary/10 text-secondary-foreground border-secondary/20 font-medium';
    case 'negociacion':
    case 'negociación':
      return 'bg-accent/10 text-accent border-accent/20 font-medium';
    case 'oferta':
      return 'bg-warning/10 text-warning border-warning/20 font-medium';
    case 'interés': 
    case 'interes':
      return 'bg-muted/10 text-foreground border-border font-medium';
    case 'cancelado': 
    case 'cancelada':
      return 'bg-destructive/10 text-destructive border-destructive/20 font-medium';
    case 'cerrado':
      return 'bg-muted/10 text-muted-foreground border-muted/20 font-medium';
    default: 
      return 'bg-muted/10 text-muted-foreground border-muted/20 font-medium';
  }
}