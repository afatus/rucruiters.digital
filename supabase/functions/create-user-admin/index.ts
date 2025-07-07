import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, fullName, role = 'recruiter', tenantId }: CreateUserRequest = await req.json();
    
    if (!email || !password || !tenantId) {
      return new Response(JSON.stringify({ success: false, error: 'Email, password, and tenantId are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email,
        role: role,
        tenant_id: tenantId
      },
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error("User creation did not return a user object.");

    // The handle_new_user trigger in Supabase should automatically create the profile.
    // This function now primarily focuses on creating the auth user with correct metadata.
    
    return new Response(JSON.stringify({ success: true, user: userData.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});