/*
  # Super Admin Rolü Ekleme

  1. Değişiklikler
    - `profiles` tablosundaki `role` CHECK kısıtlamasını güncelle
    - `super_admin` rolünü destekleyecek şekilde kısıtlamayı genişlet

  2. Güvenlik
    - Mevcut RLS politikaları zaten `super_admin` rolünü destekliyor
    - Bu değişiklik sadece veritabanı kısıtlamasını güncelliyor
*/

-- profiles tablosundaki role check kısıtlamasını güncelle
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Yeni kısıtlamayı super_admin dahil ederek ekle
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY[
  'recruiter'::text, 
  'hiring_manager'::text, 
  'line_manager'::text, 
  'candidate'::text, 
  'hr_operations'::text, 
  'it_admin'::text,
  'super_admin'::text
]));