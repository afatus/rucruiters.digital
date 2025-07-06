import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Shield, Building, Loader2 } from 'lucide-react';
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

  const isEditing = !!user;

  const roles = [
    { value: 'recruiter', label: 'Recruiter' },
    { value: 'hiring_manager', label: 'Hiring Manager' },
    { value: 'line_manager', label: 'Line Manager' },
    { value: 'hr_operations', label: 'HR Operations' },
    { value: 'it_admin', label: 'IT Admin' },
    { value: 'candidate', label: 'Candidate' },
    { value: 'super_admin', label: 'Super Admin' }
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        full_name: user.full_name || '',
        role: user.role,
        department: user.department || '',
        tenant_id: user.tenant_id || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Kullanıcı oluşturulamadı');

      onSave();
    } catch (err) {
      console.error('Error creating user:', err);
      setErrors({ general: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      {/* Form alanları buraya gelecek */}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : 'Kaydet'}
      </button>
      <button onClick={onCancel}>İptal</button>
    </div>
  );
};

export default UserFormModal;