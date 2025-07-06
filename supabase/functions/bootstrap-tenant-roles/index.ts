import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

    const payload = await req.json();
    const newTenant = payload.record; // Assuming this is triggered by a new tenant insert

    if (!newTenant || !newTenant.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload: missing tenant data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const tenantId = newTenant.id;
    console.log(`Bootstrapping roles for new tenant: ${tenantId}`);

    // Define default roles and their permissions
    const defaultRoles = [
      { name: 'Super_Admin', description: 'Global administrator', inherit_order: 0, is_system_role: true },
      { name: 'IT_Admin', description: 'Tenant-level IT administrator', inherit_order: 1, is_system_role: true },
      { name: 'Recruiter', description: 'Candidate sourcing and management', inherit_order: 2, is_system_role: true },
      { name: 'Hiring_Manager', description: 'Job creation and approval', inherit_order: 3, is_system_role: true },
      { name: 'HR_Operations', description: 'Offer and onboarding management', inherit_order: 4, is_system_role: true },
      { name: 'Line_Manager', description: 'Panel interviews and team fit', inherit_order: 5, is_system_role: true },
    ];

    // Define default modules and permissions
    const defaultModules = [
      { name: 'Candidate Pool & CRM' },
      { name: 'Job Requisition' },
      { name: 'Interview Calendar' },
      { name: 'Offer & E-Signature' },
      { name: 'Reporting' },
      { name: 'Tenant Settings' },
      { name: 'User & Role Management' },
      { name: 'Audit Logs' },
    ];

    const defaultPermissions = [
      { action: 'view' },
      { action: 'edit' },
      { action: 'execute' },
    ];

    // Insert modules if they don't exist (global modules)
    for (const mod of defaultModules) {
      const { error } = await supabase.from('modules').upsert({ name: mod.name }, { onConflict: 'name' });
      if (error) console.error(`Error upserting module ${mod.name}:`, error);
    }

    // Insert permissions if they don't exist (global permissions)
    for (const perm of defaultPermissions) {
      const { error } = await supabase.from('permissions').upsert({ action: perm.action }, { onConflict: 'action' });
      if (error) console.error(`Error upserting permission ${perm.action}:`, error);
    }

    // Fetch all modules and permissions to get their IDs
    const { data: modulesData, error: modulesError } = await supabase.from('modules').select('id, name');
    const { data: permissionsData, error: permissionsError } = await supabase.from('permissions').select('id, action');

    if (modulesError || permissionsError) {
      throw new Error('Failed to fetch modules or permissions.');
    }

    const modulesMap = new Map(modulesData.map(m => [m.name, m.id]));
    const permissionsMap = new Map(permissionsData.map(p => [p.action, p.id]));

    // Insert tenant-specific roles and their permissions
    for (const roleDef of defaultRoles) {
      const { data: insertedRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: roleDef.name,
          description: roleDef.description,
          inherit_order: roleDef.inherit_order,
          is_system_role: roleDef.is_system_role,
          tenant_id: tenantId // Assign to the new tenant
        })
        .select('id')
        .single();

      if (roleError) {
        console.error(`Error inserting role ${roleDef.name} for tenant ${tenantId}:`, roleError);
        continue;
      }

      // Assign default permissions based on the matrix provided in the prompt
      const rolePermissionsToInsert = [];
      switch (roleDef.name) {
        case 'IT_Admin':
          rolePermissionsToInsert.push(
            { module: 'Candidate Pool & CRM', permissions: ['view', 'edit', 'execute'] },
            { module: 'Job Requisition', permissions: ['view', 'edit', 'execute'] },
            { module: 'Interview Calendar', permissions: ['view', 'edit', 'execute'] },
            { module: 'Offer & E-Signature', permissions: ['view', 'edit', 'execute'] },
            { module: 'Reporting', permissions: ['view', 'edit', 'execute'] },
            { module: 'Tenant Settings', permissions: ['view', 'edit', 'execute'] },
            { module: 'User & Role Management', permissions: ['view', 'edit', 'execute'] },
            { module: 'Audit Logs', permissions: ['view'] },
          );
          break;
        case 'Recruiter':
          rolePermissionsToInsert.push(
            { module: 'Candidate Pool & CRM', permissions: ['view', 'edit', 'execute'] },
            { module: 'Job Requisition', permissions: ['view', 'edit', 'execute'] },
            { module: 'Interview Calendar', permissions: ['view', 'edit', 'execute'] },
          );
          break;
        case 'Hiring_Manager':
          rolePermissionsToInsert.push(
            { module: 'Candidate Pool & CRM', permissions: ['view'] },
            { module: 'Job Requisition', permissions: ['view', 'edit', 'execute'] },
          );
          break;
        case 'HR_Operations':
          rolePermissionsToInsert.push(
            { module: 'Candidate Pool & CRM', permissions: ['view'] },
            { module: 'Offer & E-Signature', permissions: ['view', 'edit', 'execute'] },
            { module: 'Reporting', permissions: ['view'] },
          );
          break;
        case 'Line_Manager':
          rolePermissionsToInsert.push(
            { module: 'Interview Calendar', permissions: ['view'] }, // Assuming view for panel interviews
          );
          break;
        // Super_Admin permissions are handled by RLS directly, or can be explicitly added here if needed
        // Candidate role has no backend permissions
      }

      const inserts = [];
      for (const rp of rolePermissionsToInsert) {
        const moduleId = modulesMap.get(rp.module);
        if (moduleId) {
          for (const permAction of rp.permissions) {
            const permissionId = permissionsMap.get(permAction);
            if (permissionId) {
              inserts.push({
                role_id: insertedRole.id,
                module_id: moduleId,
                permission_id: permissionId,
              });
            }
          }
        }
      }

      if (inserts.length > 0) {
        const { error: rpError } = await supabase.from('role_permissions').insert(inserts);
        if (rpError) console.error(`Error inserting role permissions for ${roleDef.name}:`, rpError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Roles bootstrapped for tenant ${tenantId}` }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in bootstrap-tenant-roles function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});