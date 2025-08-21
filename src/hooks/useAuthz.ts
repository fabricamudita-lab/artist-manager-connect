import { useAuth } from '@/hooks/useAuth';
import { canEditProject, canViewProject } from '@/lib/authz/helpers';
import { useState, useEffect } from 'react';

interface UseAuthzProps {
  projectId?: string;
  artistId?: string;
  workspaceId?: string;
}

interface AuthzPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  canManage: boolean;
  loading: boolean;
}

export function useAuthz({ projectId, artistId, workspaceId }: UseAuthzProps = {}): AuthzPermissions {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<AuthzPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canComment: false,
    canManage: false,
    loading: true
  });

  useEffect(() => {
    async function checkPermissions() {
      if (!user || authLoading) return;

      try {
        console.log('useAuthz - Checking permissions for user:', user.id, 'project:', projectId);
        const results = await Promise.all([
          projectId ? canViewProject(user.id, projectId) : Promise.resolve(false),
          projectId ? canEditProject(user.id, projectId) : Promise.resolve(false),
          // Add more permission checks as needed
        ]);
        console.log('useAuthz - Permission results:', results);

        setPermissions({
          canView: results[0],
          canEdit: results[1],
          canDelete: results[1], // For now, edit implies delete
          canComment: results[0], // View implies comment
          canManage: results[1], // Edit implies manage
          loading: false
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissions(prev => ({ ...prev, loading: false }));
      }
    }

    checkPermissions();
  }, [user, authLoading, projectId, artistId, workspaceId]);

  return permissions;
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  return {
    renderIf: (condition: boolean, component: React.ReactNode) => 
      condition ? component : null,
    
    renderUnless: (condition: boolean, component: React.ReactNode) =>
      !condition ? component : null
  };
}