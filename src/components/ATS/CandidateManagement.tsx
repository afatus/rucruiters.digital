import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Download, Upload, Eye, Edit3, 
  Trash2, Mail, Phone, MapPin, Calendar, Award, 
  ExternalLink, FileText, Star, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Candidate, CandidateSearchFilters } from '../../types/ats';

interface CandidateManagementProps {
  userProfile: any;
}

const CandidateManagement: React.FC<CandidateManagementProps> = ({ userProfile }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CandidateSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, [searchTerm, filters]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (filters.experience_min) {
        query = query.gte('experience_years', filters.experience_min);
      }
      if (filters.experience_max) {
        query = query.lte('experience_years', filters.experience_max);
      }
      if (filters.location) {
        query = query.ilike('current_location', `%${filters.location}%`);
      }
      if (filters.education_level && filters.education_level.length > 0) {
        query = query.in('education_level', filters.education_level);
      }
      if (filters.skills && filters.skills.length > 0) {
        query = query.contains('skills', filters.skills);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCandidate = async (candidateData: Partial<Candidate>) => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .insert([candidateData])
        .select()
        .single();

      if (error) throw error;

      setCandidates(prev => [data, ...prev]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating candidate:', error);
      alert('Error creating candidate. Please try again.');
    }
  };

  const handleUpdateCandidate = async (id: string, updates: Partial<Candidate>) => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCandidates(prev => prev.map(c => c.id === id ? data : c));
      setEditingCandidate(null);
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert('Error updating candidate. Please try again.');
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Error deleting candidate. Please try again.');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCandidates.length === 0) {
      alert('Please select candidates first.');
      return;
    }

    switch (action) {
      case 'export':
        // Export selected candidates
        const selectedData = candidates.filter(c => selectedCandidates.includes(c.id));
        const csvContent = generateCSV(selectedData);
        downloadCSV(csvContent, 'candidates.csv');
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete ${selectedCandidates.length} candidates?`)) {
          try {
            const { error } = await supabase
              .from('candidates')
              .delete()
              .in('id', selectedCandidates);

            if (error) throw error;

            setCandidates(prev => prev.filter(c => !selectedCandidates.includes(c.id)));
            setSelectedCandidates([]);
          } catch (error) {
            console.error('Error deleting candidates:', error);
            alert('Error deleting candidates. Please try again.');
          }
        }
        break;
    }
  };

  const generateCSV = (data: Candidate[]) => {
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Experience', 'Skills'];
    const rows = data.map(candidate => [
      `${candidate.first_name} ${candidate.last_name}`,
      candidate.email,
      candidate.phone || '',
      candidate.current_location || '',
      `${candidate.experience_years} years`,
      candidate.skills.join(', ')
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getExperienceLevel = (years: number) => {
    if (years === 0) return 'Entry Level';
    if (years <= 2) return 'Junior';
    if (years <= 5) return 'Mid Level';
    if (years <= 10) return 'Senior';
    return 'Expert';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidate Management</h1>
              <p className="text-gray-600">Manage your talent pool and candidate database</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter size={20} />
                Filters
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Upload size={20} />
                Import
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#1C4DA1] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search candidates by name, email, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
              />
            </div>
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedCandidates.length} selected</span>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.experience_min || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, experience_min: parseInt(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.experience_max || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, experience_max: parseInt(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="City or region"
                  value={filters.location || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                <select
                  multiple
                  value={filters.education_level || []}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    education_level: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                >
                  <option value="high_school">High School</option>
                  <option value="bachelor">Bachelor's</option>
                  <option value="master">Master's</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.salary_min || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, salary_min: parseInt(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.salary_max || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, salary_max: parseInt(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#1C4DA1] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({})}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Candidates List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Candidates ({candidates.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('export')}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <Download size={16} />
                  Export All
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4DA1] mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center">
              <Award size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No candidates found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.length === candidates.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCandidates(candidates.map(c => c.id));
                          } else {
                            setSelectedCandidates([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#1C4DA1] focus:ring-[#1C4DA1]"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates(prev => [...prev, candidate.id]);
                            } else {
                              setSelectedCandidates(prev => prev.filter(id => id !== candidate.id));
                            }
                          }}
                          className="rounded border-gray-300 text-[#1C4DA1] focus:ring-[#1C4DA1]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-[#1C4DA1] flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {candidate.first_name[0]}{candidate.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {candidate.first_name} {candidate.last_name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={12} />
                              {candidate.email}
                            </div>
                            {candidate.phone && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone size={12} />
                                {candidate.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{candidate.experience_years} years</div>
                        <div className="text-sm text-gray-500">{getExperienceLevel(candidate.experience_years)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MapPin size={12} />
                          {candidate.current_location || 'Not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{candidate.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.is_blacklisted ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle size={12} className="mr-1" />
                            Blacklisted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingCandidate(candidate)}
                            className="text-[#1C4DA1] hover:text-blue-700 transition-colors"
                            title="View/Edit"
                          >
                            <Eye size={16} />
                          </button>
                          {candidate.linkedin_url && (
                            <a
                              href={candidate.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="LinkedIn Profile"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
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
        </div>
      </div>

      {/* Create/Edit Candidate Modal would go here */}
      {/* Implementation details omitted for brevity */}
    </div>
  );
};

export default CandidateManagement;