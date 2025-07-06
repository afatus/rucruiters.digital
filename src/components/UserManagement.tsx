import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Edit3, Save, X, Plus, Trash2, Shield, Mail, Calendar, Building, 
  Search, Filter, Download, Upload, Eye, EyeOff, UserPlus, Settings, Activity,
  CheckCircle, XCircle, AlertCircle, Clock, Globe, Phone, MapPin, Briefcase,
  MoreVertical, Copy, Send, FileText, UserCheck, UserX, Crown, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Tenant } from '../types';

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
  profile_created_at: string;
  user_created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  is_active: boolean;
}

interface UserFilters {
  role?: string[];
  tenant?: string[];
  department?: string[];
  status?: string[];
  lastLogin?: string;
}

interface BulkAction {
  type: 'delete' | 'activate' | 'deactivate' | 'change_role' | 'change_tenant' | 'export';
  data?: any;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserWithAuth[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UserFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'created_at' | 'last_login'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modals and forms
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState<UserWithAuth | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState<{
    full_name: string;
    role: string;
    department: string;
    tenant_id: string;
    phone: string;
    is_active: boolean;
  }>({
    full_name: '',
    role: '',
    department: '',
    tenant_id: '',
    phone: '',
    is_active: true
  });
  
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'recruiter',
    department: '',
    tenant_id: '',
    phone: '',
    send_invite: true
  });

  const [inviteForm, setInviteForm] = useState({
    emails: '',
    role: 'recruiter',
    tenant_id: '',
    department: '',
    message: ''
  });

  const [bulkActionData, setBulkActionData] = useState<{
    action: string;
    role?: string;
    tenant_id?: string;
  }>({
    action: '',
    role: '',
    tenant_id: ''
  });

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [inviting, setInviting] = useState(false);

  const roles = [
    { value: 'recruiter', label: 'Recruiter', color: 'bg-blue-100 text-blue-800', description: 'İş ilanları ve mülakatları yönetir' },
    { value: 'hiring_manager', label: 'Hiring Manager', color: 'bg-green-100 text-green-800', description: 'İşe alım süreçlerini yönetir' },
    { value: 'line_manager', label: 'Line Manager', color: 'bg-purple-100 text-purple-800', description: 'Departman yöneticisi' },
    { value: 'hr_operations', label: 'HR Operations', color: 'bg-orange-100 text-orange-800', description: 'İK operasyonları yöneticisi' },
    { value: 'it_admin', label: 'IT Admin', color: 'bg-red-100 text-red-800', description: 'Sistem yöneticisi' },
    { value: 'candidate', label: 'Candidate', color: 'bg-gray-100 text-gray-800', description: 'Aday kullanıcı' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Aktif', color: 'bg-green-100 text-green-800' },
    { value: 'inactive', label: 'Pasif', color: 'bg-gray-100 text-gray-800' },
    { value: 'pending', label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'suspended', label: 'Askıya Alınmış', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [searchTerm, filters, sortBy, sortOrder]);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users via Edge Function...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      let filteredUsers = result.users || [];

      // Apply search filter
      if (searchTerm) {
        filteredUsers = filteredUsers.filter((user: UserWithAuth) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.department?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply role filter
      if (filters.role && filters.role.length > 0) {
        filteredUsers = filteredUsers.filter((user: UserWithAuth) =>
          filters.role!.includes(user.role)
        );
      }

      // Apply tenant filter
      if (filters.tenant && filters.tenant.length > 0) {
        filteredUsers = filteredUsers.filter((user: UserWithAuth) =>
          filters.tenant!.includes(user.tenant_id || '')
        );
      }

      // Apply department filter
      if (filters.department && filters.department.length > 0) {
        filteredUsers = filteredUsers.filter((user: UserWithAuth) =>
          user.department && filters.department!.includes(user.department)
        );
      }

      // Sort users
      filteredUsers.sort((a: UserWithAuth, b: UserWithAuth) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.full_name || a.email;
            bValue = b.full_name || b.email;
            break;
          case 'email':
            aValue = a.email;
            bValue = b.email;
            break;
          case 'role':
            aValue = a.role;
            bValue = b.role;
            break;
          case 'last_login':
            aValue = a.last_sign_in_at || '1970-01-01';
            bValue = b.last_sign_in_at || '1970-01-01';
            break;
          default:
            aValue = a.user_created_at;
            bValue = b.user_created_at;
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      console.log(`Successfully fetched and filtered ${filteredUsers.length} users`);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: UserWithAuth) => {
    setEditingUser(user.id);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role,
      department: user.department || '',
      tenant_id: user.tenant_id || '',
      phone: user.phone || '',
      is_active: user.is_active
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({
      full_name: '',
      role: '',
      department: '',
      tenant_id: '',
      phone: '',
      is_active: true
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
          tenant_id: editForm.tenant_id || null,
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
              department: editForm.department.trim() || null,
              tenant_id: editForm.tenant_id || null,
              tenant_name: tenants.find(t => t.id === editForm.tenant_id)?.name || null
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
            department: createForm.department,
            tenantId: createForm.tenant_id,
            phone: createForm.phone
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

      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        role: 'recruiter',
        department: '',
        tenant_id: '',
        phone: '',
        send_invite: true
      });
      setShowCreateForm(false);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message && error.message.includes('already been registered')) {
        alert('Bu e-posta adresi zaten kayıtlı. Lütfen farklı bir e-posta adresi kullanın.');
      } else {
        alert(`Kullanıcı oluşturulurken hata: ${error.message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const sendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const emails = inviteForm.emails.split('\n').map(email => email.trim()).filter(email => email);
      
      for (const email of emails) {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              email: email,
              password: tempPassword,
              fullName: email.split('@')[0],
              role: inviteForm.role,
              department: inviteForm.department,
              tenantId: inviteForm.tenant_id
            })
          }
        );

        if (!response.ok) {
          console.error(`Failed to create user for ${email}`);
          continue;
        }

        // In a real app, you would send an email with the temporary password
        console.log(`User created for ${email} with temp password: ${tempPassword}`);
      }

      setInviteForm({
        emails: '',
        role: 'recruiter',
        tenant_id: '',
        department: '',
        message: ''
      });
      setShowInviteForm(false);
      await fetchUsers();
      alert(`${emails.length} kullanıcı davet edildi!`);
    } catch (error: any) {
      console.error('Error sending invites:', error);
      alert(`Davet gönderilirken hata: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) {
      alert('Lütfen önce kullanıcı seçin.');
      return;
    }

    try {
      switch (bulkActionData.action) {
        case 'delete':
          if (confirm(`${selectedUsers.length} kullanıcıyı silmek istediğinizden emin misiniz?`)) {
            for (const userId of selectedUsers) {
              await supabase.auth.admin.deleteUser(userId);
            }
            await fetchUsers();
            setSelectedUsers([]);
          }
          break;

        case 'change_role':
          if (bulkActionData.role) {
            const { error } = await supabase
              .from('profiles')
              .update({ role: bulkActionData.role })
              .in('id', selectedUsers);
            
            if (error) throw error;
            await fetchUsers();
            setSelectedUsers([]);
          }
          break;

        case 'change_tenant':
          if (bulkActionData.tenant_id) {
            const { error } = await supabase
              .from('profiles')
              .update({ tenant_id: bulkActionData.tenant_id })
              .in('id', selectedUsers);
            
            if (error) throw error;
            await fetchUsers();
            setSelectedUsers([]);
          }
          break;

        case 'export':
          exportUsers();
          break;
      }
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('Toplu işlem sırasında hata oluştu.');
    }
  };

  const exportUsers = () => {
    const selectedUserData = users.filter(user => selectedUsers.includes(user.id));
    const csvContent = generateCSV(selectedUserData);
    downloadCSV(csvContent, 'users.csv');
  };

  const generateCSV = (data: UserWithAuth[]) => {
    const headers = ['Name', 'Email', 'Role', 'Department', 'Tenant', 'Created', 'Last Login'];
    const rows = data.map(user => [
      user.full_name || '',
      user.email,
      user.role,
      user.department || '',
      user.tenant_name || '',
      new Date(user.user_created_at).toLocaleDateString(),
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`${userEmail} kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Kullanıcı silinirken bir hata oluştu.');
    }
  };

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[0];
  };

  const getStatusInfo = (user: UserWithAuth) => {
    if (!user.email_confirmed_at) return statusOptions.find(s => s.value === 'pending');
    if (!user.is_active) return statusOptions.find(s => s.value === 'inactive');
    return statusOptions.find(s => s.value === 'active');
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

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
              <h1 className="text-2xl font-bold text-gray-900">Gelişmiş Kullanıcı Yönetimi</h1>
              <p className="text-gray-600">Sistem kullanıcılarını kapsamlı şekilde yönetin</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInviteForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Send size={20} />
                Toplu Davet
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Upload size={20} />
                İçe Aktar
              </button>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
              <UserCheck className="text-[#6CBE45]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Aktif Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.is_active && u.email_confirmed_at).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Shield className="text-purple-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Admin</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => ['hr_operations', 'it_admin'].includes(u.role)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="text-orange-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Beklemede</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => !u.email_confirmed_at).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Building className="text-indigo-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Tenant Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Kullanıcı ara (ad, e-posta, departman)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters ? 'bg-[#1C4DA1] text-white border-[#1C4DA1]' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter size={20} />
              Filtreler
            </button>
            {selectedUsers.length > 0 && (
              <button
                onClick={() => setShowBulkActions(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Settings size={20} />
                Toplu İşlem ({selectedUsers.length})
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  multiple
                  value={filters.role || []}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    role: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  size={3}
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select
                  multiple
                  value={filters.tenant || []}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    tenant: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  size={3}
                >
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                <select
                  multiple
                  value={filters.status || []}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    status: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  size={3}
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({})}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Kullanıcılar ({users.length})
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                >
                  <option value="created_at">Kayıt Tarihi</option>
                  <option value="name">İsim</option>
                  <option value="email">E-posta</option>
                  <option value="role">Rol</option>
                  <option value="last_login">Son Giriş</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <button
                  onClick={() => exportUsers()}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <Download size={16} />
                  Dışa Aktar
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(currentUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      className="rounded border-gray-300 text-[#1C4DA1] focus:ring-[#1C4DA1]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol & Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Aktivite
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(prev => [...prev, user.id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="rounded border-gray-300 text-[#1C4DA1] focus:ring-[#1C4DA1]"
                      />
                    </td>
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
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                            placeholder="Telefon"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-[#1C4DA1] flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {(user.full_name || user.email)[0].toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'İsim belirtilmemiş'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail size={12} />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Phone size={12} />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                          >
                            {roles.map(role => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editForm.tenant_id}
                            onChange={(e) => setEditForm(prev => ({ ...prev, tenant_id: e.target.value }))}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                          >
                            <option value="">Tenant Seçin...</option>
                            {tenants.map(tenant => (
                              <option key={tenant.id} value={tenant.id}>
                                {tenant.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editForm.department}
                            onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                            placeholder="Departman"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleInfo(user.role).color}`}>
                            {getRoleInfo(user.role).label}
                          </span>
                          {user.tenant_name && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Building size={12} />
                              {user.tenant_name}
                            </div>
                          )}
                          {user.department && (
                            <div className="text-xs text-gray-500">{user.department}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusInfo(user)?.color}`}>
                          {getStatusInfo(user)?.label}
                        </span>
                        {!user.email_confirmed_at && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertCircle size={12} />
                            E-posta doğrulanmamış
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} />
                          {new Date(user.user_created_at).toLocaleDateString('tr-TR')}
                        </div>
                        {user.last_sign_in_at ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Activity size={12} />
                            Son giriş: {new Date(user.last_sign_in_at).toLocaleDateString('tr-TR')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">Hiç giriş yapmamış</div>
                        )}
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
                            onClick={() => setShowUserDetail(user)}
                            className="text-[#1C4DA1] hover:text-blue-700 transition-colors"
                            title="Detayları Görüntüle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => startEditing(user)}
                            className="text-[#1C4DA1] hover:text-blue-700 transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Sil"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Gösterilen: {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, users.length)} / {users.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`px-3 py-1 border rounded text-sm ${
                          currentPage === page
                            ? 'bg-[#1C4DA1] text-white border-[#1C4DA1]'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </div>
          )}

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Kullanıcı bulunamadı.</p>
              <p className="text-sm text-gray-400">Arama kriterlerinizi değiştirmeyi deneyin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Kullanıcı Oluştur</h3>
            <form onSubmit={createUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta Adresi *
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
                    Şifre *
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
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    placeholder="+90 555 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant *
                  </label>
                  <select
                    value={createForm.tenant_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tenant_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    required
                  >
                    <option value="">Tenant Seçin...</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.plan})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departman
                  </label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    placeholder="İK, Teknoloji, Satış vb."
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="send_invite"
                  checked={createForm.send_invite}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, send_invite: e.target.checked }))}
                  className="rounded border-gray-300 text-[#1C4DA1] focus:ring-[#1C4DA1]"
                />
                <label htmlFor="send_invite" className="ml-2 text-sm text-gray-700">
                  Kullanıcıya davet e-postası gönder
                </label>
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

      {/* Bulk Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Toplu Kullanıcı Daveti</h3>
            <form onSubmit={sendInvites} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresleri (Her satıra bir e-posta)
                </label>
                <textarea
                  value={inviteForm.emails}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, emails: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  rows={6}
                  placeholder="user1@company.com&#10;user2@company.com&#10;user3@company.com"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varsayılan Rol
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
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
                    Tenant
                  </label>
                  <select
                    value={inviteForm.tenant_id}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, tenant_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    required
                  >
                    <option value="">Tenant Seçin...</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departman
                  </label>
                  <input
                    type="text"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    placeholder="Departman"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Davet Mesajı (İsteğe Bağlı)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  rows={3}
                  placeholder="Özel davet mesajınız..."
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Davet Gönder
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Toplu İşlem ({selectedUsers.length} kullanıcı)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İşlem Seçin
                </label>
                <select
                  value={bulkActionData.action}
                  onChange={(e) => setBulkActionData(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                >
                  <option value="">İşlem seçin...</option>
                  <option value="change_role">Rol Değiştir</option>
                  <option value="change_tenant">Tenant Değiştir</option>
                  <option value="export">Dışa Aktar</option>
                  <option value="delete">Sil</option>
                </select>
              </div>

              {bulkActionData.action === 'change_role' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Rol
                  </label>
                  <select
                    value={bulkActionData.role}
                    onChange={(e) => setBulkActionData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    <option value="">Rol seçin...</option>
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bulkActionData.action === 'change_tenant' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Tenant
                  </label>
                  <select
                    value={bulkActionData.tenant_id}
                    onChange={(e) => setBulkActionData(prev => ({ ...prev, tenant_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    <option value="">Tenant seçin...</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkActions(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkActionData.action}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  İşlemi Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Kullanıcı Detayları</h3>
              <button
                onClick={() => setShowUserDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-[#1C4DA1] flex items-center justify-center">
                  <span className="text-xl font-medium text-white">
                    {(showUserDetail.full_name || showUserDetail.email)[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {showUserDetail.full_name || 'İsim belirtilmemiş'}
                  </h4>
                  <p className="text-gray-600">{showUserDetail.email}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleInfo(showUserDetail.role).color}`}>
                    {getRoleInfo(showUserDetail.role).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">İletişim Bilgileri</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={16} className="text-gray-400" />
                      <span>{showUserDetail.email}</span>
                    </div>
                    {showUserDetail.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={16} className="text-gray-400" />
                        <span>{showUserDetail.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Organizasyon</h5>
                  <div className="space-y-2">
                    {showUserDetail.tenant_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building size={16} className="text-gray-400" />
                        <span>{showUserDetail.tenant_name}</span>
                      </div>
                    )}
                    {showUserDetail.department && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase size={16} className="text-gray-400" />
                        <span>{showUserDetail.department}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Hesap Durumu</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusInfo(showUserDetail)?.color}`}>
                        {getStatusInfo(showUserDetail)?.label}
                      </span>
                    </div>
                    {showUserDetail.email_confirmed_at ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle size={16} />
                        <span>E-posta doğrulandı</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertCircle size={16} />
                        <span>E-posta doğrulanmamış</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Aktivite</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-gray-400" />
                      <span>Kayıt: {new Date(showUserDetail.user_created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    {showUserDetail.last_sign_in_at ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Activity size={16} className="text-gray-400" />
                        <span>Son giriş: {new Date(showUserDetail.last_sign_in_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Activity size={16} className="text-gray-400" />
                        <span>Hiç giriş yapmamış</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h5 className="font-medium text-gray-900 mb-3">Rol Açıklaması</h5>
                <p className="text-sm text-gray-600">
                  {getRoleInfo(showUserDetail.role).description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kullanıcı İçe Aktarma</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV Dosyası
                </label>
                <input
                  type="file"
                  accept=".csv"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
                <p className="text-sm text-blue-800 mb-2">
                  CSV dosyanız şu sütunları içermelidir:
                </p>
                <code className="text-xs bg-white p-2 rounded block">
                  email,full_name,role,department,tenant_id
                </code>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  İçe Aktar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;