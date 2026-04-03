import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BookingOffer {
  id: string;
  fecha?: string | null;
  ciudad?: string | null;
  festival_ciclo?: string | null;
  venue?: string | null;
  artist_id?: string | null;
  estado?: string | null;
}

export const useBookingFolderAutomation = () => {
  const { user } = useAuth();

  /**
   * Generate folder name from booking data
   * Format: YYYY.MM.DD Event Name
   */
  const generateFolderName = useCallback((booking: BookingOffer): string => {
    const date = booking.fecha 
      ? format(new Date(booking.fecha), 'yyyy.MM.dd')
      : 'sin-fecha';
    
    const eventName = booking.festival_ciclo || booking.venue || booking.ciudad || 'Evento';
    
    // Clean up special characters
    const cleanName = eventName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim();
    
    return `${date} ${cleanName}`;
  }, []);

  /**
   * Create the complete folder structure for a confirmed booking
   * - Creates subfolder in CONCIERTOS > Conciertos
   * - Creates Facturas subfolder
   * - Creates placeholder files for Presupuesto and Hoja de Ruta
   */
  const createBookingFolder = useCallback(async (booking: BookingOffer): Promise<{
    success: boolean;
    subfolderId?: string;
    folderName?: string;
    error?: string;
  }> => {
    if (!user?.id || !booking.artist_id) {
      return { success: false, error: 'Missing user or artist ID' };
    }

    const folderName = generateFolderName(booking);

    try {
      // 1. Create the main event subfolder in CONCIERTOS category
      const { data: mainFolder, error: mainError } = await supabase
        .from('artist_subfolders')
        .insert({
          artist_id: booking.artist_id,
          category: 'conciertos',
          name: folderName,
          is_default: false,
          booking_id: booking.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (mainError) {
        // If it already exists, find it
        if (mainError.code === '23505') {
          const { data: existing } = await supabase
            .from('artist_subfolders')
            .select('id')
            .eq('artist_id', booking.artist_id)
            .eq('category', 'conciertos')
            .eq('booking_id', booking.id)
            .single();
          
          if (existing) {
            return { success: true, subfolderId: existing.id, folderName };
          }
        }
        throw mainError;
      }

      // 2. Create placeholder files for the booking
      const eventName = booking.festival_ciclo || booking.venue || 'Evento';
      
      // Create Presupuesto placeholder
      await supabase
        .from('artist_files')
        .insert({
          artist_id: booking.artist_id,
          category: 'conciertos',
          subcategory: folderName,
          file_name: `Presupuesto ${eventName}.txt`,
          file_path: `${booking.artist_id}/conciertos/${folderName}/presupuesto.txt`,
          file_url: 'placeholder',
          file_type: 'text/plain',
          file_size: 0,
          uploaded_by: user.id,
          booking_id: booking.id,
        });

      // Create Hoja de Ruta placeholder
      await supabase
        .from('artist_files')
        .insert({
          artist_id: booking.artist_id,
          category: 'conciertos',
          subcategory: folderName,
          file_name: 'Hoja de Ruta.txt',
          file_path: `${booking.artist_id}/conciertos/${folderName}/hoja-de-ruta.txt`,
          file_url: 'placeholder',
          file_type: 'text/plain',
          file_size: 0,
          uploaded_by: user.id,
          booking_id: booking.id,
        });
      return { 
        success: true, 
        subfolderId: mainFolder.id, 
        folderName 
      };
    } catch (error: any) {
      console.error('Error creating booking folder:', error);
      return { success: false, error: error.message };
    }
  }, [user?.id, generateFolderName]);

  /**
   * Sync booking with folder system when status changes to confirmed
   */
  const syncBookingFolder = useCallback(async (
    oldBooking: BookingOffer | null,
    newBooking: BookingOffer
  ): Promise<void> => {
    const oldStatus = oldBooking?.estado?.toLowerCase();
    const newStatus = newBooking.estado?.toLowerCase();

    // Only trigger when status changes TO confirmed
    if (newStatus === 'confirmado' && oldStatus !== 'confirmado') {
      if (!newBooking.artist_id) {
        return;
      }

      const result = await createBookingFolder(newBooking);
      
      if (result.success) {
        toast({
          title: "Carpeta creada",
          description: `Se ha creado la carpeta "${result.folderName}" en CONCIERTOS`,
        });
      } else if (result.error && !result.error.includes('duplicate')) {
        toast({
          title: "Aviso",
          description: "No se pudo crear la carpeta automáticamente",
          variant: "destructive",
        });
      }
    }
  }, [createBookingFolder]);

  return {
    createBookingFolder,
    syncBookingFolder,
    generateFolderName,
  };
};
