/*
  # Rol Yönetimi Sistemi - Veritabanı Şeması

  1. Yeni Tablolar
    - `modules` - Sistem modülleri (Candidate Pool, Job Requisition, vb.)
    - `permissions` - İzin türleri (view, edit, execute)
    - `roles` - Tenant bazlı roller
    - `role_permissions` - Rol-modül-izin ilişkileri
    - `audit_logs` - Denetim kayıtları

  2. Güvenlik
    - RLS politikaları tüm tablolar için etkinleştirildi
    - Audit log tetikleyicileri eklendi
    - Son IT admin koruması eklendi

  3. Fonksiyonlar
    - Audit log fonksiyonları
    - Bootstrap tenant roles tetikleyicisi
*/

-- modules tablosu
CREATE TABLE IF NOT EXISTS public.modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- permissions tablosu
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL UNIQUE, -- e.g., 'view', 'edit', 'execute'
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- roles tablosu
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    inherit_order integer NOT NULL DEFAULT 0, -- Hierarchy level for inheritance
    is_system_role boolean DEFAULT false, -- True for roles bootstrapped by the system
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (tenant_id, name) -- Role names must be unique per tenant
);

-- role_permissions tablosu
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
    module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, module_id, permission_id),
    created_at timestamp with time zone DEFAULT now()
);

-- RLS politikalarını etkinleştir
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- modules tablosu için RLS politikaları
CREATE POLICY "Modules: Everyone can read" ON public.modules
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Modules: IT/Super admins can manage" ON public.modules
    FOR ALL TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    );

-- permissions tablosu için RLS politikaları
CREATE POLICY "Permissions: Everyone can read" ON public.permissions
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Permissions: IT/Super admins can manage" ON public.permissions
    FOR ALL TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    );

-- roles tablosu için RLS politikaları
CREATE POLICY "Roles: Tenant users can read their roles" ON public.roles
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
        OR tenant_id = get_current_tenant_id()
    );

CREATE POLICY "Roles: IT/Super admins can manage" ON public.roles
    FOR ALL TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    );

-- role_permissions tablosu için RLS politikaları
CREATE POLICY "Role Permissions: Tenant users can read" ON public.role_permissions
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
        OR EXISTS (
            SELECT 1 FROM public.roles 
            WHERE roles.id = role_permissions.role_id 
            AND roles.tenant_id = get_current_tenant_id()
        )
    );

CREATE POLICY "Role Permissions: IT/Super admins can manage" ON public.role_permissions
    FOR ALL TO authenticated
    USING (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    );

-- Denetim Günlüğü (Audit Log) Fonksiyonları ve Tetikleyicileri

-- log_profile_changes fonksiyonu
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_tenant_id uuid := (SELECT tenant_id FROM profiles WHERE id = auth.uid());
  client_ip inet := inet_client_addr();
  user_agent text := current_setting('request.headers', true)::json->>'user-agent';
  session_id text := current_setting('request.headers', true)::json->>'x-supabase-session-id';
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, session_id)
    VALUES (
      current_tenant_id,
      current_user_id,
      'USER_ROLE_UPDATED',
      'Profile',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      client_ip,
      user_agent,
      session_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- profiles tablosu için tetikleyici
DROP TRIGGER IF EXISTS trg_log_profile_role_changes ON public.profiles;
CREATE TRIGGER trg_log_profile_role_changes
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_changes();

-- log_role_changes fonksiyonu
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_tenant_id uuid := (SELECT tenant_id FROM profiles WHERE id = auth.uid());
  client_ip inet := inet_client_addr();
  user_agent text := current_setting('request.headers', true)::json->>'user-agent';
  session_id text := current_setting('request.headers', true)::json->>'x-supabase-session-id';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, new_values, ip_address, user_agent, session_id)
    VALUES (
      current_tenant_id,
      current_user_id,
      'ROLE_CREATED',
      'Role',
      NEW.id,
      to_jsonb(NEW),
      client_ip,
      user_agent,
      session_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, session_id)
    VALUES (
      current_tenant_id,
      current_user_id,
      'ROLE_UPDATED',
      'Role',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      client_ip,
      user_agent,
      session_id
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, old_values, ip_address, user_agent, session_id)
    VALUES (
      current_tenant_id,
      current_user_id,
      'ROLE_DELETED',
      'Role',
      OLD.id,
      to_jsonb(OLD),
      client_ip,
      user_agent,
      session_id
    );
  END IF;
  RETURN NULL;
