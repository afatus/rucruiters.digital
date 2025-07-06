import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Tenant } from '../types';

interface UserWithAuth {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  profile_created_at: string;
  user_created_at: string;
}

interface UserFormModalProps {
  user?: UserWithAuth | null;
  tenants: Tenant[];
  onSave: () => void;
  onCancel: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, tenants, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'recruiter',
    department: '',
    tenant_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      const { data: authUser, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (signUpError || !authUser?.user) {
        throw new Error('Auth user creation failed');
      }

      const { error: insertError } = await supabase.from('profiles').insert([
        {
          id: authUser.user.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          department: formData.department || null,
          tenant_id: formData.tenant_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      if (insertError) {
        throw insertError;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving user:', error);
      setErrors({ general: 'Kullanıcı oluşturulurken hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form bileşenleri buraya gelecek */}
      <button onClick={handleSubmit} disabled={loading}>
        Kaydet
      </button>
    </div>
  );
};

export default UserFormModal;