-- Önce mevcut get_current_tenant_id fonksiyonunu kontrol edelim
DROP FUNCTION IF EXISTS get_current_tenant_id();

-- get_current_tenant_id fonksiyonunu yeniden oluştur
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tenant_id uuid;
  user_role text;
BEGIN
  -- Kullanıcının rolünü al
  user_role := (auth.jwt() ->> 'user_metadata')::json ->> 'role';
  
  -- super_admin ve it_admin rolleri için null döndür (tüm tenant'lara erişim)
  IF user_role IN ('super_admin', 'it_admin') THEN
    RETURN NULL;
  END IF;
  
  -- Diğer roller için tenant_id'yi profiles tablosundan al
  SELECT tenant_id INTO user_tenant_id
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_tenant_id;
END;
$$;

-- interviews tablosu için mevcut politikaları kaldır
DROP POLICY IF EXISTS "Users can view interviews based on role and tenant" ON interviews;
DROP POLICY IF EXISTS "Job stakeholders can manage interviews" ON interviews;
DROP POLICY IF EXISTS "Anyone can create interviews" ON interviews;
DROP POLICY IF EXISTS "Anyone can update interview status" ON interviews;

-- interviews tablosu için yeni politikalar oluştur
CREATE POLICY "it_admin_super_admin_full_access" ON interviews
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
  );

CREATE POLICY "tenant_based_access" ON interviews
  FOR SELECT
  TO authenticated
  USING (
    -- it_admin ve super_admin değilse tenant kontrolü yap
    CASE 
      WHEN (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin') THEN true
      ELSE tenant_id = get_current_tenant_id()
    END
  );

CREATE POLICY "job_stakeholders_manage" ON interviews
  FOR ALL
  TO authenticated
  USING (
    -- it_admin ve super_admin her zaman erişebilir
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    OR
    -- Job stakeholders erişebilir
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = interviews.job_id
      AND (
        jobs.created_by = auth.uid()
        OR jobs.hiring_manager_id = auth.uid()
        OR jobs.line_manager_id = auth.uid()
        OR (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'hr_operations'
      )
    )
  )
  WITH CHECK (
    -- it_admin ve super_admin her zaman erişebilir
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    OR
    -- Job stakeholders erişebilir
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = interviews.job_id
      AND (
        jobs.created_by = auth.uid()
        OR jobs.hiring_manager_id = auth.uid()
        OR jobs.line_manager_id = auth.uid()
        OR (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'hr_operations'
      )
    )
  );

-- Anonim kullanıcılar için interview erişimi (sadece interview linki ile)
CREATE POLICY "anonymous_interview_access" ON interviews
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- jobs tablosu için de benzer düzeltme yapalım
DROP POLICY IF EXISTS "Users can view jobs based on role and tenant" ON jobs;

CREATE POLICY "jobs_it_admin_super_admin_full_access" ON jobs
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
  );

CREATE POLICY "jobs_tenant_based_access" ON jobs
  FOR SELECT
  TO authenticated
  USING (
    -- it_admin ve super_admin değilse tenant kontrolü yap
    CASE 
      WHEN (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin') THEN true
      ELSE tenant_id = get_current_tenant_id()
    END
  );

-- Diğer job politikaları için de güncelleme
CREATE POLICY "jobs_stakeholders_manage" ON jobs
  FOR ALL
  TO authenticated
  USING (
    -- it_admin ve super_admin her zaman erişebilir
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    OR
    -- Job stakeholders erişebilir
    (
      created_by = auth.uid()
      OR hiring_manager_id = auth.uid()
      OR line_manager_id = auth.uid()
      OR (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('hr_operations', 'recruiter')
    )
  )
  WITH CHECK (
    -- it_admin ve super_admin her zaman erişebilir
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('it_admin', 'super_admin')
    OR
    -- Job stakeholders erişebilir
    (
      created_by = auth.uid()
      OR hiring_manager_id = auth.uid()
      OR line_manager_id = auth.uid()
      OR (auth.jwt() ->> 'user_metadata')::json ->> 'role' IN ('hr_operations', 'recruiter')
    )
  );

-- Test için debug fonksiyonu
CREATE OR REPLACE FUNCTION debug_user_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'user_id', auth.uid(),
    'user_role', (auth.jwt() ->> 'user_metadata')::json ->> 'role',
    'tenant_id_from_function', get_current_tenant_id(),
    'tenant_id_from_profile', (SELECT tenant_id FROM profiles WHERE id = auth.uid()),
    'is_it_admin', (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'it_admin',
    'is_super_admin', (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'super_admin'
  ) INTO result;
  
  RETURN result;
END;
$$;