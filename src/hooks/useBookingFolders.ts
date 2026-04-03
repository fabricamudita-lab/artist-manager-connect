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
  folder_url?: string;
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
    
    // Remove invalid characters for storage paths: []<>:"|?* and normalize diacritics
    const sanitize = (str: string) => str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (í -> i)
      .replace(/[\[\]<>:"|?*]/g, '-') // Replace forbidden chars with dash
      .replace(/\s+/g, '_'); // Replace spaces with underscore
    
    return `${date}_${sanitize(ciudad)}_${sanitize(festival)}`;
  };

  const createEventFolder = useCallback(async (offer: BookingOffer): Promise<{ success: boolean; folderPath?: string; error?: string }> => {
    if (!offer.id || !offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      const error = `Missing required fields for folder creation - ID: ${offer.id}, Fecha: ${offer.fecha}, Ciudad: ${offer.ciudad}, Festival: ${offer.festival_ciclo}`;
      return { success: false, error };
    }

    setLoading(true);
    const folderName = generateFolderName(offer);
    const folderPath = `events/${folderName}/`;
    try {
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
        const errorMsg = mainError.message;
        // Check for permission/storage errors
        if (errorMsg.includes('permission') || errorMsg.includes('Permission') || 
            errorMsg.includes('access') || errorMsg.includes('Access') ||
            errorMsg.includes('write') || errorMsg.includes('storage quota')) {
          return { 
            success: false, 
            error: 'No hay permiso de escritura en /event-folders. Contacta al administrador del sistema.' 
          };
        }
        
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
        }
      }
      return { success: true, folderPath };
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      return { success: false, error: errorMsg };
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

  const renameEventFolder = useCallback(async (oldOffer: BookingOffer, newOffer: BookingOffer): Promise<{ success: boolean; error?: string }> => {
    // Check if renaming is needed
    const needsRename = oldOffer.fecha !== newOffer.fecha || 
                       oldOffer.ciudad !== newOffer.ciudad || 
                       oldOffer.festival_ciclo !== newOffer.festival_ciclo;

    if (!needsRename || !oldOffer.fecha || !oldOffer.ciudad || !oldOffer.festival_ciclo) {
      return { success: false, error: 'No es necesario renombrar o faltan datos' };
    }

    setLoading(true);
    const oldFolderName = generateFolderName(oldOffer);
    const newFolderName = generateFolderName(newOffer);
    const oldFolderPath = `events/${oldFolderName}/`;
    const newFolderPath = `events/${newFolderName}/`;
    try {
      if (oldFolderName === newFolderName) {
        // Just update metadata if folder name is the same
        await updateFolderMetadata(newOffer);
        return { success: false, error: 'Solo se actualizó metadata' };
      }

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
          }
        } catch (error) {
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
          }
        } catch (error) {
        }
      }

      // Delete old files after successful copy
      for (const { path } of allFiles) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('documents')
            .remove([path]);

          if (deleteError) {
          }
        } catch (error) {
        }
      }
      toast({
        title: "Carpeta renombrada",
        description: "La carpeta del evento se ha actualizado con los nuevos datos.",
      });

      return { success: true };
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      toast({
        title: "Error",
        description: "No se pudo renombrar la carpeta del evento.",
        variant: "destructive",
      });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [generateFolderName, updateFolderMetadata]);

  const generateSendingsShareLink = useCallback(async (offer: BookingOffer): Promise<string | null> => {
    if (!offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      return null;
    }

    try {
      const folderName = generateFolderName(offer);
      const sendingsPath = `events/${folderName}/Sendings`;
      
      // Create a signed URL that expires in 7 days
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(`${sendingsPath}/.keep`, 60 * 60 * 24 * 7); // 7 days

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      // Extract the base URL and create a shareable folder link
      const baseUrl = data.signedUrl.split('/.keep')[0];
      return baseUrl;
    } catch (error) {
      console.error('Error generating share link:', error);
      return null;
    }
  }, [generateFolderName]);

  const checkContractExists = useCallback(async (offer: BookingOffer): Promise<boolean> => {
    if (!offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
      return false;
    }

    try {
      const folderName = generateFolderName(offer);
      const { data, error } = await supabase.storage
        .from('documents')
        .list(`events/${folderName}/Contrato`, {
          limit: 10
        });

      if (error) {
        console.error('Error checking contract folder:', error);
        return false;
      }

      // Filter out .keep files
      const files = (data || []).filter(file => file.name !== '.keep');
      return files.length > 0;
    } catch (error) {
      console.error('Error checking contract existence:', error);
      return false;
    }
  }, [generateFolderName]);

  const backfillEventFolders = useCallback(async (): Promise<{ created: number; updated: number }> => {
    setLoading(true);
    let created = 0;
    let updated = 0;

    try {
      // Get all booking offers without folder_url
      const { data: offers, error } = await supabase
        .from('booking_offers')
        .select('*')
        .or('folder_url.is.null,folder_url.eq.')
        .order('fecha', { ascending: true });

      if (error) throw error;

      // Filter offers that have the required fields
      const validOffers = (offers || []).filter(offer => 
        offer.fecha && offer.ciudad && offer.festival_ciclo
      );
      for (const offer of validOffers) {
        try {
          // Double-check required fields before creating
          if (!offer.fecha || !offer.ciudad || !offer.festival_ciclo) {
            continue;
          }
          // Create folder for this offer
          const folderUrl = await createEventFolder(offer);
          
          if (folderUrl) {
            // Update the offer with the folder URL
            const publicUrl = `https://hptjzbaiclmgbvxlmllo.supabase.co/storage/v1/object/public/documents/${folderUrl}`;
            
            const { error: updateError } = await supabase
              .from('booking_offers')
              .update({ folder_url: publicUrl })
              .eq('id', offer.id);

            if (updateError) {
              console.error('Error updating folder URL:', updateError);
            } else {
              created++;
            }
          }
        } catch (error) {
          console.error(`Error creating folder for offer ${offer.id}:`, error);
        }
      }

      // Also update existing folders that might need URL updates
      const { data: existingOffers, error: existingError } = await supabase
        .from('booking_offers')
        .select('*')
        .not('folder_url', 'is', null);

      if (!existingError && existingOffers) {
        for (const offer of existingOffers) {
          const folderName = generateFolderName(offer);
          const expectedUrl = `https://hptjzbaiclmgbvxlmllo.supabase.co/storage/v1/object/public/documents/events/${folderName}/`;
          
          if (offer.folder_url !== expectedUrl) {
            const { error: updateError } = await supabase
              .from('booking_offers')
              .update({ folder_url: expectedUrl })
              .eq('id', offer.id);

            if (!updateError) {
              updated++;
            }
          }
        }
      }

    } catch (error) {
      console.error('Error in backfill process:', error);
    } finally {
      setLoading(false);
    }

    return { created, updated };
  }, [createEventFolder, generateFolderName]);

  return {
    createEventFolder,
    checkFolderExists,
    openFolder,
    updateFolderMetadata,
    renameEventFolder,
    generateFolderName,
    generateSendingsShareLink,
    checkContractExists,
    backfillEventFolders,
    loading
  };
}