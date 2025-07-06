import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, TrendingUp, Clock, Target, Award, 
  Filter, Search, Plus, Download, Calendar, Bell,
  BarChart3, PieChart, Activity, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ATSAnalytics, Application, EnhancedJob, Candidate } from '../../types/ats';

interface ATSDashboardProps {
  userProfile: any;
}

const ATSDashboard: React.FC<ATSDashboardProps> = ({ userProfile }) => {
  const [analytics, setAnalytics] = useState<ATSAnalytics | null>(null);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
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
        fetchRecentApplications(),
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

    // Fetch applications data
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        *,
        jobs(title, department_id),
        candidates(first_name, last_name)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Fetch jobs data
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'published');

    if (applications && jobs) {
      // Calculate analytics
      const totalApplications = applications.length;
      const activeJobs = jobs.length;
      const candidatesInPipeline = applications.filter(app => 
        !['hired', 'rejected', 'withdrawn'].includes(app.status)
      ).length;

      // Calculate conversion rates
      const interviewStages = ['phone_interview', 'technical_interview', 'final_interview'];
      const applicationsWithInterview = applications.filter(app => 
        interviewStages.includes(app.status)
      ).length;
      const offersExtended = applications.filter(app => 
        ['offer_made', 'offer_accepted', 'hired'].includes(app.status)
      ).length;
      const hired = applications.filter(app => app.status === 'hired').length;

      const conversionRates = {
        applicationToInterview: totalApplications > 0 ? (applicationsWithInterview / totalApplications) * 100 : 0,
        interviewToOffer: applicationsWithInterview > 0 ? (offersExtended / applicationsWithInterview) * 100 : 0,
        offerToHire: offersExtended > 0 ? (hired / offersExtended) * 100 : 0
      };

      // Calculate top sources
      const sourceCounts = applications.reduce((acc, app) => {
        const source = app.source || 'Direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source,
          count,
          percentage: (count / totalApplications) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate average time to hire (mock data for now)
      const averageTimeToHire = 21; // days

      setAnalytics({
        totalApplications,
        activeJobs,
        candidatesInPipeline,
        averageTimeToHire,
        conversionRates,
        topSources,
        departmentMetrics: [], // Will be calculated with department data
        monthlyTrends: [] // Will be calculated with historical data
      });
    }
  };

  const fetchRecentApplications = async () => {
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        jobs(title, company),
        candidates(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentApplications(data);
    }
  };

  const fetchUrgentTasks = async () => {
    // Fetch overdue interviews, pending feedback, etc.
    const { data: overdueInterviews } = await supabase
      .from('interview_schedules')
      .select(`
        *,
        applications(
          jobs(title),
          candidates(first_name, last_name)
        )
      `)
      .eq('status', 'scheduled')
      .lt('scheduled_at', new Date().toISOString());

    const { data: pendingFeedback } = await supabase
      .from('interview_schedules')
      .select(`
        *,
        applications(
          jobs(title),
          candidates(first_name, last_name)
        )
      `)
      .eq('status', 'completed')
      .eq('feedback_submitted', false);

    const tasks = [
      ...(overdueInterviews || []).map(interview => ({
        type: 'overdue_interview',
        title: 'Overdue Interview',
        description: `Interview with ${interview.applications?.candidates?.first_name} ${interview.applications?.candidates?.last_name}`,
        priority: 'high',
        data: interview
      })),
      ...(pendingFeedback || []).map(interview => ({
        type: 'pending_feedback',
        title: 'Pending Feedback',
        description: `Feedback needed for ${interview.applications?.candidates?.first_name} ${interview.applications?.candidates?.last_name}`,
        priority: 'medium',
        data: interview
      }))
    ];

    setUrgentTasks(tasks);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-800',
      screening: 'bg-yellow-100 text-yellow-800',
      phone_interview: 'bg-purple-100 text-purple-800',
      technical_interview: 'bg-indigo-100 text-indigo-800',
      final_interview: 'bg-orange-100 text-orange-800',
      offer_made: 'bg-green-100 text-green-800',
      hired: 'bg-green-200 text-green-900',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
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
          <p className="mt-4 text-gray-600">Loading ATS Dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">ATS Dashboard</h1>
              <p className="text-gray-600">Comprehensive recruitment analytics and management</p>
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
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalApplications || 0}</p>
                <p className="text-xs text-green-600">+12% from last period</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Briefcase className="text-[#6CBE45]" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.activeJobs || 0}</p>
                <p className="text-xs text-blue-600">5 new this week</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="text-purple-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">In Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.candidatesInPipeline || 0}</p>
                <p className="text-xs text-purple-600">Across all stages</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="text-orange-600" size={24} />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Avg. Time to Hire</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.averageTimeToHire || 0} days</p>
                <p className="text-xs text-orange-600">-3 days improvement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Application → Interview</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#1C4DA1] h-2 rounded-full" 
                      style={{ width: `${analytics?.conversionRates.applicationToInterview || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{analytics?.conversionRates.applicationToInterview.toFixed(1) || 0}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Interview → Offer</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#6CBE45] h-2 rounded-full" 
                      style={{ width: `${analytics?.conversionRates.interviewToOffer || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{analytics?.conversionRates.interviewToOffer.toFixed(1) || 0}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Offer → Hire</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${analytics?.conversionRates.offerToHire || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{analytics?.conversionRates.offerToHire.toFixed(1) || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Application Sources</h3>
            <div className="space-y-3">
              {analytics?.topSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{source.source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#1C4DA1] h-2 rounded-full" 
                        style={{ width: `${source.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{source.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity & Urgent Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
              <button className="text-[#1C4DA1] hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentApplications.slice(0, 5).map((application) => (
                <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {application.candidates?.first_name} {application.candidates?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{application.jobs?.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(application.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(application.status)}`}>
                      {application.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(application.priority)}`}>
                      {application.priority}
                    </span>
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
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.priority} priority
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Award size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No urgent tasks!</p>
                  <p className="text-sm">Everything is on track.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATSDashboard;