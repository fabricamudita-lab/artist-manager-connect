// RBAC Permission System - Deny by Default
// Sistema de permisos basado en roles con herencia de scopes

export type Scope = 'WORKSPACE' | 'ARTIST' | 'PROJECT';

export type WorkspaceRole = 'OWNER' | 'TEAM_MANAGER';
export type ArtistRole = 'ARTIST_MANAGER' | 'ARTIST_OBSERVER';  
export type ProjectRole = 'EDITOR' | 'COMMENTER' | 'VIEWER';

export type Permission = 
  // Workspace permissions
  | 'MANAGE_BILLING' | 'INVITE_USERS' | 'CREATE_ARTIST' | 'SEE_ALL'
  // Artist permissions  
  | 'CREATE_PROJECT' | 'ASSIGN_PROJECT_ROLES' | 'VIEW_SALES' | 'VIEW_CALENDAR' | 'VIEW_DASHBOARD'
  // Project permissions
  | 'VIEW_PROJECT' | 'EDIT_PROJECT' | 'CREATE_WORK_ITEM' | 'EDIT_WORK_ITEM' 
  | 'SEND_BUDGET' | 'CHANGE_STATUS' | 'UPLOAD_FILES' | 'COMMENT' | 'APPROVE_IF_ASSIGNED';

export interface UserRole {
  scope: Scope;
  scopeId: string; // workspace_id, artist_id, or project_id
  role: WorkspaceRole | ArtistRole | ProjectRole;
}

// Permission matrix - what each role can do
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Workspace roles
  'WORKSPACE.OWNER': ['MANAGE_BILLING', 'INVITE_USERS', 'CREATE_ARTIST', 'SEE_ALL'],
  'WORKSPACE.TEAM_MANAGER': ['INVITE_USERS', 'CREATE_ARTIST', 'SEE_ALL'],
  
  // Artist roles
  'ARTIST.ARTIST_MANAGER': ['SEE_ALL', 'CREATE_PROJECT', 'ASSIGN_PROJECT_ROLES', 'VIEW_SALES', 'VIEW_CALENDAR'],
  'ARTIST.ARTIST_OBSERVER': ['VIEW_DASHBOARD', 'VIEW_SALES', 'VIEW_CALENDAR'],
  
  // Project roles  
  'PROJECT.EDITOR': ['VIEW_PROJECT', 'EDIT_PROJECT', 'CREATE_WORK_ITEM', 'EDIT_WORK_ITEM', 'SEND_BUDGET', 'CHANGE_STATUS', 'UPLOAD_FILES'],
  'PROJECT.COMMENTER': ['VIEW_PROJECT', 'COMMENT', 'APPROVE_IF_ASSIGNED'],
  'PROJECT.VIEWER': ['VIEW_PROJECT']
};

/**
 * Check if user has specific permission for a resource
 * Implements inheritance: WORKSPACE -> ARTIST -> PROJECT
 */
export function hasPermission(
  userRoles: UserRole[],
  permission: Permission,
  context: {
    workspaceId?: string;
    artistId?: string;
    projectId?: string;
  }
): boolean {
  // Get user's effective permissions for this context
  const effectivePermissions = getUserPermissions(userRoles, context);
  return effectivePermissions.includes(permission);
}

/**
 * Get all permissions a user has in a given context
 * Considers inheritance from higher scopes
 */
export function getUserPermissions(
  userRoles: UserRole[],
  context: {
    workspaceId?: string;
    artistId?: string; 
    projectId?: string;
  }
): Permission[] {
  const permissions = new Set<Permission>();

  for (const userRole of userRoles) {
    const roleKey = `${userRole.scope}.${userRole.role}`;
    const rolePermissions = ROLE_PERMISSIONS[roleKey] || [];

    // Check if this role applies to the current context
    if (roleAppliesToContext(userRole, context)) {
      rolePermissions.forEach(p => permissions.add(p));
    }
  }

  return Array.from(permissions);
}

/**
 * Check if a role applies to the given context
 * Implements inheritance rules
 */
function roleAppliesToContext(
  userRole: UserRole,
  context: {
    workspaceId?: string;
    artistId?: string;
    projectId?: string;
  }
): boolean {
  switch (userRole.scope) {
    case 'WORKSPACE':
      // Workspace roles apply to everything in that workspace
      return userRole.scopeId === context.workspaceId;
      
    case 'ARTIST':
      // Artist roles apply to that artist and all its projects
      if (userRole.scopeId === context.artistId) return true;
      // If we're in a project context, check if project belongs to this artist
      // This would require a lookup - simplified for now
      return false;
      
    case 'PROJECT':
      // Project roles only apply to that specific project
      return userRole.scopeId === context.projectId;
      
    default:
      return false;
  }
}

/**
 * Utility functions for common permission checks
 */
export const PermissionUtils = {
  canViewProject: (userRoles: UserRole[], projectId: string, artistId?: string, workspaceId?: string) =>
    hasPermission(userRoles, 'VIEW_PROJECT', { projectId, artistId, workspaceId }),
    
  canEditProject: (userRoles: UserRole[], projectId: string, artistId?: string, workspaceId?: string) =>
    hasPermission(userRoles, 'EDIT_PROJECT', { projectId, artistId, workspaceId }),
    
  canCreateProject: (userRoles: UserRole[], artistId: string, workspaceId?: string) =>
    hasPermission(userRoles, 'CREATE_PROJECT', { artistId, workspaceId }),
    
  canManageBilling: (userRoles: UserRole[], workspaceId: string) =>
    hasPermission(userRoles, 'MANAGE_BILLING', { workspaceId }),
    
  canInviteUsers: (userRoles: UserRole[], workspaceId: string) =>
    hasPermission(userRoles, 'INVITE_USERS', { workspaceId }),
    
  canSeeAll: (userRoles: UserRole[], workspaceId: string) =>
    hasPermission(userRoles, 'SEE_ALL', { workspaceId })
};

/**
 * Hook for using permissions in React components
 */
export function usePermissions(userRoles: UserRole[]) {
  return {
    hasPermission: (permission: Permission, context: any) => 
      hasPermission(userRoles, permission, context),
    getUserPermissions: (context: any) => 
      getUserPermissions(userRoles, context),
    utils: PermissionUtils
  };
}