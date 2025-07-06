import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface BulkAssignRequest {
  users: Array<{ email: string; role: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { users: usersToAssign }: BulkAssignRequest = await req.json();

    // Authenticate the request using the provided JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header missing.' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid token.' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if the user has 'it_admin' role
    const userRole = user.user_metadata?.role;
    if (userRole !== 'it_admin' && userRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only IT Admins or Super Admins can bulk assign roles.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      failures: [] as Array<{ email: string; error: string }>
    };

    for (const userAssign of usersToAssign) {
      try {
        // Find the user by email in auth.users
        const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserByEmail(userAssign.email);

        if (authUserError || !authUser?.user) {
          results.failureCount++;
          results.failures.push({ email: userAssign.email, error: 'User not found in authentication system.' });
          continue;
        }

        const userId = authUser.user.id;

        // Fetch the profile to get tenant_id and ensure it exists
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id, tenant_id')
          .eq('id', userId)
          .single();

        if (profileFetchError || !profileData) {
          results.failureCount++;
          results.failures.push({ email: userAssign.email, error: 'User profile not found.' });
          continue;
        }

        // Verify the target role exists and belongs to the correct tenant
        const { data: roleData, error: roleFetchError } = await supabase
          .from('roles')
          .select('id, tenant_id')
          .eq('name', userAssign.role)
          .single();

        if (roleFetchError || !roleData) {
          results.failureCount++;
          results.failures.push({ email: userAssign.email, error: `Role '${userAssign.role}' not found.` });
          continue;
        }

        // IT Admin can only assign roles to users within their own tenant
        if (userRole === 'it_admin' && profileData.tenant_id !== user.user_metadata?.tenant_id) {
          results.failureCount++;
          results.failures.push({ email: userAssign.email, error: 'Forbidden: Cannot assign roles to users outside your tenant.' });
          continue;
        }

        // Update the user's profile role
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ role: userAssign.role })
          .eq('id', profileData.id);

        if (updateProfileError) {
          results.failureCount++;
          results.failures.push({ email: userAssign.email, error: updateProfileError.message });
          continue;
        }

        results.successCount++;

      } catch (innerError) {
        results.failureCount++;
        results.failures.push({ email: userAssign.email, error: innerError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in bulk-assign-roles function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});