import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Edit3, Save, X, Plus, Trash2, Shield, Mail, Calendar, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface UserManagementProps {
  onBack: () => void;
}

interface UserWithAuth {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
  profile_created_at: string;
  user_created_at: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserWithAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    full_name: string;
    role: string;
    department: string;
  }>({
    full_name: '',
    role: '',
    department: ''
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'recruiter',
    department: ''
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const roles = [
    { value: 'recruiter', label: 'Recruiter', color: 'bg-blue-100 text-blue-800' },
    { value: 'hiring_manager', label: 'Hiring Manager', color: 'bg-green-100 text-green-800' },
    { value: 'line_manager', label: 'Line Manager', color: 'bg-purple-100 text-purple-800' },
    { value: 'hr_operations', label: 'HR Operations', color: 'bg-orange-100 text-orange-800' },
    { value: 'it_admin', label: 'IT Admin', color: 'bg-red-100 text-red-800' },
    { value: 'candidate', label: 'Candidate', color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('user_created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: UserWithAuth) => {
    setEditingUser(user.id);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role,
      department: user.department || ''
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({
      full_name: '',
      role: '',
      department: ''
    });
  };

  const saveUser = async (userId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim() || null,
          role: editForm.role,
          department: editForm.department.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? {
              ...user,
              full_name: editForm.full_name.trim() || null,
              role: editForm.role,
              department: editForm.department.trim() || null
            }
          : user
      ));

      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Kullanıcı güncellenirken bir hata oluştu.');
    } finally {
      setUpdating(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Call the Edge Function to create user
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: createForm.email,
            password: createForm.password,
            fullName: createForm.full_name,
            role: createForm.role,
            department: createForm.department
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

      console.log('User created successfully:', result.user);

      // Reset form and refresh users list
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        role: 'recruiter',
        department: ''
      });
      setShowCreateForm(false);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Kullanıcı oluşturulurken hata: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`${userEmail} kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    try {
      // Delete user from Supabase Auth (this will cascade to profiles due to foreign key)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Kullanıcı silinirken bir hata oluştu.');
    }
  };

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[0];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
              <p className="text-gray-600">Sistem kullanıcılarını yönetin</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#6CBE45] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Yeni Kullanıcı
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="text-[#1C4DA1]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Shield className="text-[#6CBE45]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Admin Kullanıcılar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => ['hr_operations', 'it_admin'].includes(u.role)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Building className="text-purple-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Recruiter</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'recruiter').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="text-orange-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Manager</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => ['hiring_manager', 'line_manager'].includes(u.role)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Kullanıcılar</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                            placeholder="Ad Soyad"
                          />
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} />
                            {user.email}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || 'İsim belirtilmemiş'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} />
                            {user.email}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        >
                          {roles.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleInfo(user.role).color}`}>
                          {getRoleInfo(user.role).label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <input
                          type="text"
                          value={editForm.department}
                          onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                          placeholder="Departman"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">
                          {user.department || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        {new Date(user.user_created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingUser === user.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveUser(user.id)}
                            disabled={updating}
                            className="text-[#6CBE45] hover:text-green-700 transition-colors disabled:opacity-50"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditing(user)}
                            className="text-[#1C4DA1] hover:text-blue-700 transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Henüz kullanıcı bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Kullanıcı Oluştur</h3>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="kullanici@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="Güçlü bir şifre girin"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="Kullanıcının adı ve soyadı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departman (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={createForm.department}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="İK, Teknoloji, Satış vb."
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#6CBE45] text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    'Kullanıcı Oluştur'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;