import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';

interface BookingOffer {
  id: string;
  fecha?: string;
  estado?: string;
  contratos?: string;
  link_venta?: string;
  ciudad?: string;
  lugar?: string;
}

export interface BookingReminder {
  id: string;
  type: 'contract' | 'sales_link' | 'logistics';
  message: string;
  priority: 'high' | 'medium' | 'low';
  daysUntilEvent: number;
}

export function useBookingReminders(bookings: BookingOffer[]) {
  const reminders = useMemo(() => {
    const today = new Date();
    const remindersByBooking: Record<string, BookingReminder[]> = {};

    bookings.forEach(booking => {
      if (booking.estado !== 'confirmado' || !booking.fecha) {
        return;
      }

      const eventDate = new Date(booking.fecha);
      const daysUntilEvent = differenceInDays(eventDate, today);
      const bookingReminders: BookingReminder[] = [];

      // Contract reminder - 30 days before
      if (daysUntilEvent <= 30 && daysUntilEvent > 0) {
        if (!booking.contratos || booking.contratos.trim() === '') {
          bookingReminders.push({
            id: `${booking.id}-contract`,
            type: 'contract',
            message: 'Contrato pendiente para este concierto',
            priority: 'high',
            daysUntilEvent,
          });
        }

        // Sales link reminder - 30 days before
        if (!booking.link_venta || booking.link_venta.trim() === '') {
          bookingReminders.push({
            id: `${booking.id}-sales`,
            type: 'sales_link',
            message: 'Falta link de venta para este concierto',
            priority: 'high',
            daysUntilEvent,
          });
        }
      }

      // Logistics reminder - 7 days before
      if (daysUntilEvent <= 7 && daysUntilEvent > 0) {
        bookingReminders.push({
          id: `${booking.id}-logistics`,
          type: 'logistics',
          message: 'Revisar logística del concierto',
          priority: 'medium',
          daysUntilEvent,
        });
      }

      if (bookingReminders.length > 0) {
        remindersByBooking[booking.id] = bookingReminders;
      }
    });

    return remindersByBooking;
  }, [bookings]);

  const getRemindersForBooking = (bookingId: string): BookingReminder[] => {
    return reminders[bookingId] || [];
  };

  const hasReminders = (bookingId: string): boolean => {
    return reminders[bookingId] && reminders[bookingId].length > 0;
  };

  const getAllActiveReminders = (): BookingReminder[] => {
    return Object.values(reminders).flat();
  };

  return {
    reminders,
    getRemindersForBooking,
    hasReminders,
    getAllActiveReminders,
  };
}