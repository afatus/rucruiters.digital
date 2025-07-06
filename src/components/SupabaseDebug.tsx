import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2, Database, Cloud, Key, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DebugResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

interface DebugResults {
  supabaseConnection?: DebugResult;
  authentication?: DebugResult;
  databaseAccess?: DebugResult;
  edgeFunctions?: DebugResult;
  openaiApi?: DebugResult;
}

const SupabaseDebug: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DebugResults>({});

  const testSupabaseConnection = async (): Promise<DebugResult> => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('jobs')
        .select('count')
        .limit(1);

      if (error) {
        return {
          status: 'error',
          message: 'Supabase bağlantısı başarısız',
          details: error.message
        };
      }

      return {
        status: 'success',
        message: 'Supabase bağlantısı başarılı',
        details: 'Veritabanına erişim sağlandı'
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Supabase bağlantı hatası',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
    }
  };

  const testAuthentication = async (): Promise<DebugResult> => {
    try {
      console.log('Testing authentication...');
      
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        return {
          status: 'warning',
          message: 'Kimlik doğrulama sorunu',
          details: error.message
        };
      }

      if (user) {
        return {
          status: 'success',
          message: 'Kullanıcı oturum açmış',
          details: `User ID: ${user.id}`
        };
      } else {
        return {
          status: 'warning',
          message: 'Kullanıcı oturum açmamış',
          details: 'Bu normal olabilir'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Kimlik doğrulama testi başarısız',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
    }
  };

  const testDatabaseAccess = async (): Promise<DebugResult> => {
    try {
      console.log('Testing database access...');
      
      // Test reading from jobs table
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title')
        .limit(5);

      if (jobsError) {
        return {
          status: 'error',
          message: 'Veritabanı erişim hatası',
          details: jobsError.message
        };
      }

      // Test reading from interview_questions table
      const { data: questions, error: questionsError } = await supabase
        .from('interview_questions')
        .select('id, question')
        .limit(5);

      if (questionsError) {
        return {
          status: 'error',
          message: 'Soru tablosu erişim hatası',
          details: questionsError.message
        };
      }

      return {
        status: 'success',
        message: 'Veritabanı erişimi başarılı',
        details: `${jobs?.length || 0} iş ilanı, ${questions?.length || 0} soru bulundu`
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Veritabanı test hatası',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
    }
  };

  const testEdgeFunctions = async (): Promise<DebugResult> => {
    try {
      console.log('Testing Edge Functions...');
      
      // Test generate-questions function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            jobTitle: 'Test Developer',
            jobDescription: 'Test job description for debugging purposes'
          })
        }
      );

      if (!response.ok) {
        return {
          status: 'error',
          message: 'Edge Function erişim hatası',
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        return {
          status: 'warning',
          message: 'Edge Function çalışıyor ama geçersiz yanıt',
          details: 'Sorular üretilemiyor'
        };
      }

      return {
        status: 'success',
        message: 'Edge Functions çalışıyor',
        details: `${data.questions.length} soru üretildi (${data.source || 'unknown'} kaynağından)`
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Edge Function test hatası',
        details: error instanceof Error ? error.message : 'Network hatası'
      };
    }
  };

  const testOpenAIAPI = async (): Promise<DebugResult> => {
    try {
      console.log('Testing OpenAI API...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-openai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ test: true })
        }
      );

      if (!response.ok) {
        return {
          status: 'error',
          message: 'OpenAI test fonksiyonuna erişilemiyor',
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          status: 'success',
          message: 'OpenAI API çalışıyor',
          details: data.details
        };
      } else {
        return {
          status: 'warning',
          message: 'OpenAI API çalışmıyor',
          details: data.error || 'API key problemi olabilir'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'OpenAI API test hatası',
        details: error instanceof Error ? error.message : 'Network hatası'
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults({});

    try {
      // Test Supabase connection
      const supabaseResult = await testSupabaseConnection();
      setResults(prev => ({ ...prev, supabaseConnection: supabaseResult }));

      // Test authentication
      const authResult = await testAuthentication();
      setResults(prev => ({ ...prev, authentication: authResult }));

      // Test database access
      const dbResult = await testDatabaseAccess();
      setResults(prev => ({ ...prev, databaseAccess: dbResult }));

      // Test Edge Functions
      const edgeResult = await testEdgeFunctions();
      setResults(prev => ({ ...prev, edgeFunctions: edgeResult }));

      // Test OpenAI API
      const openaiResult = await testOpenAIAPI();
      setResults(prev => ({ ...prev, openaiApi: openaiResult }));

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status?: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <XCircle className="text-red-600" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status?: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (status?: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Sistem Durumu</h2>
        <button
          onClick={runAllTests}
          disabled={testing}
          className="bg-[#1C4DA1] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {testing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Test Ediliyor...
            </>
          ) : (
            'Tüm Testleri Çalıştır'
          )}
        </button>
      </div>

      <div className="space-y-4">
        {/* Supabase Connection */}
        <div className={`p-4 rounded-lg border ${getStatusColor(results.supabaseConnection?.status)}`}>
          <div className="flex items-center mb-2">
            <Database className="text-gray-600 mr-2" size={20} />
            {getStatusIcon(results.supabaseConnection?.status)}
            <span className={`ml-2 font-medium ${getTextColor(results.supabaseConnection?.status)}`}>
              Supabase Bağlantısı
            </span>
          </div>
          {results.supabaseConnection && (
            <div>
              <p className={`text-sm ${getTextColor(results.supabaseConnection.status)}`}>
                {results.supabaseConnection.message}
              </p>
              {results.supabaseConnection.details && (
                <p className={`text-xs mt-1 ${getTextColor(results.supabaseConnection.status)} opacity-75`}>
                  {results.supabaseConnection.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Authentication */}
        <div className={`p-4 rounded-lg border ${getStatusColor(results.authentication?.status)}`}>
          <div className="flex items-center mb-2">
            <Key className="text-gray-600 mr-2" size={20} />
            {getStatusIcon(results.authentication?.status)}
            <span className={`ml-2 font-medium ${getTextColor(results.authentication?.status)}`}>
              Kimlik Doğrulama
            </span>
          </div>
          {results.authentication && (
            <div>
              <p className={`text-sm ${getTextColor(results.authentication.status)}`}>
                {results.authentication.message}
              </p>
              {results.authentication.details && (
                <p className={`text-xs mt-1 ${getTextColor(results.authentication.status)} opacity-75`}>
                  {results.authentication.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Database Access */}
        <div className={`p-4 rounded-lg border ${getStatusColor(results.databaseAccess?.status)}`}>
          <div className="flex items-center mb-2">
            <Database className="text-gray-600 mr-2" size={20} />
            {getStatusIcon(results.databaseAccess?.status)}
            <span className={`ml-2 font-medium ${getTextColor(results.databaseAccess?.status)}`}>
              Veritabanı Erişimi
            </span>
          </div>
          {results.databaseAccess && (
            <div>
              <p className={`text-sm ${getTextColor(results.databaseAccess.status)}`}>
                {results.databaseAccess.message}
              </p>
              {results.databaseAccess.details && (
                <p className={`text-xs mt-1 ${getTextColor(results.databaseAccess.status)} opacity-75`}>
                  {results.databaseAccess.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Edge Functions */}
        <div className={`p-4 rounded-lg border ${getStatusColor(results.edgeFunctions?.status)}`}>
          <div className="flex items-center mb-2">
            <Cloud className="text-gray-600 mr-2" size={20} />
            {getStatusIcon(results.edgeFunctions?.status)}
            <span className={`ml-2 font-medium ${getTextColor(results.edgeFunctions?.status)}`}>
              Edge Functions
            </span>
          </div>
          {results.edgeFunctions && (
            <div>
              <p className={`text-sm ${getTextColor(results.edgeFunctions.status)}`}>
                {results.edgeFunctions.message}
              </p>
              {results.edgeFunctions.details && (
                <p className={`text-xs mt-1 ${getTextColor(results.edgeFunctions.status)} opacity-75`}>
                  {results.edgeFunctions.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* OpenAI API */}
        <div className={`p-4 rounded-lg border ${getStatusColor(results.openaiApi?.status)}`}>
          <div className="flex items-center mb-2">
            <Zap className="text-gray-600 mr-2" size={20} />
            {getStatusIcon(results.openaiApi?.status)}
            <span className={`ml-2 font-medium ${getTextColor(results.openaiApi?.status)}`}>
              OpenAI API
            </span>
          </div>
          {results.openaiApi && (
            <div>
              <p className={`text-sm ${getTextColor(results.openaiApi.status)}`}>
                {results.openaiApi.message}
              </p>
              {results.openaiApi.details && (
                <p className={`text-xs mt-1 ${getTextColor(results.openaiApi.status)} opacity-75`}>
                  {results.openaiApi.details}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Sorun Giderme Rehberi</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Supabase Bağlantısı:</strong> .env dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY kontrol edin</li>
          <li>• <strong>Veritabanı:</strong> Tablolar oluşturulmuş mu? RLS politikaları doğru mu?</li>
          <li>• <strong>Edge Functions:</strong> Supabase Dashboard'da fonksiyonlar deploy edilmiş mi?</li>
          <li>• <strong>OpenAI API:</strong> Supabase Edge Functions'da OPENAI_API_KEY environment variable'ı var mı?</li>
        </ul>
      </div>
    </div>
  );
};

export default SupabaseDebug;