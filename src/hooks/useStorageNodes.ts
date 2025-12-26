import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface StorageNode {
  id: string;
  artist_id: string;
  parent_id: string | null;
  name: string;
  node_type: 'folder' | 'file';
  storage_path: string | null;
  storage_bucket: string | null;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  is_system_folder: boolean;
  metadata: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNodeParams {
  artist_id: string;
  parent_id?: string | null;
  name: string;
  node_type: 'folder' | 'file';
  storage_path?: string;
  storage_bucket?: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  metadata?: Json;
}

export function useStorageNodes(artistId: string | null, parentId: string | null = null) {
  const queryClient = useQueryClient();

  const { data: nodes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['storage-nodes', artistId, parentId],
    queryFn: async () => {
      if (!artistId) return [];
      
      let query = supabase
        .from('storage_nodes')
        .select('*')
        .eq('artist_id', artistId)
        .order('node_type', { ascending: true }) // Folders first
        .order('name', { ascending: true });

      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StorageNode[];
    },
    enabled: !!artistId,
  });

  const createNodeMutation = useMutation({
    mutationFn: async (params: CreateNodeParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: {
        artist_id: string;
        parent_id: string | null;
        name: string;
        node_type: 'folder' | 'file';
        storage_path?: string;
        storage_bucket?: string;
        file_url?: string;
        file_size?: number;
        file_type?: string;
        metadata: Json;
        created_by: string;
      } = {
        artist_id: params.artist_id,
        parent_id: params.parent_id || null,
        name: params.name,
        node_type: params.node_type,
        storage_path: params.storage_path,
        storage_bucket: params.storage_bucket,
        file_url: params.file_url,
        file_size: params.file_size,
        file_type: params.file_type,
        metadata: (params.metadata || {}) as Json,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('storage_nodes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      toast({
        title: 'Éxito',
        description: 'Elemento creado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await supabase
        .from('storage_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      toast({
        title: 'Éxito',
        description: 'Elemento eliminado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const renameNodeMutation = useMutation({
    mutationFn: async ({ nodeId, newName }: { nodeId: string; newName: string }) => {
      const { data, error } = await supabase
        .from('storage_nodes')
        .update({ name: newName })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      toast({
        title: 'Éxito',
        description: 'Nombre actualizado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ nodeId, updates }: { nodeId: string; updates: Partial<StorageNode> }) => {
      const { data, error } = await supabase
        .from('storage_nodes')
        .update(updates)
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const moveNodeMutation = useMutation({
    mutationFn: async ({ nodeId, newParentId }: { nodeId: string; newParentId: string | null }) => {
      const { data, error } = await supabase
        .from('storage_nodes')
        .update({ parent_id: newParentId })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      toast({
        title: 'Éxito',
        description: 'Elemento movido correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ artistId, parentId, file }: { artistId: string; parentId: string | null; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${artistId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create node record
      const insertData: {
        artist_id: string;
        parent_id: string | null;
        name: string;
        node_type: 'file';
        storage_path: string;
        storage_bucket: string;
        file_url: string;
        file_size: number;
        file_type: string;
        metadata: Json;
        created_by: string;
      } = {
        artist_id: artistId,
        parent_id: parentId,
        name: file.name,
        node_type: 'file',
        storage_path: filePath,
        storage_bucket: 'documents',
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        metadata: {} as Json,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('storage_nodes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-nodes'] });
      toast({
        title: 'Éxito',
        description: 'Archivo subido correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    nodes,
    folders: nodes.filter(n => n.node_type === 'folder'),
    files: nodes.filter(n => n.node_type === 'file'),
    isLoading,
    error,
    refetch,
    createNode: createNodeMutation.mutateAsync,
    deleteNode: deleteNodeMutation.mutateAsync,
    renameNode: renameNodeMutation.mutateAsync,
    updateNode: updateNodeMutation.mutateAsync,
    moveNode: moveNodeMutation.mutateAsync,
    uploadFile: uploadFileMutation.mutateAsync,
    isCreating: createNodeMutation.isPending,
    isDeleting: deleteNodeMutation.isPending,
    isRenaming: renameNodeMutation.isPending,
    isUploading: uploadFileMutation.isPending,
  };
}

// Hook to get breadcrumb path for a node
export function useNodeBreadcrumb(nodeId: string | null) {
  return useQuery({
    queryKey: ['storage-node-breadcrumb', nodeId],
    queryFn: async () => {
      if (!nodeId) return [];
      
      const path: StorageNode[] = [];
      let currentId: string | null = nodeId;

      while (currentId) {
        const { data, error } = await supabase
          .from('storage_nodes')
          .select('*')
          .eq('id', currentId)
          .single();

        if (error || !data) break;
        path.unshift(data as StorageNode);
        currentId = data.parent_id;
      }

      return path;
    },
    enabled: !!nodeId,
  });
}

// Hook to link a node to a project
export function useProjectResources(projectId: string | null) {
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['project-resources', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_resources')
        .select(`
          *,
          node:storage_nodes(*)
        `)
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const linkNodeMutation = useMutation({
    mutationFn: async ({ nodeId }: { nodeId: string }) => {
      if (!projectId) throw new Error('Project ID required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_resources')
        .insert({
          project_id: projectId,
          node_id: nodeId,
          linked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast({
        title: 'Éxito',
        description: 'Recurso vinculado al proyecto',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const unlinkNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      if (!projectId) throw new Error('Project ID required');
      
      const { error } = await supabase
        .from('project_resources')
        .delete()
        .eq('project_id', projectId)
        .eq('node_id', nodeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast({
        title: 'Éxito',
        description: 'Recurso desvinculado del proyecto',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    resources,
    isLoading,
    linkNode: linkNodeMutation.mutateAsync,
    unlinkNode: unlinkNodeMutation.mutateAsync,
    isLinking: linkNodeMutation.isPending,
    isUnlinking: unlinkNodeMutation.isPending,
  };
}
