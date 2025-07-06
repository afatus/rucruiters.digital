const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== Delete User Admin Function Started ===');
    
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User ID is required' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json', 
            ...corsHeaders 
          } 
        }
      );
    }

    console.log(`Attempting to delete user: ${userId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing Supabase environment variables' 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json', 
            ...corsHeaders 
          } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      }
    });

    // 1. Get user's current role and tenant_id from profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile for deletion check:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User profile not found or error fetching profile for deletion check.'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // 2. Implement "last IT_Admin protection"
    if (userProfile.role === 'it_admin' && userProfile.tenant_id) {
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'it_admin')
        .eq('tenant_id', userProfile.tenant_id);

      if (countError) {
        console.error('Error counting IT admins:', countError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Error checking IT admin count before deletion.'
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      if (count === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Bu tenanttaki son IT yöneticisini silemezsiniz. En az bir IT yöneticisi kalmalıdır.'
          }),
          {
            status: 409, // Conflict
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    }

    // Delete the user using admin privileges
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json', 
            ...corsHeaders 
          } 
        }
      );
    }

    console.log(`User ${userId} deleted successfully from auth`);

    // Note: The profile will be automatically deleted due to the CASCADE foreign key constraint
    // in the profiles table (profiles.id references auth.users.id ON DELETE CASCADE)

    console.log('=== Delete User Admin Function Completed Successfully ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${userId} deleted successfully` 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in delete-user-admin function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        } 
      }
    );
  }
});