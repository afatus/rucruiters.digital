import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Star, MessageCircle, TrendingUp, Edit3, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Interview, VideoResponse, AIAnalysis, InterviewQuestion, Profile } from '../types';

interface InterviewResultsProps {
  interview: Interview;
  onBack: () => void;
}

const InterviewResults: React.FC<InterviewResultsProps> = ({ interview, onBack }) => {
  const [responses, setResponses] = useState<(VideoResponse & { analysis: AIAnalysis; question: InterviewQuestion })[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<{ [key: string]: boolean }>({});
  const [feedbackText, setFeedbackText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchResults();
  }, [interview.id]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) setUserProfile(profile);
    }
  };

  const fetchResults = async () => {
    const { data: responsesData, error } = await supabase
      .from('video_responses')
      .select(`
        *,
        ai_analysis(*),
        interview_questions(*)
      `)
      .eq('interview_id', interview.id);

    if (responsesData) {
      const formattedResponses = responsesData.map(response => ({
        ...response,
        analysis: response.ai_analysis[0],
        question: response.interview_questions
      }));
      setResponses(formattedResponses);
    }
    setLoading(false);
  };

  const canAddManagerFeedback = (analysis: AIAnalysis) => {
    return userProfile && 
           ['hiring_manager', 'line_manager', 'hr_operations'].includes(userProfile.role) &&
           !analysis.manager_feedback;
  };

  const startEditingFeedback = (responseId: string) => {
    setEditingFeedback(prev => ({ ...prev, [responseId]: true }));
    setFeedbackText(prev => ({ ...prev, [responseId]: '' }));
  };

  const cancelEditingFeedback = (responseId: string) => {
    setEditingFeedback(prev => ({ ...prev, [responseId]: false }));
    setFeedbackText(prev => {
      const newState = { ...prev };
      delete newState[responseId];
      return newState;
    });
  };

  const saveManagerFeedback = async (responseId: string, analysisId: string) => {
    const feedback = feedbackText[responseId];
    if (!feedback || !feedback.trim() || !userProfile) return;

    try {
      const { error } = await supabase
        .from('ai_analysis')
        .update({
          manager_feedback: feedback.trim(),
          manager_feedback_by: userProfile.id,
          manager_feedback_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (error) throw error;

      // Update local state
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? {
              ...response,
              analysis: {
                ...response.analysis,
                manager_feedback: feedback.trim(),
                manager_feedback_by: userProfile.id,
                manager_feedback_at: new Date().toISOString()
              }
            }
          : response
      ));

      // Clear editing state
      setEditingFeedback(prev => ({ ...prev, [responseId]: false }));
      setFeedbackText(prev => {
        const newState = { ...prev };
        delete newState[responseId];
        return newState;
      });

    } catch (error) {
      console.error('Error saving manager feedback:', error);
      alert('Geri bildirim kaydedilirken bir hata oluştu.');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1C4DA1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
              <p className="text-gray-600">{interview.candidate_name} • {interview.candidate_email}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Star className="text-yellow-500" size={20} />
                <span className="text-2xl font-bold text-gray-900">{interview.overall_score}/10</span>
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {responses.map((response, index) => (
                <div key={response.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Question {index + 1}
                      </h3>
                      <p className="text-gray-700 mb-4">{response.question.question}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(response.analysis?.score || 0)}`}>
                        {response.analysis?.score || 0}/10
                      </div>
                      <p className="text-sm text-gray-600">Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <h4 className="font-medium text-gray-900 mb-2">Video Response</h4>
                      <video 
                        controls 
                        className="w-full rounded-lg bg-gray-100"
                        style={{ maxHeight: '200px' }}
                      >
                        <source src={response.video_url} type="video/webm" />
                        Your browser does not support the video tag.
                      </video>
                      <p className="text-sm text-gray-600 mt-2">
                        Duration: {Math.floor(response.duration / 60)}:{(response.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Response Details</h4>
                      
                      <div className="text-sm text-gray-600">
                        <p>Response recorded at: {new Date(response.created_at).toLocaleString('tr-TR')}</p>
                        <p>Question order: {response.question.order_index + 1}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-4">AI Analysis</h4>
                    
                    {response.analysis?.has_inappropriate_language && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-sm font-medium text-red-800">
                            ⚠️ Uyarı: Bu cevapta uygunsuz (argo) kelime kullanımı tespit edilmiştir
                          </span>
                        </div>
                        <p className="text-xs text-red-700 mt-1">
                          Lütfen videoyu izlerken dikkat ediniz.
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Sentiment:</span>
                        <div className={`text-lg font-medium ${getSentimentColor(response.analysis?.sentiment || 'neutral')}`}>
                          {response.analysis?.sentiment || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Tone:</span>
                        <div className="text-lg font-medium text-gray-900">
                          {response.analysis?.tone || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Score:</span>
                        <div className={`text-lg font-bold ${getScoreColor(response.analysis?.score || 0)}`}>
                          {response.analysis?.score || 0}/10
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-900 mb-2">Feedback</h5>
                      <p className="text-sm text-blue-800">
                        {response.analysis?.feedback || 'Geri bildirim mevcut değil'}
                      </p>
                    </div>

                    {/* Manager Feedback Section */}
                    {(response.analysis?.manager_feedback || canAddManagerFeedback(response.analysis)) && (
                      <div className="mt-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-purple-900">Manager Feedback</h5>
                          {canAddManagerFeedback(response.analysis) && !editingFeedback[response.id] && (
                            <button
                              onClick={() => startEditingFeedback(response.id)}
                              className="text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1"
                            >
                              <Edit3 size={14} />
                              Add Feedback
                            </button>
                          )}
                        </div>
                        
                        {editingFeedback[response.id] ? (
                          <div className="space-y-3">
                            <textarea
                              value={feedbackText[response.id] || ''}
                              onChange={(e) => setFeedbackText(prev => ({ ...prev, [response.id]: e.target.value }))}
                              className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                              rows={3}
                              placeholder="Manager geri bildiriminizi buraya yazın..."
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => cancelEditingFeedback(response.id)}
                                className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
                              >
                                <X size={14} />
                                İptal
                              </button>
                              <button
                                onClick={() => saveManagerFeedback(response.id, response.analysis.id)}
                                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                              >
                                <Save size={14} />
                                Kaydet
                              </button>
                            </div>
                          </div>
                        ) : response.analysis?.manager_feedback ? (
                          <div>
                            <p className="text-sm text-purple-800 mb-2">
                              {response.analysis.manager_feedback}
                            </p>
                            {response.analysis.manager_feedback_at && (
                              <p className="text-xs text-purple-600">
                                Added on {new Date(response.analysis.manager_feedback_at).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-purple-600 italic">
                            No manager feedback yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {response.analysis?.transcript && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Transcript</h4>
                      <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <span className="font-medium text-blue-900">Konuşma Transkripti</span>
                        </div>
                        {response.analysis.transcript}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#1C4DA1] mb-2">
                    {interview.overall_score}/10
                  </div>
                  <p className="text-sm text-gray-600">Overall Score</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="text-gray-500" size={16} />
                    <span className="text-sm font-medium text-gray-900">Candidate Info</span>
                  </div>
                  <p className="text-sm text-gray-700">{interview.candidate_name}</p>
                  <p className="text-sm text-gray-600">{interview.candidate_email}</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="text-gray-500" size={16} />
                    <span className="text-sm font-medium text-gray-900">Responses</span>
                  </div>
                  <p className="text-sm text-gray-700">{responses.length} questions answered</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-gray-500" size={16} />
                    <span className="text-sm font-medium text-gray-900">Average Sentiment</span>
                  </div>
                  <p className="text-sm text-gray-700 capitalize">
                    {responses.length > 0 
                      ? responses.reduce((acc, r) => acc + (r.analysis?.sentiment === 'positive' ? 1 : 0), 0) / responses.length > 0.5 
                        ? 'Positive' 
                        : 'Neutral'
                      : 'N/A'
                    }
                  </p>
                </div>

                {interview.summary && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">AI Summary</h4>
                    <p className="text-sm text-gray-700">{interview.summary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Explanation Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            AI Analiz Değerlendirme Sistemi
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sentiment Analysis */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Sentiment (Duygu) Analizi
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Positive:</span>
                  <span className="text-green-600">Olumlu, iyimser, kendinden emin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700 font-medium">Neutral:</span>
                  <span className="text-yellow-600">Nötr, dengeli</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 font-medium">Negative:</span>
                  <span className="text-red-600">Olumsuz, karamsar, endişeli</span>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-3 bg-white p-2 rounded border border-green-200">
                Adayın konuşmasındaki genel duygusal ton analiz edilir.
              </p>
            </div>

            {/* Tone Analysis */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Tone (Ton) Analizi
              </h3>
              <div className="space-y-1 text-sm">
                <div className="text-blue-700"><strong>Confident:</strong> Kendinden emin, kararlı</div>
                <div className="text-blue-700"><strong>Professional:</strong> Profesyonel, resmi</div>
                <div className="text-blue-700"><strong>Enthusiastic:</strong> Hevesli, coşkulu</div>
                <div className="text-blue-700"><strong>Nervous:</strong> Gergin, endişeli</div>
                <div className="text-blue-700"><strong>Casual:</strong> Rahat, samimi</div>
                <div className="text-blue-700"><strong>Hesitant:</strong> Kararsız, tereddütlü</div>
              </div>
              <p className="text-xs text-blue-700 mt-3 bg-white p-2 rounded border border-blue-200">
                Konuşma tarzı ve yaklaşım şekli değerlendirilir.
              </p>
            </div>

            {/* Scoring System */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Puanlama Sistemi (1-10)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">9-10:</span>
                  <span className="text-green-600">Mükemmel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 font-medium">7-8:</span>
                  <span className="text-blue-600">İyi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700 font-medium">5-6:</span>
                  <span className="text-yellow-600">Orta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 font-medium">1-4:</span>
                  <span className="text-red-600">Zayıf</span>
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-3 bg-white p-2 rounded border border-purple-200">
                İçerik kalitesi, iletişim becerileri, profesyonellik ve deneyim paylaşımı değerlendirilir.
              </p>
            </div>

            {/* Content Detection */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                İçerik Kontrolü
              </h3>
              <div className="space-y-2 text-sm">
                <div className="text-orange-700">
                  <strong>Uygunsuz Dil:</strong> Argo, küfür ve profesyonel olmayan ifadeler tespit edilir
                </div>
                <div className="text-orange-700">
                  <strong>Transkript:</strong> Konuşma metne dönüştürülür
                </div>
                <div className="text-orange-700">
                  <strong>Feedback:</strong> Detaylı geri bildirim üretilir
                </div>
              </div>
              <p className="text-xs text-orange-700 mt-3 bg-white p-2 rounded border border-orange-200">
                AI, ses kalitesi ve içerik uygunluğunu kontrol eder.
              </p>
            </div>
          </div>

          {/* Evaluation Criteria */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Değerlendirme Kriterleri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Puanlama Faktörleri:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>İçerik Kalitesi (40%):</strong> Soruya uygunluk, detay seviyesi</li>
                  <li>• <strong>İletişim Becerileri (25%):</strong> Netlik, akıcılık</li>
                  <li>• <strong>Profesyonellik (20%):</strong> Uygun dil kullanımı, güven</li>
                  <li>• <strong>Deneyim Paylaşımı (15%):</strong> Örnekler, somut deneyimler</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Teknoloji Altyapısı:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>OpenAI Whisper:</strong> Ses-metin dönüşümü</li>
                  <li>• <strong>GPT-4:</strong> İçerik analizi ve puanlama</li>
                  <li>• <strong>Sentiment Analysis:</strong> Duygu durumu tespiti</li>
                  <li>• <strong>Content Filtering:</strong> Uygunsuz içerik kontrolü</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-yellow-800 text-xs">!</span>
              </div>
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">Önemli Not</h4>
                <p className="text-sm text-yellow-800">
                  AI analizi, mülakat değerlendirmesinde yardımcı bir araçtır. Nihai karar her zaman insan değerlendirmesi ile verilmelidir. 
                  Ses kalitesi, teknik sorunlar veya dil farklılıkları analiz sonuçlarını etkileyebilir. 
                  Bu nedenle AI skorları, diğer değerlendirme kriterleri ile birlikte değerlendirilmelidir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewResults;