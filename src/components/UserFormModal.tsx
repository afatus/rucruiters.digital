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
    { value: 'candidate', label: 'Candidate' },
    { value: 'hr_operations', label: 'HR Operations' },
    { value: 'it_admin', label: 'IT Admin' },
    { value: 'super_admin', label: 'Super Admin' }
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '', // Never pre-fill password for editing
        full_name: user.full_name || '',
        role: user.role,
        department: user.department || '',
        tenant_id: user.tenant_id || ''
      });
    } else {
      // Reset form for new user
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'recruiter',
        department: '',
        tenant_id: tenants.length > 0 ? tenants[0].id : ''
      });
    }
    setErrors({});
  }, [user, tenants]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Şifre gereklidir';
    } else if (!isEditing && formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    if (!formData.tenant_id) {
      newErrors.tenant_id = 'Tenant seçimi gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Update existing user profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name.trim() || null,
            role: formData.role,
            department: formData.department.trim() || null,
            tenant_id: formData.tenant_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Create new user via Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              fullName: formData.full_name,
              role: formData.role,
              department: formData.department,
              tenantId: formData.tenant_id
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'User creation failed');
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving user:', error);
      
      if (error.message && error.message.includes('already been registered')) {
        setErrors({ email: 'Bu e-posta adresi zaten kayıtlı' });
      } else {
        alert(`Kullanıcı ${isEditing ? 'güncellenirken' : 'oluşturulurken'} hata: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1C4DA1] rounded-lg flex items-center justify-center">
              <User className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Oluştur'}
              </h3>
              <p className="text-sm text-gray-600">
                {isEditing ? 'Kullanıcı bilgilerini güncelleyin' : 'Sisteme yeni kullanıcı ekleyin'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail size={16} className="inline mr-2" />
              E-posta Adresi
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={isEditing} // Email cannot be changed when editing
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent ${
                isEditing ? 'bg-gray-50 text-gray-500' : ''
              } ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="kullanici@email.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">E-posta adresi düzenlenemez</p>
            )}
          </div>

          {/* Password (only for new users) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Güçlü bir şifre girin"
                minLength={6}
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ad Soyad
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
              placeholder="Kullanıcının adı ve soyadı"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield size={16} className="inline mr-2" />
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tenant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building size={16} className="inline mr-2" />
              Organizasyon
            </label>
            <select
              value={formData.tenant_id}
              onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent ${
                errors.tenant_id ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Organizasyon seçin...</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            {errors.tenant_id && (
              <p className="text-red-600 text-sm mt-1">{errors.tenant_id}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departman (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
              placeholder="İK, Teknoloji, Satış vb."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#6CBE45] text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isEditing ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? 'Güncelle' : 'Oluştur'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;