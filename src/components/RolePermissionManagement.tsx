import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit3, Save, X, Trash2, Shield, Settings, Users, AlertCircle, CheckCircle, Crown, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Role, Module, Permission, RolePermission, Profile } from '../types';

interface RolePermissionManagementProps {
  onBack: () => void;
  userProfile: Profile | null;
}

interface PermissionMatrix {
  [roleId: string]: {
    [moduleId: string]: {
      [permissionId: string]: boolean;
    };
  };
}

const RolePermissionManagement: React.FC<RolePermissionManagementProps> = ({ onBack, userProfile }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    description: '',
    inherit_order: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRoles(),
        fetchModules(),
        fetchPermissions(),
        fetchRolePermissions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('inherit_order');
    
    if (data) setRoles(data);
    if (error) console.error('Error fetching roles:', error);
  };

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('name');
    
    if (data) setModules(data);
    if (error) console.error('Error fetching modules:', error);
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('action');
    
    if (data) setPermissions(data);
    if (error) console.error('Error fetching permissions:', error);
  };

  const fetchRolePermissions = async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*');
    
    if (data) {
      const matrix: PermissionMatrix = {};
      data.forEach((rp: RolePermission) => {
        if (!matrix[rp.role_id]) matrix[rp.role_id] = {};
        if (!matrix[rp.role_id][rp.module_id]) matrix[rp.role_id][rp.module_id] = {};
        matrix[rp.role_id][rp.module_id][rp.permission_id] = true;
      });
      setPermissionMatrix(matrix);
    }
    if (error) console.error('Error fetching role permissions:', error);
  };

  const hasPermission = (roleId: string, moduleId: string, permissionId: string): boolean => {
    return permissionMatrix[roleId]?.[moduleId]?.[permissionId] || false;
  };

  const togglePermission = async (roleId: string, moduleId: string, permissionId: string) => {
    const currentValue = hasPermission(roleId, moduleId, permissionId);
    
    try {
      if (currentValue) {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('module_id', moduleId)
          .eq('permission_id', permissionId);
        
        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('role_permissions')
          .insert([{
            role_id: roleId,
            module_id: moduleId,
            permission_id: permissionId
          }]);
        
        if (error) throw error;
      }

      // Update local state
      setPermissionMatrix(prev => {
        const newMatrix = { ...prev };
        if (!newMatrix[roleId]) newMatrix[roleId] = {};
        if (!newMatrix[roleId][moduleId]) newMatrix[roleId][moduleId] = {};
        newMatrix[roleId][moduleId][permissionId] = !currentValue;
        return newMatrix;
      });

    } catch (error) {
      console.error('Error toggling permission:', error);
      alert('Yetki değiştirilirken hata oluştu.');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          name: newRoleData.name,
          description: newRoleData.description,
          inherit_order: newRoleData.inherit_order,
          is_system_role: false,
          tenant_id: userProfile?.tenant_id
        }])
        .select()
        .single();

      if (error) throw error;

      setRoles(prev => [...prev, data]);
      setShowCreateRole(false);
      setNewRoleData({ name: '', description: '', inherit_order: 0 });
    } catch (error: any) {
      console.error('Error creating role:', error);
      alert(`Rol oluşturulurken hata: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (role: Role, updates: Partial<Role>) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', role.id);

      if (error) throw error;

      setRoles(prev => prev.map(r => r.id === role.id ? { ...r, ...updates } : r));
      setEditingRole(null);
    } catch (error: any) {
      console.error('Error updating role:', error);
      alert(`Rol güncellenirken hata: ${error.message}`);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`"${role.name}" rolünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', role.id);

      if (error) throw error;

      setRoles(prev => prev.filter(r => r.id !== role.id));
      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
      }
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(`Rol silinirken hata: ${error.message}`);
    }
  };

  const getRoleTypeColor = (role: Role) => {
    if (role.is_system_role) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getPermissionColor = (action: string) => {
    switch (action) {
      case 'view': return 'text-blue-600';
      case 'edit': return 'text-orange-600';
      case 'execute': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1C4DA1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Rol ve yetki verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

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
                <Shield className="text-[#1C4DA1]" size={24} />
                Rol ve Yetki Yönetimi
              </h1>
              <p className="text-gray-600">Sistem rollerini ve yetkilerini yönetin</p>
            </div>
            <button
              onClick={() => setShowCreateRole(true)}
              className="bg-[#6CBE45] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Yeni Rol
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} />
                Roller ({roles.length})
              </h2>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedRole?.id === role.id
                        ? 'border-[#1C4DA1] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{role.name}</h3>
                      <div className="flex gap-1">
                        {!role.is_system_role && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRole(role);
                              }}
                              className="text-gray-500 hover:text-[#1C4DA1] transition-colors"
                              title="Düzenle"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(role);
                              }}
                              className="text-gray-500 hover:text-red-600 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleTypeColor(role)}`}>
                        {role.is_system_role ? 'Sistem Rolü' : 'Özel Rol'}
                      </span>
                      <p className="text-xs text-gray-600">Sıra: {role.inherit_order}</p>
                      {role.description && (
                        <p className="text-xs text-gray-500">{role.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Permission Matrix */}
          <div className="lg:col-span-3">
            {selectedRole ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Lock size={20} />
                      {selectedRole.name} - Yetki Matrisi
                    </h2>
                    <p className="text-sm text-gray-600">{selectedRole.description}</p>
                  </div>
                  {selectedRole.is_system_role && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Crown size={16} />
                      <span className="text-sm font-medium">Sistem Rolü</span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Modül</th>
                        {permissions.map((permission) => (
                          <th key={permission.id} className="text-center py-3 px-4 font-medium text-gray-900">
                            <div className="flex flex-col items-center">
                              <span className={`text-sm ${getPermissionColor(permission.action)}`}>
                                {permission.action}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {permission.action === 'view' ? 'Görüntüle' : 
                                 permission.action === 'edit' ? 'Düzenle' : 
                                 permission.action === 'execute' ? 'Çalıştır' : permission.action}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((module) => (
                        <tr key={module.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{module.name}</div>
                              {module.description && (
                                <div className="text-sm text-gray-500">{module.description}</div>
                              )}
                            </div>
                          </td>
                          {permissions.map((permission) => (
                            <td key={permission.id} className="py-3 px-4 text-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasPermission(selectedRole.id, module.id, permission.id)}
                                  onChange={() => togglePermission(selectedRole.id, module.id, permission.id)}
                                  disabled={selectedRole.is_system_role}
                                  className="w-5 h-5 text-[#1C4DA1] border-gray-300 rounded focus:ring-[#1C4DA1] focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedRole.is_system_role && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="text-blue-600 mr-2" size={20} />
                      <span className="text-sm font-medium text-blue-900">Sistem Rolü Uyarısı</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      Bu bir sistem rolüdür ve yetkileri değiştirilemez. Sistem rolleri, uygulamanın temel işlevselliği için gerekli olan önceden tanımlanmış yetkilerle gelir.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Shield size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Rol Seçin</h3>
                <p className="text-gray-600">
                  Yetki matrisini görüntülemek için sol taraftan bir rol seçin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yetki Açıklamaları</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <div>
                <span className="font-medium text-blue-600">View (Görüntüle)</span>
                <p className="text-sm text-gray-600">Veriyi okuma ve görüntüleme yetkisi</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-orange-600 rounded"></div>
              <div>
                <span className="font-medium text-orange-600">Edit (Düzenle)</span>
                <p className="text-sm text-gray-600">Veriyi değiştirme ve güncelleme yetkisi</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <div>
                <span className="font-medium text-red-600">Execute (Çalıştır)</span>
                <p className="text-sm text-gray-600">İşlem yapma ve fonksiyon çalıştırma yetkisi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Rol Oluştur</h3>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol Adı
                </label>
                <input
                  type="text"
                  value={newRoleData.name}
                  onChange={(e) => setNewRoleData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="Örn: Proje Yöneticisi"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  rows={3}
                  placeholder="Rolün açıklaması..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öncelik Sırası
                </label>
                <input
                  type="number"
                  value={newRoleData.inherit_order}
                  onChange={(e) => setNewRoleData(prev => ({ ...prev, inherit_order: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  min="0"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateRole(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#6CBE45] text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Oluştur
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rol Düzenle</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleUpdateRole(editingRole, {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                inherit_order: parseInt(formData.get('inherit_order') as string)
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol Adı
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingRole.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  name="description"
                  defaultValue={editingRole.description}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öncelik Sırası
                </label>
                <input
                  type="number"
                  name="inherit_order"
                  defaultValue={editingRole.inherit_order}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  min="0"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1C4DA1] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissionManagement;