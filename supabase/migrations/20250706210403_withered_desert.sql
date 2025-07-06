/*
  # Security Definer Hatasını Düzelt

  1. Değişiklikler
    - View'lardan security_definer kısmını kaldır
    - View'ları yeniden oluştur

  2. Güvenlik
    - View'lar RLS politikalarını kullanacak
    - Güvenlik fonksiyonlar aracılığıyla sağlanacak
*/

-- Mevcut view'ları kaldır
DROP VIEW IF EXISTS public.tenant_user_roles;
DROP VIEW IF EXISTS public.user_roles;

-- user_roles view'ını yeniden oluştur (security_definer olmadan)
CREATE VIEW public.user_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.created_at as profile_created_at,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- tenant_user_roles view'ını yeniden oluştur (security_definer olmadan)
CREATE VIEW public.tenant_user_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  p.created_at as profile_created_at,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.tenants t ON p.tenant_id = t.id;

-- View'lar için RLS etkinleştir
ALTER VIEW public.user_roles SET (security_barrier = true);
ALTER VIEW public.tenant_user_roles SET (security_barrier = true);

-- View'lar için politikalar ekle
CREATE POLICY "user_roles_policy" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- IT Admin ve Super Admin tüm kullanıcıları görebilir
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (ARRAY['it_admin'::text, 'super_admin'::text]))
    OR
    -- Kullanıcılar kendi bilgilerini görebilir
    (auth.uid() = id)
  );

CREATE POLICY "tenant_user_roles_policy" ON public.tenant_user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Super Admin tüm kullanıcıları görebilir
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text)
    OR
    -- IT Admin kendi tenant'ındaki kullanıcıları görebilir
    (
      (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text)
      AND (tenant_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'tenant_id'::text))::uuid)
    )
    OR
    -- Kullanıcılar kendi bilgilerini görebilir
    (auth.uid() = id)
  );