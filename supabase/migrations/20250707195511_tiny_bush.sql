-- Hatalı ve gereksiz politikaları temizliyoruz
DROP POLICY IF EXISTS "jobs_it_admin_super_admin_full_access" ON jobs;
DROP POLICY IF EXISTS "jobs_tenant_based_access" ON jobs;
DROP POLICY IF EXISTS "jobs_stakeholders_manage" ON jobs;
DROP POLICY IF EXISTS "tenant_based_access" ON interviews;
DROP POLICY IF EXISTS "it_admin_super_admin_full_access" ON interviews;
DROP POLICY IF EXISTS "job_stakeholders_manage" ON interviews;
DROP POLICY IF EXISTS "anonymous_interview_access" ON interviews;
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles via metadata" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Roles: Tenant users can read their roles" ON roles;
DROP POLICY IF EXISTS "Roles: IT/Super admins can manage" ON roles;
DROP POLICY IF EXISTS "Role Permissions: Tenant users can read" ON role_permissions;
DROP POLICY IF EXISTS "Role Permissions: IT/Super admins can manage" ON role_permissions;

-- Tenant ID'yi güvenli bir şekilde getiren fonksiyon
DROP FUNCTION IF EXISTS get_current_tenant_id();
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_tenant_id uuid;
  user_role text;
BEGIN
  -- Kullanıcının rolünü JWT (JSON Web Token) üzerinden al
  user_role := (auth.jwt() ->> 'user_metadata')::json ->> 'role';
  
  -- super_admin ve it_admin tüm tenant'ları görebilir, bu yüzden null döndererek filtreyi baypas et
  IF user_role IN ('super_admin', 'it_admin') THEN
    RETURN NULL;
  END IF;
  
  -- Diğer kullanıcılar için profillerinden kendi tenant_id'lerini al
  SELECT tenant_id INTO user_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_tenant_id;
END;
$$;

-- PROFILES TABLOSU İÇİN GÜVENLİ POLİTİKALAR
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins and users in the same tenant can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb->>'role' IN ('it_admin', 'super_admin') OR
    tenant_id = get_current_tenant_id()
  );

-- JOBS TABLOSU İÇİN GÜVENLİ POLİTİKALAR
CREATE POLICY "Admins and tenant users can access jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb->>'role' IN ('it_admin', 'super_admin') OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb->>'role' IN ('it_admin', 'super_admin') OR
    tenant_id = get_current_tenant_id()
  );

-- INTERVIEWS TABLOSU İÇİN GÜVENLİ POLİTİKALAR
CREATE POLICY "Admins and tenant users can access interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb->>'role' IN ('it_admin', 'super_admin') OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb->>'role' IN ('it_admin', 'super_admin') OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Anonymous users can access interviews by link" ON public.interviews
  FOR SELECT TO anon
  USING (true);

-- ROLES & PERMISSIONS TABLOLARI İÇİN GÜVENLİ POLİTİKALAR
CREATE POLICY "Admins and tenant users can read roles" ON public.roles
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('it_admin', 'super_admin') OR
        tenant_id = get_current_tenant_id()
    );

CREATE POLICY "Admins can manage roles" ON public.roles
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('it_admin', 'super_admin'))
    WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('it_admin', 'super_admin'));

CREATE POLICY "Admins and tenant users can read role permissions" ON public.role_permissions
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('it_admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM public.roles
            WHERE roles.id = role_permissions.role_id AND roles.tenant_id = get_current_tenant_id()
        )
    );

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('it_admin', 'super_admin'))
    WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('it_admin', 'super_admin'));