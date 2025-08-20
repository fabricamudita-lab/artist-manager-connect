import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateApprovalRequest {
  projectId: string;
  type: 'BUDGET' | 'PR_REQUEST' | 'LOGISTICS';
  title: string;
  description?: string;
  assignedToUserId?: string;
  metadata?: Record<string, any>;
}

interface UpdateApprovalRequest {
  status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  assignedToUserId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from auth
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const requestBody = req.method !== 'GET' ? await req.json() : null;
    
    console.log('Request method:', req.method);
    console.log('Request path:', url.pathname);
    console.log('Request body:', requestBody);

    // Handle different request types based on body content
    if (requestBody?.action) {
      const { action, approvalId } = requestBody;
      
      if (action === 'submit') {
        return await handleSubmitApproval(supabaseClient, approvalId, user);
      } else if (action === 'approve') {
        return await handleApproveApproval(supabaseClient, approvalId, user);
      } else if (action === 'reject') {
        return await handleRejectApproval(supabaseClient, approvalId, user);
      }
    }

    // Handle create approval
    if (requestBody?.projectId && requestBody?.type) {
      return await handleCreateApproval(supabaseClient, requestBody, user);
    }

    // Handle list approvals (GET request or no specific action)
    if (req.method === 'GET' || !requestBody) {
      const projectId = url.searchParams.get('projectId') || requestBody?.projectId;
      if (projectId) {
        return await handleListApprovals(supabaseClient, projectId);
      }
    }
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
})

// Helper functions
async function handleCreateApproval(supabaseClient: any, requestData: CreateApprovalRequest, user: any) {
  const { projectId, type, title, description, assignedToUserId, metadata } = requestData;

  console.log('Creating approval for project:', projectId);

  // Validate project access
  const { data: project, error: projectError } = await supabaseClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return new Response(
      JSON.stringify({ error: 'Project not found or access denied' }),
      { status: 404, headers: corsHeaders }
    );
  }

  // Check if user has EDITOR role on this project
  const { data: roleBinding, error: roleError } = await supabaseClient
    .from('project_role_bindings')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('role', 'EDITOR')
    .single();

  if (roleError || !roleBinding) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions. EDITOR role required.' }),
      { status: 403, headers: corsHeaders }
    );
  }

  // Create the approval
  const { data: approval, error: createError } = await supabaseClient
    .from('approvals')
    .insert({
      project_id: projectId,
      type: type,
      title: title,
      description: description,
      assigned_to_user_id: assignedToUserId,
      created_by: user.id,
      metadata: metadata || {}
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating approval:', createError);
    return new Response(
      JSON.stringify({ error: 'Failed to create approval', details: createError.message }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ data: approval }),
    { status: 201, headers: corsHeaders }
  );
}

async function handleListApprovals(supabaseClient: any, projectId: string) {
  console.log('Getting approvals for project:', projectId);

  const { data: approvals, error: approvalsError } = await supabaseClient
    .from('approvals')
    .select(`
      id, type, status, title, description, created_at, updated_at, metadata,
      created_by_profile:created_by!inner(id, full_name, email),
      assigned_to_profile:assigned_to_user_id!left(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (approvalsError) {
    console.error('Error fetching approvals:', approvalsError);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch approvals' }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ data: approvals || [] }),
    { headers: corsHeaders }
  );
}

async function handleSubmitApproval(supabaseClient: any, approvalId: string, user: any) {
  console.log('Submitting approval:', approvalId);

  // Get approval and check permissions
  const { data: approval, error: approvalError } = await supabaseClient
    .from('approvals')
    .select('id, project_id, status, created_by')
    .eq('id', approvalId)
    .single();

  if (approvalError || !approval) {
    return new Response(
      JSON.stringify({ error: 'Approval not found' }),
      { status: 404, headers: corsHeaders }
    );
  }

  // Only creator can submit
  if (approval.created_by !== user.id) {
    return new Response(
      JSON.stringify({ error: 'Only the creator can submit this approval' }),
      { status: 403, headers: corsHeaders }
    );
  }

  // Can only submit from DRAFT status
  if (approval.status !== 'DRAFT') {
    return new Response(
      JSON.stringify({ error: 'Can only submit approvals in DRAFT status' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Update status to SUBMITTED
  const { data: updatedApproval, error: updateError } = await supabaseClient
    .from('approvals')
    .update({ status: 'SUBMITTED' })
    .eq('id', approvalId)
    .select()
    .single();

  if (updateError) {
    console.error('Error submitting approval:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to submit approval' }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ data: updatedApproval }),
    { headers: corsHeaders }
  );
}

async function handleApproveApproval(supabaseClient: any, approvalId: string, user: any) {
  console.log('Approving approval:', approvalId);

  // Get approval and check if user is assigned
  const { data: approval, error: approvalError } = await supabaseClient
    .from('approvals')
    .select('id, project_id, status, assigned_to_user_id')
    .eq('id', approvalId)
    .single();

  if (approvalError || !approval) {
    return new Response(
      JSON.stringify({ error: 'Approval not found' }),
      { status: 404, headers: corsHeaders }
    );
  }

  // Check if user is assigned to this approval
  if (approval.assigned_to_user_id !== user.id) {
    return new Response(
      JSON.stringify({ error: 'Only the assigned user can approve this' }),
      { status: 403, headers: corsHeaders }
    );
  }

  // Can only approve from SUBMITTED status
  if (approval.status !== 'SUBMITTED') {
    return new Response(
      JSON.stringify({ error: 'Can only approve submissions in SUBMITTED status' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Update status to APPROVED
  const { data: updatedApproval, error: updateError } = await supabaseClient
    .from('approvals')
    .update({ status: 'APPROVED' })
    .eq('id', approvalId)
    .select()
    .single();

  if (updateError) {
    console.error('Error approving approval:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to approve' }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ data: updatedApproval }),
    { headers: corsHeaders }
  );
}

async function handleRejectApproval(supabaseClient: any, approvalId: string, user: any) {
  console.log('Rejecting approval:', approvalId);

  // Get approval and check if user is assigned
  const { data: approval, error: approvalError } = await supabaseClient
    .from('approvals')
    .select('id, project_id, status, assigned_to_user_id')
    .eq('id', approvalId)
    .single();

  if (approvalError || !approval) {
    return new Response(
      JSON.stringify({ error: 'Approval not found' }),
      { status: 404, headers: corsHeaders }
    );
  }

  // Check if user is assigned to this approval
  if (approval.assigned_to_user_id !== user.id) {
    return new Response(
      JSON.stringify({ error: 'Only the assigned user can reject this' }),
      { status: 403, headers: corsHeaders }
    );
  }

  // Can only reject from SUBMITTED status
  if (approval.status !== 'SUBMITTED') {
    return new Response(
      JSON.stringify({ error: 'Can only reject submissions in SUBMITTED status' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Update status to REJECTED
  const { data: updatedApproval, error: updateError } = await supabaseClient
    .from('approvals')
    .update({ status: 'REJECTED' })
    .eq('id', approvalId)
    .select()
    .single();

  if (updateError) {
    console.error('Error rejecting approval:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to reject' }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ data: updatedApproval }),
    { headers: corsHeaders }
  );
}