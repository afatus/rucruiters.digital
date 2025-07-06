import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Square, RotateCcw, Send, CheckCircle, Camera, Mic } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Interview, InterviewQuestion } from '../types';

const CandidateInterview: React.FC = () => {
  const { interviewLink } = useParams<{ interviewLink: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState<{ [key: number]: Blob }>({});
  const [submitted, setSubmitted] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (interviewLink) {
      fetchInterview();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [interviewLink]);

  const fetchInterview = async () => {
    if (!interviewLink) {
      setLoading(false);
      return;
    }

    try {
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .select('*, jobs(*)')
        .eq('interview_link', interviewLink)
        .single();

      if (interviewError) throw interviewError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('job_id', interviewData.job_id)
        .order('order_index');

      if (questionsError) throw questionsError;

      setInterview(interviewData);
      setQuestions(questionsData);
      setLoading(false);
      
      await setupCamera();
    } catch (error) {
      console.error('Error fetching interview:', error);
      setLoading(false);
    }
  };

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlobs(prev => ({ ...prev, [currentQuestion]: blob }));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const retakeRecording = () => {
    setRecordedBlobs(prev => {
      const newBlobs = { ...prev };
      delete newBlobs[currentQuestion];
      return newBlobs;
    });
    setRecordingTime(0);
  };

  const submitResponse = async () => {
    const blob = recordedBlobs[currentQuestion];
    if (!blob || !interview) return;

    setSubmitting(true);
    try {
      // Upload video to Supabase Storage
      const fileName = `interview-${interview.id}-question-${questions[currentQuestion].id}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-videos')
        .upload(fileName, blob, {
          contentType: 'video/webm',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('interview-videos')
        .getPublicUrl(fileName);

      // Save video response to database
      const { data: responseData, error: responseError } = await supabase
        .from('video_responses')
        .insert([
          {
            interview_id: interview.id,
            question_id: questions[currentQuestion].id,
            video_url: publicUrl,
            duration: recordingTime
          }
        ])
        .select()
        .single();

      if (responseError) throw responseError;

      // Analyze response with AI
      try {
        console.log('Starting AI analysis for response...');
        
        const analysisResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-response`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              videoUrl: publicUrl,
              question: questions[currentQuestion].question,
              candidateName: interview.candidate_name
            })
          }
        );

        if (!analysisResponse.ok) {
          console.warn(`Analysis API returned ${analysisResponse.status}, using fallback`);
        }

        const analysisData = await analysisResponse.json();
        console.log('AI analysis completed:', analysisData);

        // Save AI analysis
        const { error: analysisError } = await supabase
          .from('ai_analysis')
          .insert([
            {
              response_id: responseData.id,
              transcript: analysisData.transcript || 'Transkript mevcut değil',
              sentiment: analysisData.sentiment || 'neutral',
              tone: analysisData.tone || 'professional',
              score: analysisData.score || 5,
              feedback: analysisData.feedback || 'Analiz tamamlandı',
              has_inappropriate_language: analysisData.has_inappropriate_language || false
            }
          ]);

        if (analysisError) {
          console.error('Error saving analysis:', analysisError);
        } else {
          console.log('Analysis saved successfully');
        }

      } catch (analysisError) {
        console.error('Error in AI analysis:', analysisError);
        
        // Save a fallback analysis if AI analysis fails
        await supabase
          .from('ai_analysis')
          .insert([
            {
              response_id: responseData.id,
              transcript: 'Analiz sırasında hata oluştu',
              sentiment: 'neutral',
              tone: 'unclear',
              score: 5,
              feedback: 'Otomatik analiz başarısız oldu. Manuel değerlendirme gerekebilir.',
              has_inappropriate_language: false
            }
          ]);
      }

      setSubmitted(prev => ({ ...prev, [currentQuestion]: true }));
      
      // Check if all questions are submitted
      const newSubmitted = { ...submitted, [currentQuestion]: true };
      if (Object.keys(newSubmitted).length === questions.length) {
        await completeInterview();
        setAllSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const completeInterview = async () => {
    if (!interview) return;

    // Calculate overall score and update interview
    const { data: responses } = await supabase
      .from('video_responses')
      .select('ai_analysis(*)')
      .eq('interview_id', interview.id);

    if (responses && responses.length > 0) {
      const totalScore = responses.reduce((sum, response) => {
        return sum + (response.ai_analysis[0]?.score || 0);
      }, 0);
      const overallScore = Math.round(totalScore / responses.length);

      await supabase
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          overall_score: overallScore,
          summary: `Interview completed with ${responses.length} responses. Average score: ${overallScore}/10.`
        })
        .eq('id', interview.id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1C4DA1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (!interviewLink || !interview || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Interview Not Found</h1>
          <p className="text-gray-600">The interview link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (allSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-lg shadow-lg">
          <CheckCircle className="text-[#6CBE45] mx-auto mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Interview Completed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for completing the interview. Your responses have been submitted and will be reviewed by our team.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-[#1C4DA1]">
              <strong>Next Steps:</strong> We'll review your responses and get back to you within 2-3 business days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{interview.jobs?.title}</h1>
                <p className="text-gray-600">{interview.jobs?.company} • Interview for {interview.candidate_name}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {questions.length}
                </div>
                <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-[#1C4DA1] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Question {currentQuestion + 1}</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-gray-800">{questions[currentQuestion]?.question}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {!isRecording && !recordedBlobs[currentQuestion] && (
                  <button
                    onClick={startRecording}
                    disabled={!cameraReady}
                    className="bg-[#1C4DA1] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play size={20} />
                    Start Recording
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Square size={20} />
                    Stop Recording
                  </button>
                )}

                {recordedBlobs[currentQuestion] && !submitted[currentQuestion] && (
                  <>
                    <button
                      onClick={retakeRecording}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={20} />
                      Retake
                    </button>
                    <button
                      onClick={submitResponse}
                      disabled={submitting}
                      className="bg-[#6CBE45] text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          Submit Response
                        </>
                      )}
                    </button>
                  </>
                )}

                {submitted[currentQuestion] && (
                  <div className="flex items-center gap-2 text-[#6CBE45]">
                    <CheckCircle size={20} />
                    <span className="font-medium">Submitted</span>
                  </div>
                )}
              </div>

              {isRecording && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="font-medium">Recording: {formatTime(recordingTime)}</span>
                </div>
              )}

              {recordedBlobs[currentQuestion] && (
                <div className="text-sm text-gray-600">
                  ✓ Recording ready ({formatTime(recordingTime)})
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  disabled={currentQuestion === questions.length - 1}
                  className="px-4 py-2 bg-[#1C4DA1] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="text-[#1C4DA1]" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Video Recording</h3>
            </div>

            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full rounded-lg bg-gray-900"
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <Camera className="text-gray-400 mx-auto mb-2" size={48} />
                    <p className="text-gray-600">Setting up camera...</p>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 left-4">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    REC
                  </div>
                </div>
              )}
            </div>

            {recordedBlobs[currentQuestion] && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Your Recording</h4>
                <video
                  controls
                  className="w-full rounded-lg"
                  src={URL.createObjectURL(recordedBlobs[currentQuestion])}
                />
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="text-[#1C4DA1]" size={16} />
                <span className="text-sm font-medium text-[#1C4DA1]">Recording Tips</span>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Look directly at the camera</li>
                <li>• Speak clearly and at a moderate pace</li>
                <li>• Take your time to think before answering</li>
                <li>• Keep responses between 1-3 minutes</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  index === currentQuestion
                    ? 'border-[#1C4DA1] bg-blue-50'
                    : submitted[index]
                    ? 'border-[#6CBE45] bg-green-50'
                    : recordedBlobs[index]
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => setCurrentQuestion(index)}
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">Q{index + 1}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {submitted[index] ? (
                      <span className="text-[#6CBE45]">✓ Submitted</span>
                    ) : recordedBlobs[index] ? (
                      <span className="text-yellow-600">● Ready</span>
                    ) : (
                      <span className="text-gray-500">○ Pending</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateInterview;