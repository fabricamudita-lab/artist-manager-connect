import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FileLink {
  id: string;
  project_id: string;
  source_file_id: string;
  linked_by: string;
  linked_at: string;
  notes: string | null;
  source_file?: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    folder_type: string;
    created_at: string;
  };
}

interface UseFileLinksReturn {
  linkedFiles: FileLink[];
  isLoading: boolean;
  linkFile: (sourceFileId: string, notes?: string) => Promise<boolean>;
  unlinkFile: (linkId: string) => Promise<boolean>;
  isLinking: boolean;
}

export function useFileLinks(projectId: string | undefined): UseFileLinksReturn {
  const { user } = useAuth();
  const [linkedFiles, setLinkedFiles] = useState<FileLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchLinkedFiles();
    }
  }, [projectId]);

  const fetchLinkedFiles = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      
      // First fetch the links
      const { data: links, error } = await supabase
        .from('project_file_links')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      if (!links || links.length === 0) {
        setLinkedFiles([]);
        return;
      }

      // Then fetch the source files
      const sourceFileIds = links.map(l => l.source_file_id);
      const { data: files, error: filesError } = await supabase
        .from('project_files')
        .select('id, file_name, file_url, file_type, folder_type, created_at')
        .in('id', sourceFileIds);

      if (filesError) throw filesError;

      // Combine the data
      const filesMap = new Map(files?.map(f => [f.id, f]));
      const linkedFilesWithData = links.map(link => ({
        ...link,
        source_file: filesMap.get(link.source_file_id)
      }));

      setLinkedFiles(linkedFilesWithData);
    } catch (error) {
      console.error('Error fetching linked files:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos vinculados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const linkFile = async (sourceFileId: string, notes?: string): Promise<boolean> => {
    if (!projectId || !user) return false;

    try {
      setIsLinking(true);

      const { error } = await supabase
        .from('project_file_links')
        .insert({
          project_id: projectId,
          source_file_id: sourceFileId,
          linked_by: user.id,
          notes: notes || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Ya vinculado",
            description: "Este archivo ya está vinculado a este proyecto.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return false;
      }

      toast({
        title: "Archivo vinculado",
        description: "El archivo se ha vinculado correctamente al proyecto.",
      });

      await fetchLinkedFiles();
      return true;
    } catch (error) {
      console.error('Error linking file:', error);
      toast({
        title: "Error",
        description: "No se pudo vincular el archivo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkFile = async (linkId: string): Promise<boolean> => {
    try {
      setIsLinking(true);

      const { error } = await supabase
        .from('project_file_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Archivo desvinculado",
        description: "El archivo ya no está vinculado a este proyecto.",
      });

      setLinkedFiles(prev => prev.filter(f => f.id !== linkId));
      return true;
    } catch (error) {
      console.error('Error unlinking file:', error);
      toast({
        title: "Error",
        description: "No se pudo desvincular el archivo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLinking(false);
    }
  };

  return {
    linkedFiles,
    isLoading,
    linkFile,
    unlinkFile,
    isLinking
  };
}
