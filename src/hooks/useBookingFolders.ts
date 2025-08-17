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
  contratos?: string;
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

  const renameEventFolder = useCallback(async (oldOffer: BookingOffer, newOffer: BookingOffer): Promise<boolean> => {
    // Check if renaming is needed
    const needsRename = oldOffer.fecha !== newOffer.fecha || 
                       oldOffer.ciudad !== newOffer.ciudad || 
                       oldOffer.festival_ciclo !== newOffer.festival_ciclo;

    if (!needsRename || !oldOffer.fecha || !oldOffer.ciudad || !oldOffer.festival_ciclo) {
      return false;
    }

    setLoading(true);
    
    try {
      const oldFolderName = generateFolderName(oldOffer);
      const newFolderName = generateFolderName(newOffer);
      
      if (oldFolderName === newFolderName) {
        // Just update metadata if folder name is the same
        await updateFolderMetadata(newOffer);
        return false;
      }

      const oldFolderPath = `events/${oldFolderName}/`;
      const newFolderPath = `events/${newFolderName}/`;
      
      console.log('Renaming folder from:', oldFolderPath, 'to:', newFolderPath);

      // Get all files in the old folder structure
      const subfolders = ['Assets', 'Facturas', 'Presupuesto', 'Contrato', 'Sendings'];
      const allFiles: { path: string; newPath: string }[] = [];

      // Add main metadata file
      allFiles.push({
        path: `${oldFolderPath}metadata.json`,
        newPath: `${newFolderPath}metadata.json`
      });

      // Get files from each subfolder
      for (const subfolder of subfolders) {
        try {
          const { data: files, error } = await supabase.storage
            .from('documents')
            .list(`${oldFolderPath}${subfolder}`, {
              limit: 1000
            });

          if (!error && files) {
            files.forEach(file => {
              allFiles.push({
                path: `${oldFolderPath}${subfolder}/${file.name}`,
                newPath: `${newFolderPath}${subfolder}/${file.name}`
              });
            });
          }
        } catch (error) {
          console.error(`Error listing files in ${subfolder}:`, error);
        }
      }

      // Copy files to new location
      for (const { path, newPath } of allFiles) {
        try {
          // Download the file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(path);

          if (downloadError) {
            console.error(`Error downloading ${path}:`, downloadError);
            continue;
          }

          // Upload to new location
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(newPath, fileData, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error(`Error uploading ${newPath}:`, uploadError);
          }
        } catch (error) {
          console.error(`Error copying file ${path}:`, error);
        }
      }

      // Update folder metadata with new information
      await updateFolderMetadata(newOffer);

      // Update any booking contract links that reference the old folder
      if (newOffer.contratos && newOffer.contratos.includes(oldFolderPath)) {
        const updatedContractPath = newOffer.contratos.replace(oldFolderPath, newFolderPath);
        
        try {
          const { error: updateError } = await supabase
            .from('booking_offers')
            .update({ contratos: updatedContractPath })
            .eq('id', newOffer.id);

          if (updateError) {
            console.error('Error updating contract link:', updateError);
          }
        } catch (error) {
          console.error('Error updating booking contract link:', error);
        }
      }

      // Delete old files after successful copy
      for (const { path } of allFiles) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('documents')
            .remove([path]);

          if (deleteError) {
            console.error(`Error deleting old file ${path}:`, deleteError);
          }
        } catch (error) {
          console.error(`Error deleting ${path}:`, error);
        }
      }

      console.log('Folder renamed successfully');
      
      toast({
        title: "Carpeta renombrada",
        description: "La carpeta del evento se ha actualizado con los nuevos datos.",
      });

      return true;
    } catch (error) {
      console.error('Error renaming event folder:', error);
      toast({
        title: "Error",
        description: "No se pudo renombrar la carpeta del evento.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [generateFolderName, updateFolderMetadata]);

  return {
    createEventFolder,
    checkFolderExists,
    openFolder,
    updateFolderMetadata,
    renameEventFolder,
    generateFolderName,
    loading
  };
}