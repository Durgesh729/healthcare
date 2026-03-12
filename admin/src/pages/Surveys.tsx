import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SurveyCreationForm } from '../components/SurveyCreationForm'
import { 
  Plus, Search, MoreVertical, Calendar, Users, MapPin, 
  Play, CheckCircle, XCircle, Clock, ClipboardList,
  Eye, Pencil, Trash2
} from 'lucide-react'

interface Survey {
  id: string
  name: string
  description: string | null
  area_village: string
  start_date: string
  end_date: string
  template_ids: string[]
  created_by: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  template_names?: string[]
  assignment_count?: number
  submission_count?: number
}

const STATUS_CONFIG: Record<Survey['status'], { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: '#6b7280', icon: Clock },
  active: { label: 'Active', color: '#10b981', icon: Play },
  completed: { label: 'Completed', color: '#3b82f6', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: XCircle },
}

export const Surveys: React.FC = () => {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<Survey['status'] | 'all'>('all')
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_assignments(count),
          survey_submissions(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const surveysWithCounts = (data || []).map(survey => ({
        ...survey,
        assignment_count: survey.survey_assignments?.[0]?.count || 0,
        submission_count: survey.survey_submissions?.[0]?.count || 0,
      }))
      
      setSurveys(surveysWithCounts)
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSurveyStatus = async (id: string, status: Survey['status']) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      setSurveys(surveys.map(s => s.id === id ? { ...s, status } : s))
      setActiveMenu(null)
    } catch (error) {
      console.error('Error updating survey status:', error)
    }
  }

  const deleteSurvey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSurveys(surveys.filter(s => s.id !== id))
      setActiveMenu(null)
    } catch (error) {
      console.error('Error deleting survey:', error)
    }
  }

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (survey.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      survey.area_village.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || survey.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    const counts: Record<Survey['status'] | 'all', number> = { 
      all: surveys.length,
      draft: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    }
    surveys.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Survey Management</h1>
          <p className="page-subtitle">Create and manage surveys for field workers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
          <Plus size={16} />
          Create Survey
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="status-tabs">
        {(['all', 'draft', 'active', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            className={`status-tab ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'all' ? 'All Surveys' : STATUS_CONFIG[status].label}
            <span className="count">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search surveys by name, description, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Surveys List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading surveys...</p>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <h3>No surveys found</h3>
          <p>Create your first survey to start collecting field data</p>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            <Plus size={16} />
            Create Survey
          </button>
        </div>
      ) : (
        <div className="surveys-list">
          {filteredSurveys.map(survey => {
            const statusConfig = STATUS_CONFIG[survey.status]
            const StatusIcon = statusConfig.icon
            const daysRemaining = getDaysRemaining(survey.end_date)
            
            return (
              <div key={survey.id} className="survey-card">
                <div className="survey-header">
                  <div className="survey-status-badge" style={{ backgroundColor: statusConfig.color + '20', color: statusConfig.color }}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </div>
                  <div className="survey-actions">
                    <button
                      className="action-btn"
                      onClick={() => {
                        setSelectedSurvey(survey)
                        setShowDetails(true)
                      }}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <div className="dropdown">
                      <button
                        className="action-btn"
                        onClick={() => setActiveMenu(activeMenu === survey.id ? null : survey.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenu === survey.id && (
                        <div className="dropdown-menu">
                          {survey.status === 'draft' && (
                            <button onClick={() => updateSurveyStatus(survey.id, 'active')}>
                              <Play size={14} />
                              Activate
                            </button>
                          )}
                          {survey.status === 'active' && (
                            <button onClick={() => updateSurveyStatus(survey.id, 'completed')}>
                              <CheckCircle size={14} />
                              Complete
                            </button>
                          )}
                          <button>
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button className="danger" onClick={() => deleteSurvey(survey.id)}>
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="survey-name">{survey.name}</h3>
                <p className="survey-description">{survey.description || 'No description provided'}</p>

                <div className="survey-meta">
                  <div className="meta-item">
                    <MapPin size={14} />
                    <span>{survey.area_village}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>
                      {new Date(survey.start_date).toLocaleDateString()} - {new Date(survey.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {survey.status === 'active' && daysRemaining > 0 && (
                  <div className="days-remaining">
                    <Clock size={14} />
                    {daysRemaining} days remaining
                  </div>
                )}

                <div className="survey-stats">
                  <div className="stat">
                    <span className="stat-value">{survey.assignment_count || 0}</span>
                    <span className="stat-label">Assignments</span>
                  </div>
                  <div 
                    className="stat clickable" 
                    onClick={() => navigate(`/submissions?survey=${survey.id}`)}
                    title="View submissions"
                  >
                    <span className="stat-value">{survey.submission_count || 0}</span>
                    <span className="stat-label">Submissions</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{survey.template_ids?.length || 0}</span>
                    <span className="stat-label">Templates</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Survey Details Modal */}
      {showDetails && selectedSurvey && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal survey-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSurvey.name}</h2>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>Description</h4>
                <p>{selectedSurvey.description || 'No description provided'}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <h4>Status</h4>
                  <div 
                    className="status-badge-large"
                    style={{ 
                      backgroundColor: STATUS_CONFIG[selectedSurvey.status].color + '20',
                      color: STATUS_CONFIG[selectedSurvey.status].color
                    }}
                  >
                    {STATUS_CONFIG[selectedSurvey.status].label}
                  </div>
                </div>
                <div className="detail-item">
                  <h4>Area/Village</h4>
                  <p>{selectedSurvey.area_village}</p>
                </div>
                <div className="detail-item">
                  <h4>Start Date</h4>
                  <p>{new Date(selectedSurvey.start_date).toLocaleDateString()}</p>
                </div>
                <div className="detail-item">
                  <h4>End Date</h4>
                  <p>{new Date(selectedSurvey.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="detail-section">
                <h4>Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <Users size={20} />
                    <div className="stat-info">
                      <span className="stat-number">{selectedSurvey.assignment_count || 0}</span>
                      <span className="stat-text">Worker Assignments</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <ClipboardList size={20} />
                    <div className="stat-info">
                      <span className="stat-number">{selectedSurvey.submission_count || 0}</span>
                      <span className="stat-text">Submissions</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Templates ({selectedSurvey.template_ids?.length || 0})</h4>
                <div className="templates-list">
                  {selectedSurvey.template_names?.map((name, index) => (
                    <div key={index} className="template-tag">
                      {name}
                    </div>
                  )) || <p className="no-data">No templates assigned</p>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetails(false)}>
                Close
              </button>
              {(selectedSurvey.submission_count || 0) > 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    navigate(`/submissions?survey=${selectedSurvey.id}`)
                  }}
                >
                  <ClipboardList size={16} />
                  View {selectedSurvey.submission_count} Submission{selectedSurvey.submission_count !== 1 ? 's' : ''}
                </button>
              )}
              {selectedSurvey.status === 'draft' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    updateSurveyStatus(selectedSurvey.id, 'active')
                    setShowDetails(false)
                  }}
                >
                  <Play size={16} />
                  Activate Survey
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Survey Creation Form */}
      <SurveyCreationForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSurveyCreated={() => {
          fetchSurveys()
          setShowCreateForm(false)
        }}
      />

      <style>{`
        .page-container {
          padding: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
        }

        .btn-primary:hover {
          background: var(--primary-dark);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .status-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .status-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .status-tab .count {
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-tab.active .count {
          background: rgba(255, 255, 255, 0.2);
        }

        .search-bar {
          margin-bottom: 24px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          max-width: 500px;
        }

        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
        }

        .surveys-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }

        .survey-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .survey-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .survey-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .survey-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .survey-actions {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .dropdown {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 140px;
          z-index: 100;
          overflow: hidden;
        }

        .dropdown-menu button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          font-size: 13px;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
        }

        .dropdown-menu button:hover {
          background: var(--bg-tertiary);
        }

        .dropdown-menu button.danger {
          color: var(--danger);
        }

        .survey-name {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .survey-description {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 16px 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .survey-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .days-remaining {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--warning);
          background: var(--warning-bg);
          padding: 6px 10px;
          border-radius: 6px;
          margin-bottom: 16px;
          width: fit-content;
        }

        .survey-stats {
          display: flex;
          gap: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat.clickable {
          cursor: pointer;
          padding: 8px 12px;
          margin: -8px -12px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .stat.clickable:hover {
          background: var(--primary-bg);
        }

        .stat.clickable:hover .stat-value {
          color: var(--primary);
        }

        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .empty-state h3 {
          margin: 16px 0 8px;
          color: var(--text-primary);
        }

        .empty-state p {
          margin-bottom: 20px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: var(--bg-primary);
          border-radius: 16px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .detail-section {
          margin-bottom: 24px;
        }

        .detail-section h4 {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-section p {
          font-size: 14px;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.6;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .detail-item h4 {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0 0 4px 0;
        }

        .detail-item p {
          font-size: 14px;
          color: var(--text-primary);
          margin: 0;
        }

        .status-badge-large {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .stat-card svg {
          color: var(--primary);
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stat-text {
          font-size: 12px;
          color: var(--text-muted);
        }

        .templates-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .template-tag {
          padding: 6px 12px;
          background: var(--primary-bg);
          color: var(--primary);
          border-radius: 6px;
          font-size: 13px;
        }

        .no-data {
          color: var(--text-muted);
          font-size: 13px;
          font-style: italic;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  )
}
