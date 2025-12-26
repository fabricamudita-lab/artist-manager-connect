import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ArtistSubfolder {
  id: string;
  artist_id: string;
  category: string;
  name: string;
  is_default: boolean;
  booking_id: string | null;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Default subfolders for specific categories
export const DEFAULT_SUBFOLDERS: Record<string, string[]> = {
  audiovisuales: ['Reels'],
  conciertos: ['Carteles Gira', 'Stage', 'Conciertos'],
};

export const useArtistSubfolders = (artistId: string | null, category?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch ALL subfolders for an artist and category (flat list, we'll build tree in UI)
  const { data: subfolders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['artist-subfolders', artistId, category],
    queryFn: async () => {
      if (!artistId || !category) return [];

      const { data, error } = await supabase
        .from('artist_subfolders')
        .select('*')
        .eq('artist_id', artistId)
        .eq('category', category)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as ArtistSubfolder[];
    },
    enabled: !!artistId && !!category,
  });

  // Get subfolders for a specific parent (null = root level)
  const getSubfoldersForParent = (parentId: string | null) => {
    return subfolders.filter(sf => sf.parent_id === parentId);
  };

  // Get folder by ID
  const getFolderById = (folderId: string) => {
    return subfolders.find(sf => sf.id === folderId);
  };

  // Get breadcrumb path for a folder
  const getBreadcrumbPath = (folderId: string | null): ArtistSubfolder[] => {
    if (!folderId) return [];
    const path: ArtistSubfolder[] = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const folder = subfolders.find(sf => sf.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id;
      } else {
        break;
      }
    }
    
    return path;
  };

  // Create default subfolders for a category
  const ensureDefaultSubfolders = useMutation({
    mutationFn: async ({ artistId: aid, category: cat }: { artistId: string; category: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const defaults = DEFAULT_SUBFOLDERS[cat] || [];
      if (defaults.length === 0) return [];

      // Check which defaults already exist at root level
      const { data: existing } = await supabase
        .from('artist_subfolders')
        .select('name')
        .eq('artist_id', aid)
        .eq('category', cat)
        .eq('is_default', true)
        .is('parent_id', null);

      const existingNames = new Set((existing || []).map(s => s.name));
      const toCreate = defaults.filter(name => !existingNames.has(name));

      if (toCreate.length === 0) return existing || [];

      const { data, error } = await supabase
        .from('artist_subfolders')
        .insert(
          toCreate.map(name => ({
            artist_id: aid,
            category: cat,
            name,
            is_default: true,
            parent_id: null,
            created_by: user.id,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-subfolders', artistId, category] });
    },
  });

  // Create a new subfolder (with optional parent_id for nesting)
  const createSubfolder = useMutation({
    mutationFn: async ({ 
      artistId: aid, 
      category: cat, 
      name,
      parentId,
      bookingId 
    }: { 
      artistId: string; 
      category: string; 
      name: string;
      parentId?: string | null;
      bookingId?: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('artist_subfolders')
        .insert({
          artist_id: aid,
          category: cat,
          name,
          is_default: false,
          parent_id: parentId || null,
          booking_id: bookingId || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-subfolders', artistId, category] });
      toast({
        title: "Carpeta creada",
        description: "La carpeta se ha creado correctamente",
      });
    },
    onError: (error: any) => {
      console.error('Create subfolder error:', error);
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "Ya existe una carpeta con ese nombre en esta ubicación",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear la carpeta",
          variant: "destructive",
        });
      }
    },
  });

  // Delete a subfolder (cascade will delete children)
  const deleteSubfolder = useMutation({
    mutationFn: async (subfolderId: string) => {
      const { error } = await supabase
        .from('artist_subfolders')
        .delete()
        .eq('id', subfolderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-subfolders', artistId, category] });
      toast({
        title: "Carpeta eliminada",
        description: "La carpeta y su contenido se han eliminado correctamente",
      });
    },
    onError: (error) => {
      console.error('Delete subfolder error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la carpeta",
        variant: "destructive",
      });
    },
  });

  // Rename a subfolder
  const renameSubfolder = useMutation({
    mutationFn: async ({ subfolderId, newName }: { subfolderId: string; newName: string }) => {
      const { error } = await supabase
        .from('artist_subfolders')
        .update({ name: newName })
        .eq('id', subfolderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-subfolders', artistId, category] });
      toast({
        title: "Carpeta renombrada",
        description: "La carpeta se ha renombrado correctamente",
      });
    },
    onError: (error) => {
      console.error('Rename subfolder error:', error);
      toast({
        title: "Error",
        description: "No se pudo renombrar la carpeta",
        variant: "destructive",
      });
    },
  });

  return {
    subfolders,
    isLoading,
    error,
    refetch,
    getSubfoldersForParent,
    getFolderById,
    getBreadcrumbPath,
    ensureDefaultSubfolders: ensureDefaultSubfolders.mutate,
    createSubfolder: createSubfolder.mutate,
    deleteSubfolder: deleteSubfolder.mutate,
    renameSubfolder: renameSubfolder.mutate,
    isCreating: createSubfolder.isPending,
    isDeleting: deleteSubfolder.isPending,
  };
};
