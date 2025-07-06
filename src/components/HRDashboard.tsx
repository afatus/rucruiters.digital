import React, { useState, useEffect } from 'react';
import { Plus, Users, FileText, BarChart3, Eye, LogOut, Settings, UserCog, Briefcase, TrendingUp, Calendar, Bell, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Job, Interview, Profile } from '../types';
import CreateJobForm from './CreateJobForm';
import JobDetail from './JobDetail';
import InterviewResults from './InterviewResults';
import SupabaseDebug from './SupabaseDebug';
import UserManagement from './UserManagement';
import ATSDashboard from './ATS/ATSDashboard';
import CandidateManagement from './ATS/CandidateManagement';
import TenantManagement from './TenantManagement';

const HRDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [jwtRole, setJwtRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'candidates' | 'interviews' | 'users' | 'tenants' | 'system'>('dashboard');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      // Extract JWT role from user metadata
      const role = user.user_metadata?.role || null;
      setJwtRole(role);
      await fetchUserProfile(user.id);
      setShowAuth(false);
      fetchJobs();
      fetchInterviews();
    } else {
      setShowAuth(true);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profile) {
      setUserProfile(profile);
    } else if (error) {
      console.error('Error fetching user profile:', error);
      
      // Check if the error is due to an invalid/expired session
      if (error.message && error.message.includes('Session from session_id claim in JWT does not exist')) {
        console.log('Session expired, signing out user');
        await handleSignOut();
        return;
      }
      
      // Create a default profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            full_name: user?.email || 'User',
            role: 'recruiter'
          }
        ])
        .select()
        .single();
      
      if (newProfile) {
        setUserProfile(newProfile);
      } else {
        console.error('Error creating user profile:', createError);
        
        // Check if the profile creation error is also due to session issues
        if (createError?.message && createError.message.includes('Session from session_id claim in JWT does not exist')) {
          console.log('Session expired during profile creation, signing out user');
          await handleSignOut();
          return;
        }
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser(data.user);
          const role = data.user.user_metadata?.role || null;
          setJwtRole(role);
          await fetchUserProfile(data.user.id);
          setShowAuth(false);
          fetchJobs();
          fetchInterviews();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser(data.user);
          const role = data.user.user_metadata?.role || null;
          setJwtRole(role);
          await fetchUserProfile(data.user.id);
          setShowAuth(false);
          fetchJobs();
          fetchInterviews();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setJwtRole(null);
    setUserProfile(null);
    setShowAuth(true);
    setJobs([]);
    setInterviews([]);
  };

  const fetchJobs = async () => {
    if (!userProfile) return;
    
    let query = supabase
      .from('jobs')
      .select(`
        *,
        hiring_manager:profiles!jobs_hiring_manager_id_fkey(full_name),
        line_manager:profiles!jobs_line_manager_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    // Filter jobs based on user role
    if (userProfile.role === 'hiring_manager') {
      query = query.eq('hiring_manager_id', userProfile.id);
    } else if (userProfile.role === 'line_manager') {
      query = query.eq('line_manager_id', userProfile.id);
    } else {
      // For other roles (recruiter, hr_operations), filter by tenant
      // Only super_admin and it_admin can see all tenants
      if (jwtRole !== 'super_admin' && jwtRole !== 'it_admin') {
        query = query.eq('tenant_id', userProfile.tenant_id);
      }
    }

    const { data, error } = await query;
    
    if (data) setJobs(data);
    if (error) console.error('Error fetching jobs:', error);
  };

  const fetchInterviews = async () => {
    if (!userProfile) return;
    
    console.log('Fetching interviews for user:', {
      userId: user?.id,
      userRole: userProfile.role,
      jwtRole: jwtRole,
      tenantId: userProfile.tenant_id
    });
    
    let query = supabase
      .from('interviews')
      .select(`
        *, 
        jobs(
          title,
          hiring_manager_id,
          line_manager_id,
          created_by
        )
      `)
      .order('created_at', { ascending: false });

    // it_admin ve super_admin tüm mülakatları görebilir
    // Diğer roller için RLS politikaları otomatik olarak filtreleme yapacak
    console.log('JWT Role:', jwtRole, 'User Role:', userProfile.role);

    const { data, error } = await query;
    
    console.log('Interviews query result:', { data: data?.length, error });
    
    if (data) setInterviews(data);
    if (error) console.error('Error fetching interviews:', error);
  };

  const handleJobCreated = () => {
    setShowCreateForm(false);
    fetchJobs();
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">AI Recruiter</h1>
            <p className="text-gray-600 mt-2">AI destekli mülakatları yönetin</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1C4DA1] focus:border-[#1C4DA1]"
                placeholder="E-posta adresinizi girin"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Şifre
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1C4DA1] focus:border-[#1C4DA1]"
                placeholder="Şifrenizi girin"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1C4DA1] text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#1C4DA1] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Yükleniyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#1C4DA1] hover:text-blue-700 text-sm"
              >
                {isSignUp ? 'Zaten hesabınız var mı? Giriş yapın' : "Hesabınız yok mu? Kayıt olun"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"
            >
              <Settings size={16} />
              Sistem Durumunu Kontrol Et
            </button>
            
            {showDebug && (
              <div className="mt-4">
                <SupabaseDebug />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedInterview) {
    return (
      <InterviewResults
        interview={selectedInterview}
        onBack={() => setSelectedInterview(null)}
      />
    );
  }

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        onBack={() => setSelectedJob(null)}
        onInterviewsUpdate={fetchInterviews}
      />
    );
  }

  if (activeTab === 'users' && userProfile?.role === 'it_admin') {
    return (
      <UserManagement
        onBack={() => setActiveTab('jobs')}
      />
    );
  }

  if (activeTab === 'tenants' && (jwtRole === 'super_admin' || jwtRole === 'it_admin')) {
    return (
      <TenantManagement
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  if (showCreateForm) {
    return (
      <CreateJobForm
        onCancel={() => setShowCreateForm(false)}
        onJobCreated={handleJobCreated}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Recruiter</h1>
              <p className="text-gray-600">AI destekli mülakatları yönetin</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {userProfile?.full_name || user?.email}
                {userProfile?.role && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {userProfile.role.replace('_', ' ').toUpperCase()}
                  </span>
                )}
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Menu */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Menü</h2>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === 'dashboard'
                      ? 'bg-[#1C4DA1] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 size={20} />
                  ATS Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === 'jobs'
                      ? 'bg-[#1C4DA1] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText size={20} />
                  Son İş İlanları
                </button>
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === 'candidates'
                      ? 'bg-[#1C4DA1] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users size={20} />
                  Aday Yönetimi
                </button>
                <button
                  onClick={() => setActiveTab('interviews')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === 'interviews'
                      ? 'bg-[#1C4DA1] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calendar size={20} />
                  Son Mülakatlar
                </button>
                {userProfile?.role === 'it_admin' && (
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      activeTab === 'users'
                        ? 'bg-[#1C4DA1] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <UserCog size={20} />
                    Kullanıcılar
                  </button>
                )}
                {(jwtRole === 'super_admin' || jwtRole === 'it_admin') && (
                  <button
                    onClick={() => setActiveTab('tenants')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      activeTab === 'tenants'
                        ? 'bg-[#1C4DA1] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Crown size={20} />
                    Tenant Yönetimi
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('system')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === 'system'
                      ? 'bg-[#1C4DA1] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings size={20} />
                  Sistem Durumu
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <FileText className="text-[#1C4DA1]" size={24} />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Toplam İş İlanı</p>
                    <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="text-[#6CBE45]" size={24} />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Toplam Mülakat</p>
                    <p className="text-2xl font-bold text-gray-900">{interviews.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <BarChart3 className="text-[#1C4DA1]" size={24} />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Tamamlanan</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {interviews.filter(i => i.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'dashboard' && (
              <ATSDashboard userProfile={userProfile} />
            )}

            {activeTab === 'candidates' && (
              <CandidateManagement userProfile={userProfile} />
            )}

            {activeTab === 'jobs' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Son İş İlanları</h2>
                  {userProfile?.role && ['recruiter', 'hr_operations', 'it_admin'].includes(userProfile.role) && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-[#1C4DA1] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus size={20} />
                      İş İlanı Oluştur
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-[#1C4DA1]"
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600">{job.company}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(job.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <Eye className="text-gray-400" size={16} />
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Henüz iş ilanı bulunmuyor.</p>
                      {userProfile?.role && ['recruiter', 'hr_operations', 'it_admin'].includes(userProfile.role) ? (
                        <p className="text-sm">İlk iş ilanınızı oluşturmak için yukarıdaki butonu kullanın.</p>
                      ) : (
                        <p className="text-sm">İş ilanları görüntülemek için yetkiniz bulunmuyor.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'interviews' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Son Mülakatlar</h2>
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-[#1C4DA1]"
                      onClick={() => setSelectedInterview(interview)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{interview.candidate_name}</h3>
                          <p className="text-sm text-gray-600">{interview.candidate_email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              interview.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : interview.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {interview.status === 'completed' 
                                ? 'Tamamlandı' 
                                : interview.status === 'in_progress'
                                ? 'Devam Ediyor'
                                : 'Beklemede'
                              }
                            </span>
                            {interview.status === 'completed' && (
                              <span className="text-sm text-gray-600">
                                Puan: {interview.overall_score}/10
                              </span>
                            )}
                          </div>
                        </div>
                        <Eye className="text-gray-400" size={16} />
                      </div>
                    </div>
                  ))}
                  {interviews.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Henüz mülakat bulunmuyor.</p>
                      <p className="text-sm">İş ilanlarınıza aday davet ederek mülakatları başlatabilirsiniz.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'users' && userProfile?.role === 'it_admin' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Kullanıcı Yönetimi</h2>
                <div className="text-center py-8">
                  <UserCog size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Kullanıcı yönetimi sayfası yükleniyor...</p>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <SupabaseDebug />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;