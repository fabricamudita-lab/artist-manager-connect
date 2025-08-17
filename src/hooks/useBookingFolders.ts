import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BookingOffer {
  id: string;
  fecha?: string;
  ciudad?: string;
  festival_ciclo?: string;
  lugar?: string;
  formato?: string;
  estado?: string;
}

interface FolderMetadata {
  id_oferta: string;
  fecha: string;
  ciudad: string;
  lugar: string;
  formato: string;
  estado: string;
}

export function useBookingFolders() {
  const [loading, setLoading] = useState(false);

  const generateFolderName = (offer: BookingOffer): string => {
    const date = offer.fecha ? new Date(offer.fecha).toISOString().split('T')[0] : 'sin-fecha';
    const ciudad = offer.ciudad || 'sin-ciudad';
    const festival = offer.festival_ciclo || 'sin-festival';
    
    return `[${date}] - ${ciudad} - ${festival}`;
  };

  const createEventFolder = useCallback(async (offer: BookingOffer): Promise<string | null> => {
    if (!offer.id || !offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      console.log('Missing required fields for folder creation');
      return null;
    }

    setLoading(true);
    
    try {
      const folderName = generateFolderName(offer);
      const folderPath = `events/${folderName}/`;
      
      // Create metadata object
      const metadata: FolderMetadata = {
        id_oferta: offer.id,
        fecha: offer.fecha,
        ciudad: offer.ciudad || '',
        lugar: offer.lugar || '',
        formato: offer.formato || '',
        estado: offer.estado || ''
      };

      // Create subfolders by uploading placeholder files
      const subfolders = ['Assets', 'Facturas', 'Presupuesto', 'Contrato', 'Sendings'];
      const metadataContent = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataContent], { type: 'application/json' });
      
      // Create main metadata file
      const { error: mainError } = await supabase.storage
        .from('documents')
        .upload(`${folderPath}metadata.json`, metadataBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (mainError) {
        console.error('Error creating main folder:', mainError);
        throw mainError;
      }

      // Create subfolders with placeholder files
      for (const subfolder of subfolders) {
        const placeholderContent = `# ${subfolder}\n\nEsta carpeta está destinada para ${subfolder.toLowerCase()}.`;
        const placeholderBlob = new Blob([placeholderContent], { type: 'text/plain' });
        
        const { error } = await supabase.storage
          .from('documents')
          .upload(`${folderPath}${subfolder}/.keep`, placeholderBlob, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error(`Error creating subfolder ${subfolder}:`, error);
        }
      }

      console.log('Event folder with subfolders created:', folderPath);
      return folderPath;
    } catch (error) {
      console.error('Error creating event folder:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la carpeta del evento.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkFolderExists = useCallback(async (offer: BookingOffer): Promise<boolean> => {
    if (!offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      return false;
    }

    try {
      const folderName = generateFolderName(offer);
      const folderPath = `events/${folderName}/metadata.json`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .list(`events/${folderName}`, {
          limit: 1,
          search: 'metadata.json'
        });

      if (error) {
        console.error('Error checking folder:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking folder existence:', error);
      return false;
    }
  }, []);

  const openFolder = useCallback((offer: BookingOffer, onOpenFolderDialog?: (offer: BookingOffer) => void) => {
    if (!offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      toast({
        title: "Error",
        description: "No se puede abrir la carpeta: faltan datos del evento.",
        variant: "destructive",
      });
      return;
    }

    if (onOpenFolderDialog) {
      onOpenFolderDialog(offer);
    } else {
      // Fallback to showing folder path
      const folderName = generateFolderName(offer);
      toast({
        title: "Carpeta del evento",
        description: `Carpeta: ${folderName}`,
      });
    }
  }, []);

  const updateFolderMetadata = useCallback(async (offer: BookingOffer): Promise<void> => {
    if (!offer.id || !offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      return;
    }

    try {
      const folderName = generateFolderName(offer);
      const folderPath = `events/${folderName}/`;
      
      // Update metadata
      const metadata: FolderMetadata = {
        id_oferta: offer.id,
        fecha: offer.fecha,
        ciudad: offer.ciudad || '',
        lugar: offer.lugar || '',
        formato: offer.formato || '',
        estado: offer.estado || ''
      };

      const metadataContent = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataContent], { type: 'application/json' });
      
      const { error } = await supabase.storage
        .from('documents')
        .update(`${folderPath}metadata.json`, metadataBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Error updating folder metadata:', error);
      }
    } catch (error) {
      console.error('Error updating folder metadata:', error);
    }
  }, []);

  return {
    createEventFolder,
    checkFolderExists,
    openFolder,
    updateFolderMetadata,
    generateFolderName,
    loading
  };
}