import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Link, Plus, Mail, Calendar, Edit3, Save, X, Sparkles, Eye, EyeOff, Trash2, RefreshCw, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Job, InterviewQuestion, Interview, InterviewLinkLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface JobDetailProps {
  job: Job;
  onBack: () => void;
  onInterviewsUpdate: () => void;
}

const JobDetail: React.FC<JobDetailProps> = ({ job, onBack, onInterviewsUpdate }) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resendingLinks, setResendingLinks] = useState<{ [key: string]: boolean }>({});
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<{ [key: number]: boolean }>({});
  const [editedQuestions, setEditedQuestions] = useState<{ [key: number]: string }>({});
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [addingNewQuestions, setAddingNewQuestions] = useState(false);
  const [inviteData, setInviteData] = useState({
    candidateName: '',
    candidateEmail: ''
  });

  useEffect(() => {
    fetchQuestions();
    fetchInterviews();
  }, [job.id]);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('job_id', job.id)
      .order('order_index');
    
    if (data) setQuestions(data);
  };

  const fetchInterviews = async () => {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, link_sent_count')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false });
    
    if (data) setInterviews(data);
  };

  const handleResendLink = async (interview: Interview) => {
    setResendingLinks(prev => ({ ...prev, [interview.id]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update link_sent_count
      const newCount = (interview.link_sent_count || 1) + 1;
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ link_sent_count: newCount })
        .eq('id', interview.id);

      if (updateError) throw updateError;

      // Log the resend action
      const { error: logError } = await supabase
        .from('interview_link_logs')
        .insert([
          {
            interview_id: interview.id,
            sent_by: user?.id || null,
            sent_at: new Date().toISOString()
          }
        ]);

      if (logError) throw logError;

      // Update local state
      setInterviews(prev => prev.map(i => 
        i.id === interview.id 
          ? { ...i, link_sent_count: newCount }
          : i
      ));

      // Copy link to clipboard
      const interviewUrl = `${window.location.origin}/interview/${interview.interview_link}`;
      await navigator.clipboard.writeText(interviewUrl);
      
      alert(`Mülakat linki panoya kopyalandı! Bu link ${newCount}. kez gönderildi.`);
      
      // Update parent component
      onInterviewsUpdate();

    } catch (error) {
      console.error('Error resending link:', error);
      alert('Link yeniden gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setResendingLinks(prev => ({ ...prev, [interview.id]: false }));
    }
  };

  const startEditingQuestion = (index: number, currentQuestion: string) => {
    setEditingQuestions(prev => ({ ...prev, [index]: true }));
    setEditedQuestions(prev => ({ ...prev, [index]: currentQuestion }));
  };

  const cancelEditingQuestion = (index: number) => {
    setEditingQuestions(prev => ({ ...prev, [index]: false }));
    setEditedQuestions(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const saveEditedQuestion = async (index: number) => {
    const newQuestion = editedQuestions[index];
    if (!newQuestion || newQuestion.trim().length === 0) return;

    try {
      const { error } = await supabase
        .from('interview_questions')
        .update({ question: newQuestion.trim() })
        .eq('id', questions[index].id);

      if (error) throw error;

      // Update local state
      setQuestions(prev => prev.map((q, i) => 
        i === index ? { ...q, question: newQuestion.trim() } : q
      ));

      // Clear editing state
      setEditingQuestions(prev => ({ ...prev, [index]: false }));
      setEditedQuestions(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });

    } catch (error) {
      console.error('Error updating question:', error);
      alert('Soru güncellenirken bir hata oluştu.');
    }
  };

  const deleteQuestion = async (index: number) => {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('interview_questions')
        .delete()
        .eq('id', questions[index].id);

      if (error) throw error;

      // Update local state
      setQuestions(prev => prev.filter((_, i) => i !== index));

    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Soru silinirken bir hata oluştu.');
    }
  };

  const addNewQuestions = async () => {
    setAddingNewQuestions(true);

    try {
      console.log('Adding new questions...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            jobTitle: job.title,
            jobDescription: job.description,
            requestType: 'additional'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      let newQuestions = [];

      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        newQuestions = data.questions;
      } else {
        // Fallback questions
        newQuestions = [
          "Bu pozisyonda karşılaşabileceğiniz zorlukları nasıl değerlendiriyorsunuz?",
          "Profesyonel gelişiminiz için hangi adımları atmayı planlıyorsunuz?",
          "Bu şirkette uzun vadeli hedefleriniz nelerdir?"
        ];
      }

      // Get the highest order_index
      const maxOrderIndex = Math.max(...questions.map(q => q.order_index), -1);

      // Save new questions to database
      const questionInserts = newQuestions.map((question: string, index: number) => ({
        job_id: job.id,
        question,
        order_index: maxOrderIndex + index + 1
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('interview_questions')
        .insert(questionInserts)
        .select();

      if (insertError) throw insertError;

      // Update local state
      if (insertedQuestions) {
        setQuestions(prev => [...prev, ...insertedQuestions]);
      }

      console.log(`Successfully added ${newQuestions.length} new questions`);

    } catch (error) {
      console.error('Error adding new questions:', error);
      alert('Yeni sorular eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setAddingNewQuestions(false);
    }
  };

  const handleInviteCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!job.tenant_id) {
        throw new Error('İş ilanı tenant bilgisi bulunamadı.');
      }
      
    const interviewLink = uuidv4();
    const interviewUrl = `${window.location.origin}/interview/${interviewLink}`;
    
    const { data, error } = await supabase
      .from('interviews')
      .insert([
        {
          job_id: job.id,
          candidate_name: inviteData.candidateName,
          candidate_email: inviteData.candidateEmail,
          interview_link: interviewLink,
          status: 'pending',
          link_sent_count: 1,
          tenant_id: job.tenant_id
        }
      ])
      .select()
      .single();

      if (error) throw error;

      // Log the initial link sending
      const { error: logError } = await supabase
        .from('interview_link_logs')
        .insert([
          {
            interview_id: data.id,
            sent_by: user?.id || null,
            sent_at: new Date().toISOString(),
            tenant_id: job.tenant_id
          }
        ]);

      if (logError) {
        console.error('Error logging initial link send:', logError);
        // Don't fail the whole operation for logging error
      }

      setShowInviteForm(false);
      setInviteData({ candidateName: '', candidateEmail: '' });
      fetchInterviews();
      onInterviewsUpdate();
      
      // In production, you'd send an email here
      alert(`Interview link generated: ${interviewUrl}`);
    } catch (error) {
      console.error('Error creating interview:', error);
      alert('Mülakat oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const copyInterviewLink = (link: string) => {
    const url = `${window.location.origin}/interview/${link}`;
    navigator.clipboard.writeText(url);
    alert('Interview link copied to clipboard!');
  };

  const getQuestionType = (index: number) => {
    // First 5 questions: 2 Technical (0-1), 2 Behavioral (2-3), 1 General (4)
    // Remaining 5 questions: 2 Technical (5-6), 2 Behavioral (7-8), 1 General (9)
    if (index === 0 || index === 1 || index === 5 || index === 6) return 'Teknik';
    if (index === 2 || index === 3 || index === 7 || index === 8) return 'Davranışsal';
    return 'Genel Değerlendirme';
  };

  const getQuestionTypeColor = (index: number) => {
    // First 5 questions: 2 Technical (0-1), 2 Behavioral (2-3), 1 General (4)
    // Remaining 5 questions: 2 Technical (5-6), 2 Behavioral (7-8), 1 General (9)
    if (index === 0 || index === 1 || index === 5 || index === 6) return 'bg-blue-100 text-blue-800';
    if (index === 2 || index === 3 || index === 7 || index === 8) return 'bg-green-100 text-green-800';
    return 'bg-purple-100 text-purple-800';
  };

  const displayedQuestions = showAllQuestions ? questions : questions.slice(0, 5);

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
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-gray-600">{job.company}</p>
            </div>
            <button
              onClick={() => setShowInviteForm(true)}
              className="bg-[#6CBE45] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Invite Candidate
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Interview Questions</h2>
                <div className="flex gap-2">
                  {questions.length > 5 && (
                    <button
                      onClick={() => setShowAllQuestions(!showAllQuestions)}
                      className="text-[#1C4DA1] hover:text-blue-700 transition-colors flex items-center gap-2 px-3 py-1 rounded-lg border border-[#1C4DA1] hover:bg-blue-50"
                    >
                      {showAllQuestions ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showAllQuestions ? 'İlk 5 Soruyu Göster' : `Tüm Soruları Göster (${questions.length})`}
                    </button>
                  )}
                  <button
                    onClick={addNewQuestions}
                    disabled={addingNewQuestions}
                    className="bg-[#6CBE45] text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingNewQuestions ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Ekleniyor...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        AI ile Yeni Sorular Ekle
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {displayedQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1C4DA1] bg-blue-50 px-2 py-1 rounded">
                          Question {index + 1}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getQuestionTypeColor(index)}`}>
                          {getQuestionType(index)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {!editingQuestions[index] && (
                          <>
                            <button
                              onClick={() => startEditingQuestion(index, question.question)}
                              className="text-gray-500 hover:text-[#1C4DA1] transition-colors p-1 rounded"
                              title="Soruyu düzenle"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => deleteQuestion(index)}
                              className="text-gray-500 hover:text-red-600 transition-colors p-1 rounded"
                              title="Soruyu sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {editingQuestions[index] ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedQuestions[index] || ''}
                          onChange={(e) => setEditedQuestions(prev => ({ ...prev, [index]: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent resize-none"
                          rows={3}
                          placeholder="Sorunuzu buraya yazın..."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => cancelEditingQuestion(index)}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
                          >
                            <X size={14} />
                            İptal
                          </button>
                          <button
                            onClick={() => saveEditedQuestion(index)}
                            className="px-3 py-1 bg-[#6CBE45] text-white rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                          >
                            <Save size={14} />
                            Kaydet
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-700 leading-relaxed">
                        {question.question}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Soru Yönetimi Rehberi</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-900">Teknik Sorular</span>
                    </div>
                    <p className="text-xs text-blue-700">Pozisyona özel beceriler, deneyim, uzmanlık alanları</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-900">Davranışsal Sorular</span>
                    </div>
                    <p className="text-xs text-green-700">Takım çalışması, problem çözme, liderlik, adaptasyon</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-purple-900">Genel Değerlendirme</span>
                    </div>
                    <p className="text-xs text-purple-700">Motivasyon, kariyer hedefleri, şirket uyumu</p>
                  </div>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>İlk 5 Soru:</strong> Adaylara gösterilen temel sorular (2 teknik, 2 davranışsal, 1 genel)</li>
                  <li>• <strong>Tüm Sorular:</strong> Sistem 10 soru üretir, istediğinizde hepsini görüntüleyebilirsiniz</li>
                  <li>• <strong>AI ile Yeni Sorular:</strong> İstediğiniz zaman 3 yeni soru ekleyebilirsiniz</li>
                  <li>• <strong>Düzenleme:</strong> Tüm soruları manuel olarak düzenleyebilir veya silebilirsiniz</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Interviews</h2>
              <div className="space-y-4">
                {interviews.map((interview) => (
                  <div key={interview.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{interview.candidate_name}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail size={12} />
                          {interview.candidate_email}
                        </p>
                      </div>
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
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <Calendar size={12} />
                      {new Date(interview.created_at).toLocaleDateString()}
                      {interview.link_sent_count > 1 && (
                        <span className="text-orange-600 font-medium">
                          • Link {interview.link_sent_count} kez gönderildi
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => copyInterviewLink(interview.interview_link)}
                        className="w-full text-left px-3 py-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <Link size={14} />
                        Mülakat Linkini Kopyala
                      </button>
                      <button
                        onClick={() => handleResendLink(interview)}
                        disabled={resendingLinks[interview.id]}
                        className="w-full text-left px-3 py-2 bg-blue-50 rounded text-sm hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendingLinks[interview.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Gönderiliyor...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} />
                            Yeniden Link Gönder
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {interviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Henüz mülakat bulunmuyor.</p>
                  <p className="text-sm">Aday davet ederek mülakatları başlatabilirsiniz.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aday Davet Et</h3>
            <form onSubmit={handleInviteCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aday Adı
                </label>
                <input
                  type="text"
                  value={inviteData.candidateName}
                  onChange={(e) => setInviteData({ ...inviteData, candidateName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="Aday adını girin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={inviteData.candidateEmail}
                  onChange={(e) => setInviteData({ ...inviteData, candidateEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  placeholder="aday@email.com"
                  required
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Send size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Mülakat Daveti</span>
                </div>
                <p className="text-sm text-blue-800">
                  Aday davet edildiğinde benzersiz bir mülakat linki oluşturulur. 
                  Bu link kaybedilirse "Yeniden Link Gönder" butonu ile tekrar gönderilebilir.
                </p>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6CBE45] text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Davet Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;