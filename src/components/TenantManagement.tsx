import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit3, Save, X, Trash2, Building, Users, Settings, Globe, Crown, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tenant, TenantSettings } from '../types';
import TenantSettings from './TenantSettings';

interface TenantManagementProps {
  onBack: () => void;
}

interface TenantWithSettings extends Tenant {
  settings?: TenantSettings;
  userCount?: number;
  jobCount?: number;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ onBack }) => {
  const [tenants, setTenants] = useState<TenantWithSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    status: 'active' as const,
    plan: 'basic' as const,
    max_users: 10,
    max_jobs: 50
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedTenantForSettings, setSelectedTenantForSettings] = useState<TenantWithSettings | null>(null);

  const plans = [
    { value: 'basic', label: 'Basic', color: 'bg-gray-100 text-gray-800', maxUsers: 10, maxJobs: 50 },
    { value: 'professional', label: 'Professional', color: 'bg-blue-100 text-blue-800', maxUsers: 50, maxJobs: 200 },
    { value: 'enterprise', label: 'Enterprise', color: 'bg-purple-100 text-purple-800', maxUsers: 200, maxJobs: 1000 }
  ];

  const statuses = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'trial', label: 'Trial', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      // Fetch tenants with their settings
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_settings(*)
        `)
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch user counts for each tenant
      const tenantsWithCounts = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const [userCountResult, jobCountResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenant.id),
            supabase
              .from('jobs')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenant.id)
          ]);

          return {
            ...tenant,
            settings: tenant.tenant_settings?.[0] || null,
            userCount: userCountResult.count || 0,
            jobCount: jobCountResult.count || 0
          };
        })
      );

      setTenants(tenantsWithCounts);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([formData])
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create default tenant settings
      const { error: settingsError } = await supabase
        .from('tenant_settings')
        .insert([{
          tenant_id: tenant.id,
          primary_color: '#1C4DA1',
          secondary_color: '#6CBE45',
          email_settings: {},
          branding_settings: {},
          feature_flags: {}
        }]);

      if (settingsError) throw settingsError;

      // Reset form and refresh list
      setFormData({
        name: '',
        slug: '',
        domain: '',
        status: 'active',
        plan: 'basic',
        max_users: 10,
        max_jobs: 50
      });
      setShowCreateForm(false);
      await fetchTenants();
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      alert(`Error creating tenant: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain || null,
          status: formData.status,
          plan: formData.plan,
          max_users: formData.max_users,
          max_jobs: formData.max_jobs,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTenant.id);

      if (error) throw error;

      setEditingTenant(null);
      await fetchTenants();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      alert(`Error updating tenant: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTenant = async (tenant: TenantWithSettings) => {
    if (!confirm(`Are you sure you want to delete "${tenant.name}"? This will permanently delete all associated data including users, jobs, and interviews. This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id);

      if (error) throw error;

      await fetchTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      alert(`Error deleting tenant: ${error.message}`);
    }
  };

  const startEditing = (tenant: TenantWithSettings) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      status: tenant.status,
      plan: tenant.plan,
      max_users: tenant.max_users,
      max_jobs: tenant.max_jobs
    });
  };

  const cancelEditing = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      slug: '',
      domain: '',
      status: 'active',
      plan: 'basic',
      max_users: 10,
      max_jobs: 50
    });
  };

  const getPlanInfo = (plan: string) => {
    return plans.find(p => p.value === plan) || plans[0];
  };

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  if (selectedTenantForSettings) {
    return (
      <TenantSettings
        tenant={selectedTenantForSettings}
        onBack={() => setSelectedTenantForSettings(null)}
      />
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
                <Crown className="text-yellow-500" size={24} />
                Tenant Management
              </h1>
              <p className="text-gray-600">Manage organizations and their configurations</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#6CBE45] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              New Tenant
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Building className="text-[#1C4DA1]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="text-[#6CBE45]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenants.filter(t => t.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="text-purple-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenants.reduce((sum, t) => sum + (t.userCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertCircle className="text-orange-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Trial Tenants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenants.filter(t => t.status === 'trial').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Organizations</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4DA1] mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading tenants...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan & Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-[#1C4DA1] flex items-center justify-center">
                              <Building className="text-white" size={20} />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">
                              <span className="font-mono">{tenant.slug}</span>
                              {tenant.domain && (
                                <span className="ml-2 flex items-center gap-1">
                                  <Globe size={12} />
                                  {tenant.domain}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPlanInfo(tenant.plan).color}`}>
                            {getPlanInfo(tenant.plan).label}
                          </span>
                          <br />
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusInfo(tenant.status).color}`}>
                            {getStatusInfo(tenant.status).label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Users: {tenant.userCount}/{tenant.max_users}</div>
                          <div>Jobs: {tenant.jobCount}/{tenant.max_jobs}</div>
                        </div>
                        <div className="mt-1">
                          <div className="w-24 bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-[#1C4DA1] h-1 rounded-full" 
                              style={{ width: `${Math.min(((tenant.userCount || 0) / tenant.max_users) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={14} />
                          {new Date(tenant.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditing(tenant)}
                            className="text-[#1C4DA1] hover:text-blue-700 transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setSelectedTenantForSettings(tenant)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            title="Settings"
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(tenant)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tenants.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No tenants found.</p>
              <p className="text-sm text-gray-400">Create your first tenant to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Tenant Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Tenant</h3>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL identifier)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent font-mono"
                  placeholder="acme"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Domain (Optional)
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="acme.recruiters.digital"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => {
                      const plan = plans.find(p => p.value === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        plan: e.target.value as any,
                        max_users: plan?.maxUsers || 10,
                        max_jobs: plan?.maxJobs || 50
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    {plans.map(plan => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Jobs
                  </label>
                  <input
                    type="number"
                    value={formData.max_jobs}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_jobs: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#6CBE45] text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Tenant'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Tenant</h3>
            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent font-mono"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    {plans.map(plan => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Jobs
                  </label>
                  <input
                    type="number"
                    value={formData.max_jobs}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_jobs: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-[#1C4DA1] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Update
                    </>
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

export default TenantManagement;