END;
$$;

-- roles tablosu için tetikleyici
DROP TRIGGER IF EXISTS trg_log_role_changes ON public.roles;
CREATE TRIGGER trg_log_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.log_role_changes();

-- log_role_permission_changes fonksiyonu
CREATE OR REPLACE FUNCTION public.log_role_permission_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_tenant_id uuid := (SELECT tenant_id FROM profiles WHERE id = auth.uid());
  client_ip inet := inet_client_addr();
  user_agent text := current_setting('request.headers', true)::json->>'user-agent';
  session_id text := current_setting('request.headers', true)::json->>'x-supabase-session-id';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, new_values, ip_address, user_agent, session_id)
    VALUES (
      current_tenant_id,
      current_user_id,
      'ROLE_PERMISSION_ASSIGNED',
      'RolePermission',
      NEW.role_id,
      jsonb_build_object('role_id', NEW.role_id, 'module_id', NEW.module_id, 'permission_id', NEW.permission_id),
      client_ip,
      user_agent,
      session_id
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, old_values, ip_address, user_agent, session_id)
    VALUES (
      current_tenant_id,
      current_user_id,
      'ROLE_PERMISSION_REVOKED',
      'RolePermission',
      OLD.role_id,
      jsonb_build_object('role_id', OLD.role_id, 'module_id', OLD.module_id, 'permission_id', OLD.permission_id),
      client_ip,
      user_agent,
      session_id
    );
  END IF;
  RETURN NULL;
END;
$$;

-- role_permissions tablosu için tetikleyici
DROP TRIGGER IF EXISTS trg_log_role_permission_changes ON public.role_permissions;
CREATE TRIGGER trg_log_role_permission_changes
AFTER INSERT OR DELETE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.log_role_permission_changes();

-- Varsayılan modülleri ve izinleri ekle
INSERT INTO public.modules (name, description) VALUES
    ('Candidate Pool & CRM', 'Aday havuzu ve müşteri ilişkileri yönetimi'),
    ('Job Requisition', 'İş ilanı oluşturma ve yönetimi'),
    ('Interview Calendar', 'Mülakat takvimi ve planlama'),
    ('Offer & E-Signature', 'Teklif ve elektronik imza süreçleri'),
    ('Reporting', 'Raporlama ve analitik'),
    ('Tenant Settings', 'Tenant ayarları ve yapılandırma'),
    ('User & Role Management', 'Kullanıcı ve rol yönetimi'),
    ('Audit Logs', 'Denetim kayıtları')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (action, description) VALUES
    ('view', 'Görüntüleme izni'),
    ('edit', 'Düzenleme izni'),
    ('execute', 'İşlem yapma izni')
ON CONFLICT (action) DO NOTHING;

-- Bootstrap tenant roles için tetikleyici fonksiyonu
-- Not: Bu fonksiyon Edge Function çağırmak yerine doğrudan SQL ile rol oluşturacak
CREATE OR REPLACE FUNCTION public.bootstrap_tenant_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  role_record RECORD;
  module_record RECORD;
  permission_record RECORD;
  role_id uuid;
  module_id uuid;
  permission_id uuid;
