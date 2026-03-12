import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Search, Eye, Calendar, User, FileText,
  X, CheckCircle, Clock, Users, ArrowLeft,
  ClipboardList, MapPin
} from 'lucide-react'

interface SurveySubmission {
  id: string
  survey_id: string
  survey_name?: string
  survey_area?: string
  assignment_id: string | null
  beneficiary_id: string | null
  worker_id: string
  template_id: string
  template_name?: string
  template_fields?: any[]
  field_data: Record<string, any>
  images: string[] | null
  voice_notes: string[] | null
  latitude: number | null
  longitude: number | null
  submitted_at: string
  is_synced: boolean
  beneficiary?: {
    full_name: string
    age: number
    gender: string
    phone_number: string | null
    village_name?: string
  }
  worker?: {
    full_name: string
    employee_id: string
  }
}

interface SurveyWithSubmissions {
  id: string
  name: string
  description: string | null
  status: string
  area_village: string
  submission_count: number
  template_names?: string[]
}

export const SurveySubmissions: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<SurveyWithSubmissions[]>([])
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([])
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyWithSubmissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<SurveySubmission | null>(null)
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false)

  const surveyIdFromUrl = searchParams.get('survey')

  useEffect(() => {
    if (surveyIdFromUrl) {
      fetchSubmissionsForSurvey(surveyIdFromUrl)
    } else {
      fetchSurveysWithSubmissions()
    }
  }, [surveyIdFromUrl])

  const fetchSurveysWithSubmissions = async () => {
    try {
      setLoading(true)
      
      const { data: surveysData, error: surveysError } = await supabase
        .from('surveys')
        .select(`
          id,
          name,
          description,
          status,
          area_village,
          template_ids,
          survey_submissions(count)
        `)
        .order('created_at', { ascending: false })

      if (surveysError) throw surveysError

      const allTemplateIds = surveysData?.flatMap(s => s.template_ids || []) || []
      const uniqueTemplateIds = [...new Set(allTemplateIds)]
      
      const { data: templateData } = await supabase
        .from('templates')
        .select('id, name')
        .in('id', uniqueTemplateIds)

      const surveysWithCounts = (surveysData || []).map(survey => ({
        id: survey.id,
        name: survey.name,
        description: survey.description,
        status: survey.status,
        area_village: survey.area_village,
        submission_count: survey.survey_submissions?.[0]?.count || 0,
        template_names: survey.template_ids?.map(
          (tid: string) => templateData?.find(t => t.id === tid)?.name
        ).filter(Boolean) || []
      }))

      setSurveys(surveysWithCounts)
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissionsForSurvey = async (surveyId: string) => {
    try {
      setLoading(true)
      
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('id, name, description, status, area_village, template_ids')
        .eq('id', surveyId)
        .single()

      if (surveyData) {
        const { data: templateData } = await supabase
          .from('templates')
          .select('id, name')
          .in('id', surveyData.template_ids || [])

        setSelectedSurvey({
          id: surveyData.id,
          name: surveyData.name,
          description: surveyData.description,
          status: surveyData.status,
          area_village: surveyData.area_village,
          submission_count: 0,
          template_names: templateData?.map(t => t.name) || []
        })
      }

      const { data: submissionsData, error } = await supabase
        .from('survey_submissions')
        .select(`
          id,
          survey_id,
          assignment_id,
          beneficiary_id,
          worker_id,
          template_id,
          field_data,
          images,
          voice_notes,
          latitude,
          longitude,
          submitted_at,
          is_synced
        `)
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const templateIds = [...new Set(submissionsData?.map(s => s.template_id) || [])]
      const { data: templateFieldsData } = await supabase
        .from('templates')
        .select('id, name, fields')
        .in('id', templateIds)

      const beneficiaryIds = [...new Set(submissionsData?.filter(s => s.beneficiary_id).map(s => s.beneficiary_id) || [])]
      const { data: beneficiaryData } = await supabase
        .from('beneficiaries')
        .select(`
          id, 
          full_name, 
          age, 
          gender, 
          phone_number,
          village_id
        `)
        .in('id', beneficiaryIds as string[])

      const villageIds = [...new Set(beneficiaryData?.filter(b => b.village_id).map(b => b.village_id) || [])]
      const { data: villageData } = await supabase
        .from('villages')
        .select('id, name')
        .in('id', villageIds as string[])

      const beneficiaryWithVillage = beneficiaryData?.map(b => ({
        ...b,
        village_name: villageData?.find(v => v.id === b.village_id)?.name
      }))

      const workerIds = [...new Set(submissionsData?.map(s => s.worker_id) || [])]
      const { data: workerData } = await supabase
        .from('healthcare_workers')
        .select('id, full_name, employee_id')
        .in('id', workerIds)

      const enrichedData = submissionsData?.map(submission => {
        const template = templateFieldsData?.find(t => t.id === submission.template_id)
        return {
          ...submission,
          survey_name: selectedSurvey?.name,
          survey_area: selectedSurvey?.area_village,
          template_name: template?.name,
          template_fields: template?.fields || [],
          beneficiary: beneficiaryWithVillage?.find(b => b.id === submission.beneficiary_id) as any,
          worker: workerData?.find(w => w.id === submission.worker_id) as any
        }
      }) || []

      setSubmissions(enrichedData)
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewSurveySubmissions = (survey: SurveyWithSubmissions) => {
    navigate(`/submissions?survey=${survey.id}`)
  }

  const handleBackToSurveys = () => {
    navigate('/submissions')
  }

  const getFieldLabel = (fieldId: string, templateFields: any[] | undefined): string => {
    if (!templateFields) return fieldId
    const field = templateFields.find(f => f.id === fieldId)
    return field?.label || fieldId
  }

  const renderFieldValue = (value: any, fieldType?: string): React.ReactNode => {
    if (value === null || value === undefined) return '-'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    
    // Handle image objects with uri property
    if (value && typeof value === 'object' && value.uri) {
      const imgUrl = value.uri
      if (imgUrl.startsWith('http')) {
        return (
          <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="image-link">
            <img src={imgUrl} alt="Survey image" className="field-image" />
          </a>
        )
      }
      // Local file URI - cannot display
      return (
        <span className="text-muted" style={{ color: '#dc3545' }}>
          ⚠️ Image not uploaded (local file). Re-sync from mobile app.
        </span>
      )
    }
    
    // Check if value is a local file URI (not uploaded)
    if (typeof value === 'string' && (value.startsWith('file://') || value.startsWith('content://'))) {
      return (
        <span className="text-muted" style={{ color: '#dc3545' }}>
          ⚠️ Image not uploaded (local file). Re-sync from mobile app.
        </span>
      )
    }
    
    // Check if value is an image URL
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'))) {
      const isImage = value.match(/\.(jpg|jpeg|png|gif|webp|bmp)/i) || fieldType === 'image' || fieldType === 'photo'
      if (isImage) {
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="image-link">
            <img src={value} alt="Survey image" className="field-image" />
          </a>
        )
      }
    }
    
    return String(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      draft: { label: 'Draft', color: '#6b7280' },
      active: { label: 'Active', color: '#10b981' },
      completed: { label: 'Completed', color: '#3b82f6' },
      cancelled: { label: 'Cancelled', color: '#ef4444' },
    }
    return configs[status] || configs.draft
  }

  const filteredSubmissions = submissions.filter(s => {
    const searchLower = searchQuery.toLowerCase()
    return (
      s.beneficiary?.full_name?.toLowerCase().includes(searchLower) ||
      s.worker?.full_name?.toLowerCase().includes(searchLower) ||
      s.template_name?.toLowerCase().includes(searchLower)
    )
  })

  // Show submissions for a specific survey
  if (selectedSurvey || surveyIdFromUrl) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBackToSurveys}>
              <ArrowLeft size={20} />
              Back to Surveys
            </button>
            <div className="survey-info">
              <h1 className="page-title">{selectedSurvey?.name || 'Loading...'}</h1>
              <p className="page-subtitle">{selectedSurvey?.description || selectedSurvey?.area_village}</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-badge total">
              <ClipboardList size={14} />
              {submissions.length} Submissions
            </div>
          </div>
        </div>

        <div className="filters-row">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by patient or worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No submissions found</h3>
            <p>No survey submissions have been recorded yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Submitted At</th>
                  <th>Patient</th>
                  <th>Worker</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(submission => (
                  <tr key={submission.id}>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} />
                        {formatDate(submission.submitted_at)}
                      </div>
                    </td>
                    <td>
                      {submission.beneficiary ? (
                        <div className="patient-cell">
                          <User size={14} />
                          <div>
                            <span className="patient-name">{submission.beneficiary.full_name}</span>
                            <span className="patient-details">
                              {submission.beneficiary.age} yrs, {submission.beneficiary.gender}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="no-data">No patient linked</span>
                      )}
                    </td>
                    <td>
                      <div className="worker-cell">
                        <Users size={14} />
                        <div>
                          <span className="worker-name">{submission.worker?.full_name || 'Unknown'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="template-name">{submission.template_name}</span>
                    </td>
                    <td>
                      <span className={`sync-badge ${submission.is_synced ? 'synced' : 'pending'}`}>
                        {submission.is_synced ? (
                          <><CheckCircle size={12} /> Synced</>
                        ) : (
                          <><Clock size={12} /> Pending</>
                        )}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-icon"
                        onClick={() => {
                          setSelectedSubmission(submission)
                          setShowSubmissionDetails(true)
                        }}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showSubmissionDetails && selectedSubmission && (
          <div className="modal-overlay" onClick={() => setShowSubmissionDetails(false)}>
            <div className="modal submission-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Submission Details</h2>
                  <p className="modal-subtitle">{selectedSubmission.template_name}</p>
                </div>
                <button className="close-btn" onClick={() => setShowSubmissionDetails(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="meta-grid">
                  <div className="meta-card">
                    <Calendar size={18} />
                    <div>
                      <span className="meta-label">Submitted</span>
                      <span className="meta-value">{formatDate(selectedSubmission.submitted_at)}</span>
                    </div>
                  </div>
                  <div className="meta-card">
                    <User size={18} />
                    <div>
                      <span className="meta-label">Patient</span>
                      <span className="meta-value">
                        {selectedSubmission.beneficiary?.full_name || 'Not linked'}
                        {selectedSubmission.beneficiary?.age && ` (${selectedSubmission.beneficiary.age} yrs, ${selectedSubmission.beneficiary.gender})`}
                      </span>
                    </div>
                  </div>
                  <div className="meta-card">
                    <MapPin size={18} />
                    <div>
                      <span className="meta-label">Village</span>
                      <span className="meta-value">
                        {selectedSubmission.beneficiary?.village_name || selectedSubmission.survey_area || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div className="meta-card">
                    <Users size={18} />
                    <div>
                      <span className="meta-label">Worker</span>
                      <span className="meta-value">
                        {selectedSubmission.worker?.full_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="meta-card">
                    <FileText size={18} />
                    <div>
                      <span className="meta-label">Survey</span>
                      <span className="meta-value">
                        {selectedSubmission.survey_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  {selectedSubmission.latitude && selectedSubmission.longitude && (
                    <div className="meta-card">
                      <MapPin size={18} />
                      <div>
                        <span className="meta-label">Location</span>
                        <span className="meta-value">
                          {selectedSubmission.latitude.toFixed(4)}, {selectedSubmission.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="field-data-section">
                  <h3>Collected Data</h3>
                  <div className="field-list">
                    {Object.entries(selectedSubmission.field_data).map(([fieldId, value]) => {
                      const field = selectedSubmission.template_fields?.find(f => f.id === fieldId)
                      const fieldType = field?.type
                      return (
                        <div key={fieldId} className="field-item">
                          <div className="field-header">
                            <span className="field-label">{getFieldLabel(fieldId, selectedSubmission.template_fields)}</span>
                          </div>
                          <div className="field-value-full">
                            {renderFieldValue(value, fieldType)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {selectedSubmission.images && selectedSubmission.images.length > 0 && (
                  <div className="images-section">
                    <h3>Attached Images</h3>
                    <div className="images-grid">
                      {selectedSubmission.images.map((imgUrl: string, idx: number) => (
                        <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="image-link">
                          <img src={imgUrl} alt={`Image ${idx + 1}`} className="submission-image" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowSubmissionDetails(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .page-container { padding: 24px; }
          .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
          .header-left { display: flex; align-items: flex-start; gap: 16px; }
          .back-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 14px; }
          .back-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
          .survey-info { display: flex; flex-direction: column; }
          .page-title { font-size: 24px; font-weight: 600; color: var(--text-primary); margin: 0; }
          .page-subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
          .header-stats { display: flex; gap: 12px; }
          .stat-badge { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; }
          .stat-badge.total { background: var(--primary-bg); color: var(--primary); }
          .filters-row { display: flex; gap: 16px; margin-bottom: 20px; }
          .search-box { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; flex: 1; max-width: 400px; }
          .search-box input { border: none; background: transparent; outline: none; flex: 1; font-size: 14px; color: var(--text-primary); }
          .table-container { background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
          .data-table { width: 100%; border-collapse: collapse; }
          .data-table th { background: var(--bg-tertiary); padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
          .data-table td { padding: 14px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--text-primary); }
          .data-table tr:hover { background: var(--bg-tertiary); }
          .date-cell { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; }
          .patient-cell, .worker-cell { display: flex; align-items: center; gap: 8px; }
          .patient-name, .worker-name { font-weight: 500; }
          .patient-details { display: block; font-size: 12px; color: var(--text-muted); }
          .no-data { color: var(--text-muted); font-style: italic; }
          .template-name { font-size: 13px; color: var(--text-secondary); }
          .sync-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
          .sync-badge.synced { background: var(--success-bg); color: var(--success); }
          .sync-badge.pending { background: var(--warning-bg); color: var(--warning); }
          .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
          .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); }
          .btn-icon { padding: 8px; background: transparent; color: var(--text-muted); }
          .btn-icon:hover { background: var(--bg-tertiary); color: var(--primary); }
          .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); }
          .empty-state h3 { margin: 16px 0 8px; color: var(--text-primary); }
          .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
          .modal { background: var(--bg-primary); border-radius: 16px; width: 90%; max-width: 600px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
          .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid var(--border); }
          .modal-header h2 { margin: 0; font-size: 18px; color: var(--text-primary); }
          .modal-subtitle { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }
          .close-btn { width: 32px; height: 32px; border: none; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; border-radius: 6px; }
          .close-btn:hover { background: var(--bg-secondary); }
          .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
          .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 24px; }
          .meta-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-secondary); border-radius: 10px; }
          .meta-card svg { color: var(--primary); }
          .meta-label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-value { display: block; font-size: 14px; font-weight: 500; color: var(--text-primary); margin-top: 2px; }
          .field-data-section { margin-bottom: 24px; }
          .field-data-section h3 { font-size: 14px; color: var(--text-primary); margin: 0 0 12px; }
          .field-list { display: flex; flex-direction: column; gap: 8px; }
          .field-item { background: var(--bg-secondary); border-radius: 8px; padding: 12px; }
          .field-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .field-label { font-size: 12px; font-weight: 600; color: var(--primary); background: var(--primary-bg); padding: 2px 8px; border-radius: 4px; }
          .field-value-full { font-size: 14px; color: var(--text-primary); white-space: pre-wrap; }
          .images-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
          .images-section h3 { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; }
          .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
          .image-link { display: block; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
          .image-link:hover { border-color: var(--primary); }
          .field-image { max-width: 200px; max-height: 150px; object-fit: cover; border-radius: 6px; cursor: pointer; }
          .submission-image { width: 100%; height: 120px; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
          .submission-image:hover { transform: scale(1.05); }
          .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border); }
        `}</style>
      </div>
    )
  }

  // Show survey cards
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Survey Submissions</h1>
          <p className="page-subtitle">Select a survey to view its submissions</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading surveys...</p>
        </div>
      ) : surveys.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <h3>No surveys found</h3>
          <p>Create a survey first to see submissions</p>
        </div>
      ) : (
        <div className="surveys-grid">
          {surveys.map(survey => {
            const statusConfig = getStatusConfig(survey.status)
            
            return (
              <div key={survey.id} className="survey-card">
                <div className="survey-header">
                  <div 
                    className="survey-status-badge"
                    style={{ backgroundColor: statusConfig.color + '20', color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </div>
                </div>
                
                <h3 className="survey-name">{survey.name}</h3>
                <p className="survey-description">{survey.description || survey.area_village}</p>
                
                {survey.template_names && survey.template_names.length > 0 && (
                  <div className="templates-row">
                    {survey.template_names.slice(0, 2).map((name, i) => (
                      <span key={i} className="template-tag">{name}</span>
                    ))}
                    {survey.template_names.length > 2 && (
                      <span className="template-more">+{survey.template_names.length - 2}</span>
                    )}
                  </div>
                )}
                
                <div className="survey-footer">
                  <div className="submission-count">
                    <ClipboardList size={16} />
                    <span className="count">{survey.submission_count}</span>
                    <span className="label">Submission{survey.submission_count !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <button 
                    className="view-btn"
                    onClick={() => handleViewSurveySubmissions(survey)}
                    disabled={survey.submission_count === 0}
                  >
                    <Eye size={16} />
                    View
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .page-container { padding: 24px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .page-title { font-size: 24px; font-weight: 600; color: var(--text-primary); margin: 0; }
        .page-subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
        .surveys-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .survey-card { background: var(--bg-secondary); border-radius: 12px; padding: 20px; border: 1px solid var(--border); transition: all 0.2s; }
        .survey-card:hover { border-color: var(--primary); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .survey-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .survey-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .survey-name { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px 0; }
        .survey-description { font-size: 13px; color: var(--text-muted); margin: 0 0 12px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .templates-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
        .template-tag { font-size: 11px; padding: 4px 8px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-secondary); }
        .template-more { font-size: 11px; padding: 4px 8px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-muted); }
        .survey-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border); }
        .submission-count { display: flex; align-items: center; gap: 8px; }
        .submission-count svg { color: var(--primary); }
        .submission-count .count { font-size: 20px; font-weight: 600; color: var(--text-primary); }
        .submission-count .label { font-size: 12px; color: var(--text-muted); }
        .view-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .view-btn:hover { background: var(--primary-dark); }
        .view-btn:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; }
        .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); }
        .empty-state h3 { margin: 16px 0 8px; color: var(--text-primary); }
        .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
