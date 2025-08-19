export function getStatusBadgeColor(estado?: string) {
  const normalizedEstado = estado?.toLowerCase().trim();
  
  switch (normalizedEstado) {
    case 'confirmado': 
    case 'confirmada':
      return 'bg-success/10 text-success border-success/20 font-medium';
    case 'interés': 
    case 'interes':
      return 'bg-warning/10 text-warning border-warning/20 font-medium';
    case 'propuesta': 
      return 'bg-accent/10 text-accent border-accent/20 font-medium';
    case 'cancelado': 
    case 'cancelada':
      return 'bg-destructive/10 text-destructive border-destructive/20 font-medium';
    default: 
      return 'bg-muted/10 text-muted-foreground border-muted/20 font-medium';
  }
}