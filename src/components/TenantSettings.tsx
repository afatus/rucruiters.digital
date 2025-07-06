import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, Palette, Mail, Key, Settings as SettingsIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tenant } from '../types';
import type { TenantSettings as TenantSettingsType } from '../types';

interface TenantSettingsProps {
  tenant: Tenant;
  onBack: () => void;
}

const TenantSettings: React.FC<TenantSettingsProps> = ({ tenant, onBack }) => {
  const [settings, setSettings] = useState<TenantSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'email' | 'api' | 'features'>('branding');
  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '#1C4DA1',
    secondary_color: '#6CBE45',
    custom_domain: '',
    openai_api_key: '',
    email_settings: {
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      from_email: '',
      from_name: ''
    },
    branding_settings: {
      company_name: '',
      tagline: '',
      footer_text: '',
      show_powered_by: true
    },
    feature_flags: {
      ai_analysis: true,
      video_interviews: true,
      candidate_portal: true,
      advanced_analytics: false,
      custom_branding: true
    }
  });

  useEffect(() => {
    fetchTenantSettings();
  }, [tenant.id]);

  const fetchTenantSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
        setFormData({
          logo_url: data.logo_url || '',
          primary_color: data.primary_color || '#1C4DA1',
          secondary_color: data.secondary_color || '#6CBE45',
          custom_domain: data.custom_domain || '',
          openai_api_key: data.openai_api_key || '',
          email_settings: data.email_settings || formData.email_settings,
          branding_settings: data.branding_settings || formData.branding_settings,
          feature_flags: data.feature_flags || formData.feature_flags
        });
      }
    } catch (error) {
      console.error('Error fetching tenant settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = {
        tenant_id: tenant.id,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        custom_domain: formData.custom_domain || null,
        openai_api_key: formData.openai_api_key || null,
        email_settings: formData.email_settings,
        branding_settings: formData.branding_settings,
        feature_flags: formData.feature_flags,
        updated_at: new Date().toISOString()
      };

      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('tenant_settings')
          .update(settingsData)
          .eq('tenant_id', tenant.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('tenant_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      await fetchTenantSettings();
      alert('Ayarlar başarıyla kaydedildi!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Ayarlar kaydedilirken hata: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'email', label: 'E-posta', icon: Mail },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'features', label: 'Özellikler', icon: SettingsIcon }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1C4DA1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Ayarlar yükleniyor...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name} - Ayarlar</h1>
              <p className="text-gray-600">Organizasyon ayarlarını yönetin</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6CBE45] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-[#1C4DA1] text-[#1C4DA1]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Marka Ayarları</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo URL
                      </label>
                      <input
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Özel Domain
                      </label>
                      <input
                        type="text"
                        value={formData.custom_domain}
                        onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="company.recruiters.digital"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ana Renk
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.primary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İkincil Renk
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şirket Adı
                    </label>
                    <input
                      type="text"
                      value={formData.branding_settings.company_name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        branding_settings: { ...prev.branding_settings, company_name: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                      placeholder="Şirket adınız"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slogan
                    </label>
                    <input
                      type="text"
                      value={formData.branding_settings.tagline}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        branding_settings: { ...prev.branding_settings, tagline: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                      placeholder="Şirket sloganınız"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Tab */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">E-posta Ayarları</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={formData.email_settings.smtp_host}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          email_settings: { ...prev.email_settings, smtp_host: e.target.value }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="smtp.gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={formData.email_settings.smtp_port}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          email_settings: { ...prev.email_settings, smtp_port: parseInt(e.target.value) }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="587"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        value={formData.email_settings.smtp_username}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          email_settings: { ...prev.email_settings, smtp_username: e.target.value }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="your-email@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şifre
                      </label>
                      <input
                        type="password"
                        value={formData.email_settings.smtp_password}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          email_settings: { ...prev.email_settings, smtp_password: e.target.value }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gönderen E-posta
                      </label>
                      <input
                        type="email"
                        value={formData.email_settings.from_email}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          email_settings: { ...prev.email_settings, from_email: e.target.value }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="noreply@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gönderen Adı
                      </label>
                      <input
                        type="text"
                        value={formData.email_settings.from_name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          email_settings: { ...prev.email_settings, from_name: e.target.value }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                        placeholder="Company HR"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Anahtarları</h3>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="text-blue-600 mr-2" size={20} />
                      <span className="text-sm font-medium text-blue-900">OpenAI API Hakkında</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      OpenAI API anahtarı, AI destekli soru üretimi ve mülakat analizi için gereklidir. 
                      Bu anahtar güvenli bir şekilde saklanır ve sadece AI işlemleri için kullanılır.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={formData.openai_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, openai_api_key: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent font-mono"
                      placeholder="sk-..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      OpenAI API anahtarınızı buraya girin. Bu anahtar şifrelenmiş olarak saklanır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Özellik Ayarları</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(formData.feature_flags).map(([key, value]) => {
                      const featureLabels: Record<string, string> = {
                        ai_analysis: 'AI Analizi',
                        video_interviews: 'Video Mülakatlar',
                        candidate_portal: 'Aday Portalı',
                        advanced_analytics: 'Gelişmiş Analitik',
                        custom_branding: 'Özel Marka'
                      };

                      const featureDescriptions: Record<string, string> = {
                        ai_analysis: 'Mülakat videolarının AI ile analiz edilmesi',
                        video_interviews: 'Video mülakat özelliği',
                        candidate_portal: 'Adaylar için özel portal',
                        advanced_analytics: 'Detaylı raporlar ve analitik',
                        custom_branding: 'Özel logo ve renk teması'
                      };

                      return (
                        <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{featureLabels[key]}</h4>
                            <p className="text-sm text-gray-600">{featureDescriptions[key]}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                feature_flags: { ...prev.feature_flags, [key]: e.target.checked }
                              }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1C4DA1]"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSettings;