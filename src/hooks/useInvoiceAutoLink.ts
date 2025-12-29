import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BudgetItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  invoice_link?: string;
  contact_id?: string;
  contacts?: {
    id: string;
    name: string;
  };
}

interface AutoLinkResult {
  itemId: string;
  itemName: string;
  confidence: number;
  matchReasons: string[];
}

interface UploadedInvoice {
  fileName: string;
  fileUrl: string;
  storagePath: string;
}

// Normalize strings for comparison
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Extract numbers from filename (potential amount)
const extractAmountFromFileName = (fileName: string): number | null => {
  // Match patterns like: 150, 150.00, 150,00, 1500€, €1500
  const patterns = [
    /(\d{1,6}[.,]\d{2})/, // 150.00 or 150,00
    /(\d{1,6})(?:€|eur|euros?)?/i, // 150€ or 150 euros
    /€(\d{1,6})/i, // €150
  ];
  
  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      const numStr = match[1].replace(',', '.');
      const amount = parseFloat(numStr);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }
  return null;
};

// Check if amounts are similar (within 5% or €1 tolerance)
const amountsMatch = (amount1: number, amount2: number): boolean => {
  const tolerance = Math.max(1, Math.min(amount1, amount2) * 0.05);
  return Math.abs(amount1 - amount2) <= tolerance;
};

// Find matching budget item
export const findMatchingBudgetItem = (
  fileName: string,
  budgetItems: BudgetItem[]
): AutoLinkResult | null => {
  const normalizedFileName = normalizeString(fileName);
  const fileAmount = extractAmountFromFileName(fileName);
  
  let bestMatch: AutoLinkResult | null = null;
  
  for (const item of budgetItems) {
    // Skip items that already have an invoice
    if (item.invoice_link) continue;
    
    const matchReasons: string[] = [];
    let confidence = 0;
    
    const normalizedItemName = normalizeString(item.name);
    const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
    
    // Check name match (words from item name appear in filename)
    const itemWords = normalizedItemName.split(' ').filter(w => w.length > 2);
    const matchingWords = itemWords.filter(word => normalizedFileName.includes(word));
    
    if (matchingWords.length > 0) {
      const nameMatchRatio = matchingWords.length / itemWords.length;
      confidence += nameMatchRatio * 0.4; // Up to 40% for name match
      matchReasons.push(`Concepto: "${matchingWords.join(', ')}"`);
    }
    
    // Check contact name match
    if (item.contacts?.name) {
      const normalizedContactName = normalizeString(item.contacts.name);
      const contactWords = normalizedContactName.split(' ').filter(w => w.length > 2);
      const matchingContactWords = contactWords.filter(word => normalizedFileName.includes(word));
      
      if (matchingContactWords.length > 0) {
        const contactMatchRatio = matchingContactWords.length / contactWords.length;
        confidence += contactMatchRatio * 0.3; // Up to 30% for contact match
        matchReasons.push(`Proveedor: "${item.contacts.name}"`);
      }
    }
    
    // Check amount match
    if (fileAmount && itemTotal > 0) {
      if (amountsMatch(fileAmount, itemTotal)) {
        confidence += 0.3; // 30% for exact amount match
        matchReasons.push(`Importe: €${itemTotal.toFixed(2)}`);
      }
    }
    
    // Only consider as match if confidence >= 50% (at least 2 criteria)
    if (confidence >= 0.5 && matchReasons.length >= 2) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          itemId: item.id,
          itemName: item.name,
          confidence,
          matchReasons,
        };
      }
    }
  }
  
  return bestMatch;
};

