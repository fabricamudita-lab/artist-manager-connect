import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestUser {
  email: string;
  password: string;
  full_name: string;
  roles: string[];
  active_role: string;
  workspace_role?: string;
  artist_id?: string;
  project_access?: { project_id: string; role: string }[];
}

const testUsers: TestUser[] = [
  {
    email: 'owner@demo.com',
    password: 'demo123456',
    full_name: 'Demo Owner',
    roles: ['management'],
    active_role: 'management',
    workspace_role: 'OWNER'
  },
  {
    email: 'team_manager@demo.com',
    password: 'demo123456',
    full_name: 'Demo Team Manager',
    roles: ['management'],
    active_role: 'management',
    workspace_role: 'TEAM_MANAGER'
  },
  {
    email: 'artist_manager@demo.com',
    password: 'demo123456',
    full_name: 'Rita Payés Manager',
    roles: ['management'],
    active_role: 'management',
    workspace_role: 'TEAM_MANAGER',
    artist_id: 'rita-payes'
  },
  {
    email: 'artist_observer@demo.com',
    password: 'demo123456',
    full_name: 'Rita Payés Observer',
    roles: ['artist'],
    active_role: 'artist',
    workspace_role: 'OBSERVER',
    artist_id: 'rita-payes'
  },
  {
    email: 'booking_editor@demo.com',
    password: 'demo123456',
    full_name: 'Gira 2025 Editor',
    roles: ['management'],
    active_role: 'management',
    workspace_role: 'TEAM_MANAGER',
    project_access: [{ project_id: 'gira-2025', role: 'EDITOR' }]
  },
  {
    email: 'marketing_viewer@demo.com',
    password: 'demo123456',
    full_name: 'Campaña PR Viewer',
    roles: ['management'],
    active_role: 'management',
    workspace_role: 'OBSERVER',
    project_access: [{ project_id: 'campana-pr', role: 'VIEWER' }]
  }
];

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (action === 'setup') {
      console.log('🚀 Setting up test users...');
      
      // First ensure workspace exists
      const { data: existingWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .single();

      if (!existingWorkspace) {
        console.log('Creating demo workspace...');
        await supabase.from('workspaces').insert({
          id: workspaceId,
          name: 'Demo Workspace',
          description: 'Workspace for demo and test users',
          created_by: null // Will be updated after first user is created
        });
      }

      const createdUsers = [];
      let workspaceOwnerUserId = null;

      for (const testUser of testUsers) {
        try {
          console.log(`Creating user: ${testUser.email}`);
          
          // Check if user already exists
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const userExists = existingUser.users.find(u => u.email === testUser.email);
          
          let userId: string;
          
          if (userExists) {
            console.log(`User ${testUser.email} already exists, updating...`);
            userId = userExists.id;
            
            // Update the user's email confirmation status
            await supabase.auth.admin.updateUserById(userId, {
              email_confirm: true,
              password: testUser.password
            });
          } else {
            // Create new user
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email: testUser.email,
              password: testUser.password,
              email_confirm: true,
              user_metadata: {
                full_name: testUser.full_name
              }
            });
            
            if (createError) {
              console.error(`Error creating user ${testUser.email}:`, createError);
              continue;
            }
            
            userId = newUser.user.id;
          }

          // Set first user as workspace owner
          if (!workspaceOwnerUserId) {
            workspaceOwnerUserId = userId;
          }

          // Create or update profile
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: userId,
              email: testUser.email,
              full_name: testUser.full_name,
              roles: testUser.roles,
              active_role: testUser.active_role,
              workspace_id: workspaceId,
              is_test_user: true
            }, { onConflict: 'user_id' });

          if (profileError) {
            console.error(`Error creating profile for ${testUser.email}:`, profileError);
            continue;
          }

          // Add workspace membership
          const { error: membershipError } = await supabase
            .from('workspace_memberships')
            .upsert({
              user_id: userId,
              workspace_id: workspaceId,
              role: testUser.workspace_role || 'OBSERVER'
            }, { onConflict: 'user_id,workspace_id' });

          if (membershipError) {
            console.error(`Error creating workspace membership for ${testUser.email}:`, membershipError);
          }

          createdUsers.push({
            email: testUser.email,
            userId: userId,
            status: 'created'
          });

          console.log(`✅ User ${testUser.email} set up successfully`);
          
        } catch (error) {
          console.error(`Error setting up user ${testUser.email}:`, error);
          createdUsers.push({
            email: testUser.email,
            status: 'error',
            error: error.message
          });
        }
      }

      // Update workspace with owner
      if (workspaceOwnerUserId) {
        await supabase
          .from('workspaces')
          .update({ created_by: workspaceOwnerUserId })
          .eq('id', workspaceId);
      }

      console.log('✅ Test users setup completed');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Test users setup completed',
          users: createdUsers,
          workspaceId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } else if (action === 'cleanup') {
      console.log('🧹 Cleaning up test users...');
      
      // Get all test users
      const { data: testProfiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('is_test_user', true);

      const cleanupResults = [];

      if (testProfiles) {
        for (const profile of testProfiles) {
          try {
            console.log(`Cleaning up user: ${profile.email}`);
            
            // Delete user via auth admin API
            const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.user_id);
            
            if (deleteError) {
              console.error(`Error deleting user ${profile.email}:`, deleteError);
              cleanupResults.push({
                email: profile.email,
                status: 'error',
                error: deleteError.message
              });
            } else {
              cleanupResults.push({
                email: profile.email,
                status: 'deleted'
              });
              console.log(`✅ User ${profile.email} deleted successfully`);
            }
            
          } catch (error) {
            console.error(`Error cleaning up user ${profile.email}:`, error);
            cleanupResults.push({
              email: profile.email,
              status: 'error',
              error: error.message
            });
          }
        }
      }

      console.log('✅ Test users cleanup completed');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Test users cleanup completed',
          results: cleanupResults
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid action. Use ?action=setup or ?action=cleanup'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});