import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, TrendingUp, Clock, Target, Award, 
  Filter, Search, Plus, Download, Calendar, Bell,
  BarChart3, PieChart, Activity, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ATSDashboardProps {
  userProfile: any;
  onSelectInterview?: (interview: any) => void;
}

interface DashboardAnalytics {
  totalInterviews: number;
  activeJobs: number;
  completedInterviews: number;
  averageScore: number;
  pendingInterviews: number;
  recentInterviews: any[];
}

const ATSDashboard: React.FC<ATSDashboardProps> = ({ userProfile, onSelectInterview }) => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalytics(),
        fetchRecentInterviews(),
        fetchUrgentTasks()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
    startDate.setDate(endDate.getDate() - days);

    // Fetch interviews data
    const { data: interviews } = await supabase
      .from('interviews')
      .select(`
        *,
        jobs(title, company)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Fetch jobs data
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*');

    if (interviews && jobs) {
      const totalInterviews = interviews.length;
      const activeJobs = jobs.length;
      const completedInterviews = interviews.filter(interview => 
        interview.status === 'completed'
      ).length;
      const pendingInterviews = interviews.filter(interview => 
        interview.status === 'pending'
      ).length;

      // Calculate average score for completed interviews
      const completedWithScores = interviews.filter(interview => 
        interview.status === 'completed' && interview.overall_score > 0
      );
      const averageScore = completedWithScores.length > 0 
        ? completedWithScores.reduce((sum, interview) => sum + interview.overall_score, 0) / completedWithScores.length
        : 0;

      setAnalytics({
        totalInterviews,
        activeJobs,
        completedInterviews,
        averageScore,
        pendingInterviews,
        recentInterviews: interviews.slice(0, 10)
      });
    }
  };

  const fetchRecentInterviews = async () => {
    const { data } = await supabase
      .from('interviews')
      .select(`
        *,
        jobs(title, company)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentInterviews(data);
    }
  };

  const fetchUrgentTasks = async () => {
    // Fetch pending interviews that need attention
    const { data: pendingInterviews } = await supabase
      .from('interviews')
      .select(`
        *,
        jobs(title, company)
      `)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Older than 7 days

    // Fetch completed interviews without analysis
    const { data: completedWithoutAnalysis } = await supabase
      .from('interviews')
      .select(`
        *,
        jobs(title, company)
      `)
      .eq('status', 'completed')
      .is('summary', null);

    const tasks = [
      ...(pendingInterviews || []).map(interview => ({
        type: 'stale_interview',
        title: 'Stale Interview',
        description: `Interview with ${interview.candidate_name} has been pending for over 7 days`,
        priority: 'high',
        data: interview
      })),
      ...(completedWithoutAnalysis || []).map(interview => ({
        type: 'missing_analysis',
        title: 'Missing Analysis',
        description: `Completed interview with ${interview.candidate_name} needs review`,
        priority: 'medium',
        data: interview
      }))
    ];

    setUrgentTasks(tasks);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1C4DA1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Interview Dashboard</h1>
              <p className="text-gray-600">Comprehensive interview analytics and management</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="bg-[#1C4DA1] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Download size={20} />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="text-[#1C4DA1]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalInterviews || 0}</p>
                <p className="text-xs text-green-600">All time</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Briefcase className="text-[#6CBE45]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.activeJobs || 0}</p>
                <p className="text-xs text-blue-600">Currently open</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="text-purple-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.completedInterviews || 0}</p>
                <p className="text-xs text-purple-600">Interviews finished</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Target className="text-orange-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Avg. Score</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.averageScore.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-orange-600">Out of 10</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Status Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Interviews</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ 
                        width: `${analytics?.totalInterviews ? (analytics.pendingInterviews / analytics.totalInterviews) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{analytics?.pendingInterviews || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Interviews</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${analytics?.totalInterviews ? (analytics.completedInterviews / analytics.totalInterviews) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{analytics?.completedInterviews || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#1C4DA1] h-2 rounded-full" 
                      style={{ 
                        width: `${analytics?.totalInterviews ? (analytics.completedInterviews / analytics.totalInterviews) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {analytics?.totalInterviews ? ((analytics.completedInterviews / analytics.totalInterviews) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#6CBE45] h-2 rounded-full" 
                      style={{ width: `${(analytics?.averageScore || 0) * 10}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{analytics?.averageScore.toFixed(1) || 0}/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Urgent Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Interviews</h3>
              <button className="text-[#1C4DA1] hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentInterviews.slice(0, 5).map((interview) => (
                <div key={interview.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{interview.candidate_name}</p>
                    <p className="text-sm text-gray-600">{interview.jobs?.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(interview.status)}`}>
                      {interview.status.replace('_', ' ')}
                    </span>
                    {interview.overall_score > 0 && (
                      <span className="text-xs font-medium text-gray-600">
                        {interview.overall_score}/10
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Urgent Tasks</h3>
              <Bell className="text-orange-500" size={20} />
            </div>
            <div className="space-y-4">
              {urgentTasks.length > 0 ? (
                urgentTasks.slice(0, 5).map((task, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="text-orange-500 mt-0.5" size={16} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-600">{task.description}</p>
                      <p className="text-xs text-orange-600 mt-1">Priority: {task.priority}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-4">No urgent tasks</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATSDashboard;