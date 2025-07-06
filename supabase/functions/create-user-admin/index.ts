const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  department?: string;
  tenantId?: string;
}

// Import Supabase client
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== Create User Admin Function Started ===');
    
    const { email, password, fullName, role = 'recruiter', department, tenantId }: CreateUserRequest = await req.json();
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email and password are required' 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Validate role against allowed values
    const allowedRoles = ['recruiter', 'hiring_manager', 'line_manager', 'candidate', 'hr_operations', 'it_admin', 'super_admin'];
    if (role && !allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}` 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Creating user with email: ${email}, role: ${role}, tenant: ${tenantId || 'default'}`);

    // Create user with admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName || email,
        role: role,
        tenant_id: tenantId
      },
      email_confirm: true // Auto-confirm email
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: userError.message 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'User creation failed - no user data returned' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`User created successfully with ID: ${userData.user.id}`);

    // Determine tenant_id - use provided tenantId or default tenant
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

    // Create profile for the user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userData.user.id,
          full_name: fullName || email,
          role: role,
          department: department || null,
          tenant_id: finalTenantId
        }
      ]);

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail the whole operation if profile creation fails
      // The trigger should handle this, but we'll try manually as backup
    }

    console.log('=== Create User Admin Function Completed Successfully ===');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          full_name: fullName || email,
          role: role,
          department: department,
          tenant_id: finalTenantId
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Error in create-user-admin function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});