BEGIN
  -- Varsayılan rolleri oluştur
  FOR role_record IN 
    SELECT * FROM (VALUES
      ('Super_Admin', 'Global administrator', 0, true),
      ('IT_Admin', 'Tenant-level IT administrator', 1, true),
      ('Recruiter', 'Candidate sourcing and management', 2, true),
      ('Hiring_Manager', 'Job creation and approval', 3, true),
      ('HR_Operations', 'Offer and onboarding management', 4, true),
      ('Line_Manager', 'Panel interviews and team fit', 5, true)
    ) AS t(name, description, inherit_order, is_system_role)
  LOOP
    INSERT INTO public.roles (tenant_id, name, description, inherit_order, is_system_role)
    VALUES (NEW.id, role_record.name, role_record.description, role_record.inherit_order, role_record.is_system_role)
    RETURNING id INTO role_id;

    -- Rol bazlı izinleri ata
    CASE role_record.name
      WHEN 'IT_Admin' THEN
        -- IT_Admin tüm modüllere erişebilir
        FOR module_record IN SELECT id, name FROM public.modules LOOP
          FOR permission_record IN SELECT id FROM public.permissions LOOP
            INSERT INTO public.role_permissions (role_id, module_id, permission_id)
            VALUES (role_id, module_record.id, permission_record.id)
            ON CONFLICT DO NOTHING;
          END LOOP;
        END LOOP;
      
      WHEN 'Recruiter' THEN
        -- Recruiter: Candidate Pool, Job Requisition, Interview Calendar
        FOR module_record IN 
          SELECT id FROM public.modules 
          WHERE name IN ('Candidate Pool & CRM', 'Job Requisition', 'Interview Calendar')
        LOOP
          FOR permission_record IN SELECT id FROM public.permissions LOOP
            INSERT INTO public.role_permissions (role_id, module_id, permission_id)
            VALUES (role_id, module_record.id, permission_record.id)
            ON CONFLICT DO NOTHING;
          END LOOP;
        END LOOP;
      
      WHEN 'Hiring_Manager' THEN
        -- Hiring Manager: Candidate Pool (view), Job Requisition (all)
        SELECT id INTO module_id FROM public.modules WHERE name = 'Candidate Pool & CRM';
        SELECT id INTO permission_id FROM public.permissions WHERE action = 'view';
        INSERT INTO public.role_permissions (role_id, module_id, permission_id)
        VALUES (role_id, module_id, permission_id) ON CONFLICT DO NOTHING;
        
        SELECT id INTO module_id FROM public.modules WHERE name = 'Job Requisition';
        FOR permission_record IN SELECT id FROM public.permissions LOOP
          INSERT INTO public.role_permissions (role_id, module_id, permission_record.id)
          VALUES (role_id, module_id, permission_record.id) ON CONFLICT DO NOTHING;
        END LOOP;
      
      WHEN 'HR_Operations' THEN
        -- HR Operations: Candidate Pool (view), Offer & E-Signature (all), Reporting (view)
        SELECT id INTO module_id FROM public.modules WHERE name = 'Candidate Pool & CRM';
        SELECT id INTO permission_id FROM public.permissions WHERE action = 'view';
        INSERT INTO public.role_permissions (role_id, module_id, permission_id)
        VALUES (role_id, module_id, permission_id) ON CONFLICT DO NOTHING;
        
        SELECT id INTO module_id FROM public.modules WHERE name = 'Offer & E-Signature';
        FOR permission_record IN SELECT id FROM public.permissions LOOP
          INSERT INTO public.role_permissions (role_id, module_id, permission_record.id)
          VALUES (role_id, module_id, permission_record.id) ON CONFLICT DO NOTHING;
        END LOOP;
        
        SELECT id INTO module_id FROM public.modules WHERE name = 'Reporting';
        SELECT id INTO permission_id FROM public.permissions WHERE action = 'view';
        INSERT INTO public.role_permissions (role_id, module_id, permission_id)
        VALUES (role_id, module_id, permission_id) ON CONFLICT DO NOTHING;
      
      WHEN 'Line_Manager' THEN
        -- Line Manager: Interview Calendar (view)
        SELECT id INTO module_id FROM public.modules WHERE name = 'Interview Calendar';
        SELECT id INTO permission_id FROM public.permissions WHERE action = 'view';
        INSERT INTO public.role_permissions (role_id, module_id, permission_id)
        VALUES (role_id, module_id, permission_id) ON CONFLICT DO NOTHING;
      
      ELSE
        -- Super_Admin ve diğer roller için özel izin ataması yapılmaz
        NULL;
    END CASE;
  END LOOP;

  RETURN NEW;
END;
$$;

-- tenants tablosuna yeni bir kayıt eklendiğinde tetikleyiciyi çalıştır
DROP TRIGGER IF EXISTS trg_bootstrap_tenant_roles ON public.tenants;
CREATE TRIGGER trg_bootstrap_tenant_roles
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.bootstrap_tenant_roles();