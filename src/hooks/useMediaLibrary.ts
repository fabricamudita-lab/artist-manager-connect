import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MediaLibraryItem {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_path: string;
  file_bucket: string;
  file_type: string; // Allow any string from database
  file_size?: number;
  mime_type?: string;
  tags: string[];
  category?: string;
  subcategory?: string;
  width?: number;
  height?: number;
  duration?: number;
  platform?: string;
  video_id?: string;
  usage_count: number;
  created_at: string;
  created_by: string;
  workspace_id?: string;
}

interface MediaLibraryFilters {
  type?: string;
  category?: string;
  tags?: string[];
  search?: string;
}

export const useMediaLibrary = () => {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<MediaLibraryFilters>({});

  const fetchMediaLibrary = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('file_type', filters.type);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching media library:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la librería de medios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (mediaData: any) => {
    try {
      const { data, error } = await supabase
        .from('media_library')
        .insert([{
          ...mediaData,
          created_by: mediaData.created_by || (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setItems(prev => [data, ...prev]);
      
      toast({
        title: "Éxito",
        description: "Archivo añadido a la librería"
      });

      return data;
    } catch (error) {
      console.error('Error adding to media library:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el archivo a la librería",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateUsage = async (itemId: string) => {
    try {
      await supabase
        .from('media_library')
        .update({ 
          usage_count: items.find(i => i.id === itemId)?.usage_count + 1 || 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', itemId);
    } catch (error) {
      console.error('Error updating usage:', error);
    }
  };

  const checkDuplicate = async (filePath: string, fileName: string): Promise<MediaLibraryItem | null> => {
    try {
      const { data } = await supabase
        .from('media_library')
        .select('*')
        .or(`file_path.eq.${filePath},title.eq.${fileName}`)
        .limit(1);

      return data?.[0] || null;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchMediaLibrary();
  }, [filters]);

  return {
    items,
    loading,
    filters,
    setFilters,
    fetchMediaLibrary,
    addToLibrary,
    updateUsage,
    checkDuplicate
  };
};