import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Filter, Edit3, Trash2, UserCog, Building, Shield, Mail, Calendar, AlertCircle, CheckCircle, Users, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tenant } from '../types';
import UserFormModal from './UserFormModal';

interface UserManagementProps {
  onBack: () => void;
}

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

const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserWithAuth[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithAuth | null>(null);
  const [deleting, setDeleting] = useState<{ [key: string]: boolean }>({});

  const roles = [
    { value: 'recruiter', label: 'Recruiter', color: 'bg-blue-100 text-blue-800' },
    { value: 'hiring_manager', label: 'Hiring Manager', color: 'bg-green-100 text-green-800' },
    { value: 'line_manager', label: 'Line Manager', color: 'bg-purple-100 text-purple-800' },
    { value: 'hr_operations', label: 'HR Operations', color: 'bg-orange-100 text-orange-800' },
    { value: 'it_admin', label: 'IT Admin', color: 'bg-red-100 text-red-800' },
    { value: 'candidate', label: 'Candidate', color: 'bg-gray-100 text-gray-800' },
    { value: 'super_admin', label: 'Super Admin', color: 'bg-yellow-100 text-yellow-800' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users via Edge Function...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      console.log(`Successfully fetched ${result.users.length} users`);
      setUsers(result.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Kullanıcılar yüklenirken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setDeleting(prev => ({ ...prev, [userId]: true }));

    try {
      console.log(`Attempting to delete user: ${userId}`);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ userId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user via admin function');
      }

      console.log('User deleted successfully');

      // Update local state after successful deletion
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      alert('Kullanıcı başarıyla silindi!');

    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Kullanıcı silinirken hata: ${error.message}`);
    } finally {
      setDeleting(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserSaved = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[0];
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesTenant = !tenantFilter || user.tenant_id === tenantFilter;
    
    return matchesSearch && matchesRole && matchesTenant;
  });

  const userStats = {
    total: users.length,
    byRole: roles.map(role => ({
      ...role,
      count: users.filter(u => u.role === role.value).length
    })),
    byTenant: tenants.map(tenant => ({
      ...tenant,
      count: users.filter(u => u.tenant_id === tenant.id).length
    }))
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserCog className="text-[#1C4DA1]" size={24} />
                Kullanıcı Yönetimi
              </h1>
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
                <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Shield className="text-[#6CBE45]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">IT Adminler</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.byRole.find(r => r.value === 'it_admin')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Building className="text-purple-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Aktif Tenantlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.byTenant.filter(t => t.count > 0).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Crown className="text-orange-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">HR Operations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.byRole.find(r => r.value === 'hr_operations')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Kullanıcı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
            >
              <option value="">Tüm Roller</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
            >
              <option value="">Tüm Tenantlar</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setTenantFilter('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Kullanıcılar ({filteredUsers.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4DA1] mx-auto"></div>
              <p className="mt-2 text-gray-600">Kullanıcılar yükleniyor...</p>
            </div>
          ) : (
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
                      Organizasyon
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
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-[#1C4DA1] flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.full_name 
                                  ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                                  : user.email[0].toUpperCase()
                                }
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'İsim belirtilmemiş'}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={12} />
                              {user.email}
                            </div>
                            {user.department && (
                              <div className="text-xs text-gray-400">
                                {user.department}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleInfo(user.role).color}`}>
                          {getRoleInfo(user.role).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.tenant_name || 'Tenant bulunamadı'}
                        </div>
                        {user.tenant_slug && (
                          <div className="text-xs text-gray-500 font-mono">
                            {user.tenant_slug}
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
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-[#1C4DA1] hover:text-blue-700 transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleting[user.id]}
                            className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            title="Sil"
                          >
                            {deleting[user.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-12">
              <UserCog size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Kullanıcı bulunamadı.</p>
              <p className="text-sm text-gray-400">Arama kriterlerinizi değiştirmeyi deneyin.</p>
            </div>
          )}
        </div>

        {/* Role Distribution */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rol Dağılımı</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {userStats.byRole.map((role) => (
              <div key={role.value} className="text-center">
                <div className={`inline-flex px-3 py-2 rounded-full text-sm font-medium ${role.color} mb-2`}>
                  {role.label}
                </div>
                <div className="text-2xl font-bold text-gray-900">{role.count}</div>
                <div className="text-xs text-gray-500">kullanıcı</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      {(showCreateForm || editingUser) && (
        <UserFormModal
          user={editingUser}
          tenants={tenants}
          onSave={handleUserSaved}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;