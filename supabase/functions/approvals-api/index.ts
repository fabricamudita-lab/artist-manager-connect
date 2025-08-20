import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      approvals: {
        Row: {
          id: string;
          project_id: string;
          type: 'BUDGET' | 'PR_REQUEST' | 'LOGISTICS';
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
          title: string;
          description: string | null;
          amount: number | null;
          assigned_to_user_id: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: 'BUDGET' | 'PR_REQUEST' | 'LOGISTICS';
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
          title: string;
          description?: string | null;
          amount?: number | null;
          assigned_to_user_id?: string | null;
          created_by: string;
          updated_by?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          amount?: number | null;
          assigned_to_user_id?: string | null;
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
          updated_by?: string | null;
        };
      };
      approval_comments: {
        Row: {
          id: string;
          approval_id: string;
          author_user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          approval_id: string;
          author_user_id: string;
          body: string;
        };
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(part => part);
    
    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Request:', req.method, url.pathname);

    // Route handlers
    if (req.method === 'POST' && pathParts[0] === 'projects' && pathParts[2] === 'approvals') {
      return await createApproval(supabaseClient, user.id, pathParts[1], req);
    }
    
    if (req.method === 'PATCH' && pathParts[0] === 'approvals' && pathParts.length === 2) {
      return await updateApproval(supabaseClient, user.id, pathParts[1], req);
    }
    
    if (req.method === 'POST' && pathParts[0] === 'approvals' && pathParts[2] === 'submit') {
      return await submitApproval(supabaseClient, user.id, pathParts[1]);
    }
    
    if (req.method === 'POST' && pathParts[0] === 'approvals' && pathParts[2] === 'approve') {
      return await approveApproval(supabaseClient, user.id, pathParts[1]);
    }
    
    if (req.method === 'POST' && pathParts[0] === 'approvals' && pathParts[2] === 'reject') {
      return await rejectApproval(supabaseClient, user.id, pathParts[1]);
    }
    
    if (req.method === 'POST' && pathParts[0] === 'approvals' && pathParts[2] === 'comment') {
      return await addComment(supabaseClient, user.id, pathParts[1], req);
    }
    
    if (req.method === 'PATCH' && pathParts[0] === 'approvals' && pathParts[2] === 'assign') {
      return await assignApproval(supabaseClient, user.id, pathParts[1], req);
    }

    // Default GET to list approvals for a project
    if (req.method === 'GET' && pathParts[0] === 'projects' && pathParts[2] === 'approvals') {
      return await listApprovals(supabaseClient, pathParts[1]);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in approvals API:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createApproval(supabaseClient: any, userId: string, projectId: string, req: Request) {
  const body = await req.json();
  const { type, title, description, amount, assigned_to_user_id } = body;

  // Validate transition
  const { data: validation } = await supabaseClient.rpc('validate_approval_transition', {
    p_approval_id: null,
    p_action: 'create',
    p_user_id: userId
  });

  // Create approval
  const { data: approval, error } = await supabaseClient
    .from('approvals')
    .insert({
      project_id: projectId,
      type,
      title,
      description,
      amount,
      assigned_to_user_id,
      created_by: userId,
      status: 'DRAFT'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating approval:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log approval event
  await supabaseClient.rpc('log_approval_event', {
    p_approval_id: approval.id,
    p_event_type: 'CREATED',
    p_from_status: null,
    p_to_status: 'DRAFT',
    p_diff: { new: approval }
  });

  return new Response(JSON.stringify({ data: approval }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateApproval(supabaseClient: any, userId: string, approvalId: string, req: Request) {
  const body = await req.json();
  const { title, description, amount } = body;

  // Get current approval
  const { data: currentApproval, error: fetchError } = await supabaseClient
    .from('approvals')
    .select('*')
    .eq('id', approvalId)
    .single();

  if (fetchError || !currentApproval) {
    return new Response(JSON.stringify({ error: 'Approval not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate transition
  const { data: validation } = await supabaseClient.rpc('validate_approval_transition', {
    p_approval_id: approvalId,
    p_action: 'update',
    p_user_id: userId
  });

  if (!validation?.valid) {
    return new Response(JSON.stringify({ error: validation?.error || 'Invalid transition' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update approval
  const { data: updatedApproval, error } = await supabaseClient
    .from('approvals')
    .update({
      title,
      description,
      amount,
      updated_by: userId
    })
    .eq('id', approvalId)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log approval event
  await supabaseClient.rpc('log_approval_event', {
    p_approval_id: approvalId,
    p_event_type: 'UPDATED',
    p_from_status: currentApproval.status,
    p_to_status: currentApproval.status,
    p_diff: {
      old: { title: currentApproval.title, description: currentApproval.description, amount: currentApproval.amount },
      new: { title, description, amount }
    }
  });

  return new Response(JSON.stringify({ data: updatedApproval }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function submitApproval(supabaseClient: any, userId: string, approvalId: string) {
  return await changeApprovalStatus(supabaseClient, userId, approvalId, 'SUBMITTED', 'submit');
}

async function approveApproval(supabaseClient: any, userId: string, approvalId: string) {
  return await changeApprovalStatus(supabaseClient, userId, approvalId, 'APPROVED', 'approve');
}

async function rejectApproval(supabaseClient: any, userId: string, approvalId: string) {
  return await changeApprovalStatus(supabaseClient, userId, approvalId, 'REJECTED', 'reject');
}

async function changeApprovalStatus(
  supabaseClient: any, 
  userId: string, 
  approvalId: string, 
  newStatus: 'SUBMITTED' | 'APPROVED' | 'REJECTED',
  action: string
) {
  // Get current approval
  const { data: currentApproval, error: fetchError } = await supabaseClient
    .from('approvals')
    .select('*')
    .eq('id', approvalId)
    .single();

  if (fetchError || !currentApproval) {
    return new Response(JSON.stringify({ error: 'Approval not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate transition
  const { data: validation } = await supabaseClient.rpc('validate_approval_transition', {
    p_approval_id: approvalId,
    p_action: action,
    p_user_id: userId
  });

  if (!validation?.valid) {
    return new Response(JSON.stringify({ error: validation?.error || 'Invalid transition' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update status
  const { data: updatedApproval, error } = await supabaseClient
    .from('approvals')
    .update({
      status: newStatus,
      updated_by: userId
    })
    .eq('id', approvalId)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log approval event
  const eventType = action.toUpperCase() as 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  await supabaseClient.rpc('log_approval_event', {
    p_approval_id: approvalId,
    p_event_type: eventType,
    p_from_status: currentApproval.status,
    p_to_status: newStatus,
    p_diff: {
      old: { status: currentApproval.status },
      new: { status: newStatus }
    }
  });

  return new Response(JSON.stringify({ data: updatedApproval }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function addComment(supabaseClient: any, userId: string, approvalId: string, req: Request) {
  const body = await req.json();
  const { comment } = body;

  if (!comment || comment.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Comment cannot be empty' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create comment
  const { data: newComment, error } = await supabaseClient
    .from('approval_comments')
    .insert({
      approval_id: approvalId,
      author_user_id: userId,
      body: comment
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log comment event
  await supabaseClient.rpc('log_approval_event', {
    p_approval_id: approvalId,
    p_event_type: 'COMMENTED',
    p_from_status: null,
    p_to_status: null,
    p_diff: { comment }
  });

  return new Response(JSON.stringify({ data: newComment }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function assignApproval(supabaseClient: any, userId: string, approvalId: string, req: Request) {
  const body = await req.json();
  const { assigned_to_user_id } = body;

  // Get current approval
  const { data: currentApproval, error: fetchError } = await supabaseClient
    .from('approvals')
    .select('*')
    .eq('id', approvalId)
    .single();

  if (fetchError || !currentApproval) {
    return new Response(JSON.stringify({ error: 'Approval not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update assignment
  const { data: updatedApproval, error } = await supabaseClient
    .from('approvals')
    .update({
      assigned_to_user_id,
      updated_by: userId
    })
    .eq('id', approvalId)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log assignment event
  await supabaseClient.rpc('log_approval_event', {
    p_approval_id: approvalId,
    p_event_type: 'ASSIGN_CHANGED',
    p_from_status: currentApproval.status,
    p_to_status: currentApproval.status,
    p_diff: {
      old: { assigned_to_user_id: currentApproval.assigned_to_user_id },
      new: { assigned_to_user_id }
    }
  });

  return new Response(JSON.stringify({ data: updatedApproval }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function listApprovals(supabaseClient: any, projectId: string) {
  const { data: approvals, error } = await supabaseClient
    .from('approvals')
    .select(`
      *,
      created_by_profile:profiles!approvals_created_by_fkey(id, full_name, email),
      assigned_to_profile:profiles!approvals_assigned_to_user_id_fkey(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data: approvals }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}