import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ProjectFile {
  id: string;
  project_id: string;
  folder_type: string;
  file_name: string;
  file_url: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export const PROJECT_FOLDERS = [
  { id: 'presupuestos', name: 'Presupuestos', icon: 'Calculator' },
  { id: 'hojas_de_ruta', name: 'Hojas de Ruta', icon: 'Map' },
  { id: 'fotos', name: 'Fotos', icon: 'Image' },
  { id: 'legal', name: 'Legal', icon: 'FileText' },
  { id: 'otros', name: 'Otros', icon: 'Folder' },
];

export function useProjectFiles(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Fetch files for a project
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('folder_type')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectFile[];
    },
    enabled: !!projectId,
  });

  // Group files by folder
  const filesByFolder = files.reduce((acc, file) => {
    if (!acc[file.folder_type]) {
      acc[file.folder_type] = [];
    }
    acc[file.folder_type].push(file);
    return acc;
  }, {} as Record<string, ProjectFile[]>);

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      folderType, 
      projectId: pid 
    }: { 
      file: File; 
      folderType: string; 
      projectId: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${pid}/${folderType}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // Insert record in database
      const { data, error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: pid,
          folder_type: folderType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_path: filePath,
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
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({
        title: 'Archivo subido',
        description: 'El archivo se ha subido correctamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al subir archivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (file: ProjectFile) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({
        title: 'Archivo eliminado',
        description: 'El archivo se ha eliminado correctamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al eliminar archivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Upload multiple files
  const uploadFiles = async (files: File[], folderType: string, pid: string) => {
    for (const file of files) {
      await uploadMutation.mutateAsync({ file, folderType, projectId: pid });
    }
  };

  return {
    files,
    filesByFolder,
    isLoading,
    error,
    uploadFile: uploadMutation.mutate,
    uploadFiles,
    deleteFile: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    uploadProgress,
  };
}

// Hook for public share functionality
export function useProjectShare(projectId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch project share status
  const { data: shareInfo, isLoading } = useQuery({
    queryKey: ['project-share', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('public_share_enabled, public_share_token, public_share_expires_at')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Enable public share
  const enableShareMutation = useMutation({
    mutationFn: async (expiresInDays: number = 7) => {
      if (!projectId) throw new Error('Project ID required');

      // Generate token using the database function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_project_share_token');

      if (tokenError) throw tokenError;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('projects')
        .update({
          public_share_enabled: true,
          public_share_token: tokenData,
          public_share_expires_at: expiresAt.toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-share', projectId] });
      toast({
        title: 'Enlace público creado',
        description: 'El enlace se ha generado correctamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Disable public share
  const disableShareMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { error } = await supabase
        .from('projects')
        .update({
          public_share_enabled: false,
          public_share_token: null,
          public_share_expires_at: null,
        })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-share', projectId] });
      toast({
        title: 'Enlace desactivado',
        description: 'El enlace público ha sido desactivado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getPublicUrl = () => {
    if (!shareInfo?.public_share_token) return null;
    return `${window.location.origin}/shared/project/${shareInfo.public_share_token}`;
  };

  return {
    shareInfo,
    isLoading,
    enableShare: enableShareMutation.mutate,
    disableShare: disableShareMutation.mutate,
    isEnabling: enableShareMutation.isPending,
    isDisabling: disableShareMutation.isPending,
    getPublicUrl,
    isShared: shareInfo?.public_share_enabled ?? false,
  };
}
