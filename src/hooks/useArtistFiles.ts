import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// Standard folder categories for every artist
export const ARTIST_FOLDER_CATEGORIES = [
  { id: 'audiovisuales', name: 'AUDIOVISUALES',            icon: 'Video',       description: 'Vídeos, clips, making-of' },
  { id: 'conciertos',    name: 'CONCIERTOS',                icon: 'Music',       description: 'Riders, hojas de ruta' },
  { id: 'contratos',     name: 'CONTRATOS / LEGAL',         icon: 'FileText',    description: 'PDFs firmados, acuerdos' },
  { id: 'diseno',        name: 'DISEÑO',                    icon: 'Palette',     description: 'Artes, logos, flyers' },
  { id: 'distribucion',  name: 'DISTRIBUCIÓN DIGITAL',      icon: 'Share2',      description: 'Pitches, UPC/ISRC, reportes' },
  { id: 'economia',      name: 'PRESUPUESTOS Y FACTURAS',   icon: 'Calculator',  description: 'Liquidaciones, facturas' },
  { id: 'imagenes',      name: 'IMÁGENES',                  icon: 'Image',       description: 'Fotos prensa, EPK' },
  { id: 'marketing',     name: 'MARKETING',                 icon: 'Megaphone',   description: 'Campañas, contenido RRSS' },
  { id: 'merch',         name: 'MERCH',                     icon: 'ShoppingBag', description: 'Catálogos, proveedores' },
  { id: 'musica',        name: 'AUDIO (stems, masters)',    icon: 'Disc',        description: 'Archivos de audio, mixes' },
  { id: 'personal',      name: 'DOCUMENTOS DEL ARTISTA',   icon: 'User',        description: 'NIF, pasaporte, documentos' },
  { id: 'prensa',        name: 'PRENSA',                    icon: 'Newspaper',   description: 'Dossiers, notas de prensa' },
] as const;

export type FolderCategory = typeof ARTIST_FOLDER_CATEGORIES[number]['id'];

export interface ArtistFile {
  id: string;
  artist_id: string;
  category: string;
  subcategory: string | null;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export const useArtistFiles = (artistId: string | null, category?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Fetch files for an artist (optionally filtered by category)
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['artist-files', artistId, category],
    queryFn: async () => {
      if (!artistId) return [];
      
      let query = supabase
        .from('artist_files')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ArtistFile[];
    },
    enabled: !!artistId,
  });

  // Get file counts per category (includes artist_files + storage_nodes files + budgets)
  const { data: fileCounts = {} } = useQuery({
    queryKey: ['artist-files-counts', artistId],
    queryFn: async () => {
      if (!artistId) return {};
      
      const counts: Record<string, number> = {};

      // 1. Count from artist_files
      const { data: artistFilesData, error: artistFilesError } = await supabase
        .from('artist_files')
        .select('category')
        .eq('artist_id', artistId);

      if (!artistFilesError && artistFilesData) {
        artistFilesData.forEach(file => {
          counts[file.category] = (counts[file.category] || 0) + 1;
        });
      }

      // 2. Count files from storage_nodes (for conciertos category)
      const { data: storageFiles, error: storageError } = await supabase
        .from('storage_nodes')
        .select('id, node_type')
        .eq('artist_id', artistId)
        .eq('node_type', 'file');

      if (!storageError && storageFiles) {
        // All storage_node files go to conciertos category
        counts['conciertos'] = (counts['conciertos'] || 0) + storageFiles.length;
      }

      // 3. Count budgets linked to the artist (also part of conciertos)
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('id')
        .eq('artist_id', artistId);

      if (!budgetsError && budgets) {
        counts['conciertos'] = (counts['conciertos'] || 0) + budgets.length;
      }

      return counts;
    },
    enabled: !!artistId,
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      artistId: aid, 
      category: cat,
      subcategory 
    }: { 
      file: File; 
      artistId: string; 
      category: string;
      subcategory?: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${aid}/${cat}/${subcategory ? subcategory + '/' : ''}${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert record in database
      const { data, error: dbError } = await supabase
        .from('artist_files')
        .insert({
          artist_id: aid,
          category: cat,
          subcategory: subcategory || null,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-files', artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-files-counts', artistId] });
      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente",
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('Archivo no encontrado');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.file_path]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('artist_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-files', artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-files-counts', artistId] });
      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado correctamente",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    },
  });

  // Rename file mutation
  const renameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      const { data, error } = await supabase
        .from('artist_files')
        .update({ file_name: newName })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-files', artistId] });
      toast({
        title: "Archivo renombrado",
        description: "El nombre se ha actualizado correctamente",
      });
    },
    onError: (error) => {
      console.error('Rename error:', error);
      toast({
        title: "Error",
        description: "No se pudo renombrar el archivo",
        variant: "destructive",
      });
    },
  });

  // Move file to subfolder mutation
  const moveMutation = useMutation({
    mutationFn: async ({ fileId, subcategory }: { fileId: string; subcategory: string | null }) => {
      const { data, error } = await supabase
        .from('artist_files')
        .update({ subcategory })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-files', artistId] });
      toast({
        title: "Archivo movido",
        description: "El archivo se ha movido correctamente",
      });
    },
    onError: (error) => {
      console.error('Move error:', error);
      toast({
        title: "Error",
        description: "No se pudo mover el archivo",
        variant: "destructive",
      });
    },
  });

  // Upload multiple files
  const uploadFiles = async (filesToUpload: File[], aid: string, cat: string, subcategory?: string) => {
    for (const file of filesToUpload) {
      await uploadMutation.mutateAsync({ file, artistId: aid, category: cat, subcategory });
    }
  };

  return {
    files,
    fileCounts,
    isLoading,
    error,
    uploadFile: uploadMutation.mutate,
    uploadFiles,
    deleteFile: deleteMutation.mutate,
    renameFile: renameMutation.mutateAsync,
    moveFile: moveMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRenaming: renameMutation.isPending,
    isMoving: moveMutation.isPending,
    uploadProgress,
  };
};