export const useInvoiceAutoLink = (budgetId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const [autoLinkSuggestions, setAutoLinkSuggestions] = useState<Map<string, AutoLinkResult>>(new Map());

  // Get the Facturas folder for this budget's booking
  const getFacturasFolder = useCallback(async (artistId: string, bookingId?: string): Promise<string | null> => {
    if (!bookingId) return null;
    
    // Find the event folder for this booking
    const { data: eventFolder } = await supabase
      .from('storage_nodes')
      .select('id')
      .eq('artist_id', artistId)
      .contains('metadata', { booking_id: bookingId })
      .eq('node_type', 'folder')
      .single();
    
    if (!eventFolder) return null;
    
    // Find the Facturas subfolder
    const { data: facturasFolder } = await supabase
      .from('storage_nodes')
      .select('id')
      .eq('parent_id', eventFolder.id)
      .eq('name', 'Facturas')
      .eq('node_type', 'folder')
      .single();
    
    return facturasFolder?.id || null;
  }, []);

  // Upload invoice to storage and optionally to Facturas folder
  const uploadInvoice = useCallback(async (
    file: File,
    budgetItems: BudgetItem[],
    artistId?: string,
    bookingId?: string
  ): Promise<{ fileUrl: string; autoLinkedItem?: AutoLinkResult } | null> => {
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${budgetId}/${fileName}`;
      
      // Upload to facturas bucket
      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(storagePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('facturas')
        .getPublicUrl(storagePath);
      
      const fileUrl = urlData.publicUrl;
      
      // Also save to storage_nodes if we have artist and booking
      if (artistId && bookingId) {
        const facturasFolderId = await getFacturasFolder(artistId, bookingId);
        
        if (facturasFolderId) {
          await supabase
            .from('storage_nodes')
            .insert({
              artist_id: artistId,
              parent_id: facturasFolderId,
              name: file.name,
              node_type: 'file',
              storage_path: storagePath,
              storage_bucket: 'facturas',
              file_url: fileUrl,
              file_size: file.size,
              file_type: file.type,
              metadata: { budget_id: budgetId, original_name: file.name },
              created_by: user.id,
            });
        }
      }
      
      // Try to auto-link
      const autoLinkedItem = findMatchingBudgetItem(file.name, budgetItems);
      
      if (autoLinkedItem && autoLinkedItem.confidence >= 0.6) {
        // High confidence: auto-link immediately
        await supabase
          .from('budget_items')
          .update({ invoice_link: fileUrl })
          .eq('id', autoLinkedItem.itemId);
        
        toast({
          title: 'Factura vinculada automáticamente',
          description: `"${file.name}" → ${autoLinkedItem.itemName} (${Math.round(autoLinkedItem.confidence * 100)}% coincidencia)`,
        });
        
        return { fileUrl, autoLinkedItem };
      } else if (autoLinkedItem) {
        // Lower confidence: suggest but don't auto-link
        setAutoLinkSuggestions(prev => new Map(prev).set(fileUrl, autoLinkedItem));
        
        toast({
          title: 'Posible coincidencia detectada',
          description: `"${file.name}" podría corresponder a "${autoLinkedItem.itemName}"`,
        });
        
        return { fileUrl, autoLinkedItem };
      }
      
      toast({
        title: 'Factura subida',
        description: file.name,
      });
      
      return { fileUrl };
    } catch (error: any) {
      console.error('Error uploading invoice:', error);
      toast({
        title: 'Error al subir factura',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [budgetId, getFacturasFolder]);

  // Confirm auto-link suggestion
  const confirmAutoLink = useCallback(async (fileUrl: string, itemId: string) => {
    const { error } = await supabase
      .from('budget_items')
      .update({ invoice_link: fileUrl })
      .eq('id', itemId);
    
    if (!error) {
      setAutoLinkSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileUrl);
        return newMap;
      });
      
      toast({
        title: 'Factura vinculada',
        description: 'El gasto ha sido asociado a la factura',
      });
    }
    
    return !error;
  }, []);

  // Dismiss auto-link suggestion
  const dismissAutoLink = useCallback((fileUrl: string) => {
    setAutoLinkSuggestions(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileUrl);
      return newMap;
    });
  }, []);

  // Scan existing files in Facturas folder and try to auto-link
  const scanAndAutoLink = useCallback(async (
    artistId: string,
    bookingId: string,
    budgetItems: BudgetItem[]
  ): Promise<AutoLinkResult[]> => {
    const facturasFolderId = await getFacturasFolder(artistId, bookingId);
    if (!facturasFolderId) return [];
    
    // Get all files in Facturas folder
    const { data: files } = await supabase
      .from('storage_nodes')
      .select('*')
      .eq('parent_id', facturasFolderId)
      .eq('node_type', 'file');
    
    if (!files || files.length === 0) return [];
    
    const results: AutoLinkResult[] = [];
    
    for (const file of files) {
      const match = findMatchingBudgetItem(file.name, budgetItems);
      if (match && match.confidence >= 0.5) {
        // Auto-link if high confidence
        if (match.confidence >= 0.6) {
          await supabase
            .from('budget_items')
            .update({ invoice_link: file.file_url })
            .eq('id', match.itemId);
          results.push(match);
        } else {
          // Add to suggestions
          setAutoLinkSuggestions(prev => new Map(prev).set(file.file_url || '', match));
        }
      }
    }
    
    if (results.length > 0) {
      toast({
        title: `${results.length} factura(s) vinculada(s) automáticamente`,
        description: 'Basado en coincidencias de nombre, importe y concepto',
      });
    }
    
    return results;
  }, [getFacturasFolder]);

  return {
    isUploading,
    autoLinkSuggestions,
    uploadInvoice,
    confirmAutoLink,
    dismissAutoLink,
    scanAndAutoLink,
  };
};
