import React, { useState } from 'react';
import { useEffect } from 'react';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface CreateJobFormProps {
  onCancel: () => void;
  onJobCreated: () => void;
}

interface APITestResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

const CreateJobForm: React.FC<CreateJobFormProps> = ({ onCancel, onJobCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    hiring_manager_id: '',
    line_manager_id: ''
  });
  const [managers, setManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<APITestResult | null>(null);
  const [showApiTest, setShowApiTest] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['hiring_manager', 'line_manager'])
      .order('full_name');
    
    if (data) setManagers(data);
    if (error) console.error('Error fetching managers:', error);
  };

  const testOpenAIAPI = async () => {
    setTestingApi(true);
    setApiTestResult(null);

    try {
      console.log('Testing OpenAI API connection...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-openai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            test: true,
            jobDescription: formData.description,
            requestType: 'initial'
          })
        }
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        setApiTestResult({
          status: 'success',
          message: 'OpenAI API çalışıyor',
          details: result.details
        });
      } else {
        setApiTestResult({
          status: 'error',
          message: 'OpenAI API çalışmıyor',
          details: result.error || 'Bilinmeyen hata'
        });
      }
    } catch (error) {
      console.error('API test error:', error);
      setApiTestResult({
        status: 'error',
        message: 'API test edilemedi',
        details: error instanceof Error ? error.message : 'Network hatası'
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([
          {
            title: formData.title,
            company: formData.company,
            description: formData.description,
            created_by: user?.id || 'anonymous',
            hiring_manager_id: formData.hiring_manager_id || null,
            line_manager_id: formData.line_manager_id || null
          }
        ])
        .select()
        .single();

      if (jobError) throw jobError;

      // Generate 10 questions using AI (4 technical, 4 behavioral, 2 general)
      setGeneratingQuestions(true);
      
      try {
        console.log('Sending request to generate-questions function...');
        
        const questionsResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              jobTitle: formData.title,
              jobDescription: formData.description
            })
          }
        );

        console.log('Questions API response status:', questionsResponse.status);

        if (!questionsResponse.ok) {
          console.warn(`Questions API returned ${questionsResponse.status}`);
        }

        const responseData = await questionsResponse.json();
        console.log('Questions API response data:', responseData);
        
        let questions = responseData.questions;
        let questionSource = 'AI';

        // Validate questions
        if (!Array.isArray(questions) || questions.length === 0) {
          console.log('Invalid AI response, using fallback questions');
          questions = [
            // Technical questions (4) - First 2 shown initially (positions 0-1)
            "Bu pozisyon için sahip olduğunuz teknik beceriler ve deneyimler nelerdir?",
            "Kullandığınız teknolojiler ve araçlar konusunda detay verebilir misiniz?",
            // Behavioral questions (4) - Next 2 shown initially (positions 2-3)
            "Takım çalışması konusundaki deneyimlerinizden bahseder misiniz?",
            "Zorlu bir proje deneyiminizden ve nasıl başarıya ulaştığınızdan bahseder misiniz?",
            // General evaluation questions (2) - 1 shown initially (position 4)
            "Bu pozisyon ve şirketimiz hakkında sizi en çok ne heyecanlandırıyor?",
            // Remaining questions (positions 5-9)
            "Karmaşık problemleri çözerken hangi yaklaşımları kullanıyorsunuz?",
            "Bu alandaki güncel trendleri nasıl takip ediyorsunuz?",
            "Stresli durumlarda nasıl performans gösteriyorsunuz?",
            "Çatışma durumlarında nasıl bir yaklaşım sergiliyorsunuz?",
            "Kariyerinizde önümüzdeki 3-5 yıl içinde kendinizi nerede görüyorsunuz?"
          ];
          questionSource = 'Fallback';
        }

        // Save questions to database
        const questionInserts = questions.map((question: string, index: number) => ({
          job_id: job.id,
          question,
          order_index: index
        }));

        const { error: questionsError } = await supabase
          .from('interview_questions')
          .insert(questionInserts);

        if (questionsError) throw questionsError;

        console.log(`Questions saved successfully using ${questionSource} source`);

        if (questionSource === 'Fallback') {
          setError('AI soru üretimi başarısız oldu, varsayılan sorular kullanıldı.');
        }

        onJobCreated();
      } catch (questionsError) {
        console.error('Error in questions generation:', questionsError);
        
        // Create default questions if everything fails
        const defaultQuestions = [
          // Technical questions (4) - First 2 shown initially (positions 0-1)
          "Bu pozisyon için sahip olduğunuz teknik beceriler ve deneyimler nelerdir?",
          "Kullandığınız teknolojiler ve araçlar konusunda detay verebilir misiniz?",
          // Behavioral questions (4) - Next 2 shown initially (positions 2-3)
          "Takım çalışması konusundaki deneyimlerinizden bahseder misiniz?",
          "Zorlu bir proje deneyiminizden ve nasıl başarıya ulaştığınızdan bahseder misiniz?",
          // General evaluation questions (2) - 1 shown initially (position 4)
          "Bu pozisyon ve şirketimiz hakkında sizi en çok ne heyecanlandırıyor?",
          // Remaining questions (positions 5-9)
          "Karmaşık problemleri çözerken hangi yaklaşımları kullanıyorsunuz?",
          "Bu alandaki güncel trendleri nasıl takip ediyorsunuz?",
          "Stresli durumlarda nasıl performans gösteriyorsunuz?",
          "Çatışma durumlarında nasıl bir yaklaşım sergiliyorsunuz?",
          "Kariyerinizde önümüzdeki 3-5 yıl içinde kendinizi nerede görüyorsunuz?"
        ];

        const questionInserts = defaultQuestions.map((question: string, index: number) => ({
          job_id: job.id,
          question,
          order_index: index
        }));

        const { error: fallbackError } = await supabase
          .from('interview_questions')
          .insert(questionInserts);

        if (fallbackError) throw fallbackError;

        setError('AI soru üretimi başarısız oldu, varsayılan sorular kullanıldı.');
        onJobCreated();
      }
    } catch (error) {
      console.error('Error creating job:', error);
      setError('İş ilanı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setGeneratingQuestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={onCancel}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">İş İlanı Oluştur</h1>
              <p className="text-gray-600">AI otomatik olarak mülakat soruları üretecek</p>
            </div>
            <button
              onClick={() => setShowApiTest(!showApiTest)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Info size={16} />
              API Durumu
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showApiTest && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">OpenAI API Durumu</h3>
              <button
                onClick={testOpenAIAPI}
                disabled={testingApi}
                className="bg-[#1C4DA1] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {testingApi ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Test Ediliyor...
                  </>
                ) : (
                  'API Test Et'
                )}
              </button>
            </div>

            {apiTestResult && (
              <div className={`p-4 rounded-lg border ${
                apiTestResult.status === 'success' 
                  ? 'bg-green-50 border-green-200' 
                  : apiTestResult.status === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  {apiTestResult.status === 'success' && <CheckCircle className="text-green-600 mr-2" size={20} />}
                  {apiTestResult.status === 'warning' && <AlertCircle className="text-yellow-600 mr-2" size={20} />}
                  {apiTestResult.status === 'error' && <XCircle className="text-red-600 mr-2" size={20} />}
                  <span className={`font-medium ${
                    apiTestResult.status === 'success' 
                      ? 'text-green-800' 
                      : apiTestResult.status === 'warning'
                      ? 'text-yellow-800'
                      : 'text-red-800'
                  }`}>
                    {apiTestResult.message}
                  </span>
                </div>
                {apiTestResult.details && (
                  <p className={`text-sm ${
                    apiTestResult.status === 'success' 
                      ? 'text-green-700' 
                      : apiTestResult.status === 'warning'
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }`}>
                    Detay: {apiTestResult.details}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">API Durumu Hakkında</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Yeşil:</strong> OpenAI API çalışıyor, AI sorular üretecek</li>
                <li>• <strong>Kırmızı:</strong> OpenAI API çalışmıyor, pozisyona özel sorular kullanılacak</li>
                <li>• <strong>API Key:</strong> Supabase Edge Function'da OPENAI_API_KEY environment variable'ı gerekli</li>
              </ul>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="text-yellow-600 mr-2" size={20} />
                <span className="text-yellow-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İş Pozisyonu
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                placeholder="örn. Senior Frontend Developer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şirket
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                placeholder="örn. Tech Corp"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hiring Manager (İsteğe Bağlı)
                </label>
                <select
                  value={formData.hiring_manager_id}
                  onChange={(e) => setFormData({ ...formData, hiring_manager_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                >
                  <option value="">Seçiniz...</option>
                  {managers
                    .filter(m => m.role === 'hiring_manager')
                    .map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name || manager.id}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Manager (İsteğe Bağlı)
                </label>
                <select
                  value={formData.line_manager_id}
                  onChange={(e) => setFormData({ ...formData, line_manager_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                >
                  <option value="">Seçiniz...</option>
                  {managers
                    .filter(m => m.role === 'line_manager')
                    .map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name || manager.id}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İş Tanımı
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                placeholder="İş tanımınızı buraya yapıştırın. AI bu bilgileri analiz ederek uygun mülakat soruları üretecek."
                required
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Sparkles className="text-[#1C4DA1] mr-2" size={20} />
                <span className="text-sm font-medium text-[#1C4DA1]">AI Destekli Soru Üretimi</span>
              </div>
              <p className="text-sm text-gray-600">
                Sistem 10 adet mülakat sorusu üretir (4 teknik, 4 davranışsal, 2 genel değerlendirme). 
                İlk 5 soru (2 teknik, 2 davranışsal, 1 genel) adaylara gösterilir. İşveren isterse tüm soruları görüntüleyebilir veya yeni sorular ekleyebilir.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || generatingQuestions}
                className="px-6 py-2 bg-[#1C4DA1] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading || generatingQuestions ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {generatingQuestions ? 'Sorular Üretiliyor...' : 'İş İlanı Oluşturuluyor...'}
                  </>
                ) : (
                  'İş İlanı Oluştur'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateJobForm;