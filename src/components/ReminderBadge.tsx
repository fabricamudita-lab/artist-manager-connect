import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Link, Truck } from 'lucide-react';
import { BookingReminder } from '@/hooks/useBookingReminders';

interface ReminderBadgeProps {
  reminders: BookingReminder[];
  variant?: 'default' | 'compact';
}

export function ReminderBadge({ reminders, variant = 'default' }: ReminderBadgeProps) {
  if (reminders.length === 0) return null;

  const getIcon = (type: BookingReminder['type']) => {
    switch (type) {
      case 'contract':
        return <FileText className="h-3 w-3" />;
      case 'sales_link':
        return <Link className="h-3 w-3" />;
      case 'logistics':
        return <Truck className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getVariantColor = (priority: BookingReminder['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (variant === 'compact') {
    const highPriorityCount = reminders.filter(r => r.priority === 'high').length;
    const totalCount = reminders.length;
    
    return (
      <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'} className="text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {totalCount}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {reminders.map((reminder) => (
        <Badge
          key={reminder.id}
          variant={getVariantColor(reminder.priority)}
          className="text-xs flex items-center gap-1"
          title={reminder.message}
        >
          {getIcon(reminder.type)}
          <span className="hidden sm:inline">
            {reminder.type === 'contract' && 'Contrato'}
            {reminder.type === 'sales_link' && 'Link venta'}
            {reminder.type === 'logistics' && 'Logística'}
          </span>
        </Badge>
      ))}
    </div>
  );
}