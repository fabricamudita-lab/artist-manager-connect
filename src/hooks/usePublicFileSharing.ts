import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePublicFileSharing = () => {
  const queryClient = useQueryClient();

  // Generate a public share link for a file
  const generateShareLink = useMutation({
    mutationFn: async ({ 
      fileId, 
      expiresInDays 
    }: { 
      fileId: string; 
      expiresInDays?: number;
    }) => {
      const publicToken = crypto.randomUUID();
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('artist_files')
        .update({
          public_token: publicToken,
          public_expires_at: expiresAt,
        })
        .eq('id', fileId)
        .select('file_url, file_name, public_token')
        .single();

      if (error) throw error;

      // Generate a share URL
      const shareUrl = `${PUBLIC_APP_URL}/shared/${publicToken}`;
      
      return { ...data, shareUrl };
    },
    onSuccess: async (data) => {
      // Copy to clipboard
      await navigator.clipboard.writeText(data.shareUrl);
      
      queryClient.invalidateQueries({ queryKey: ['artist-files'] });
      
      toast({
        title: "Enlace copiado",
        description: "El enlace público se ha copiado al portapapeles",
      });
    },
    onError: (error) => {
      console.error('Share link error:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace",
        variant: "destructive",
      });
    },
  });

  // Revoke a public share link
  const revokeShareLink = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('artist_files')
        .update({
          public_token: null,
          public_expires_at: null,
        })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-files'] });
      
      toast({
        title: "Enlace revocado",
        description: "El enlace público ya no está activo",
      });
    },
    onError: (error) => {
      console.error('Revoke share error:', error);
      toast({
        title: "Error",
        description: "No se pudo revocar el enlace",
        variant: "destructive",
      });
    },
  });

  // Get file by public token
  const getFileByToken = async (token: string) => {
    const { data, error } = await supabase
      .from('artist_files')
      .select('*')
      .eq('public_token', token)
      .single();

    if (error) throw error;
    
    // Check if expired
    if (data.public_expires_at && new Date(data.public_expires_at) < new Date()) {
      throw new Error('Este enlace ha expirado');
    }

    return data;
  };

  return {
    generateShareLink: generateShareLink.mutate,
    revokeShareLink: revokeShareLink.mutate,
    getFileByToken,
    isGenerating: generateShareLink.isPending,
    isRevoking: revokeShareLink.isPending,
  };
};
