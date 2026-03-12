import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Search, AlertTriangle, CheckCircle, XCircle, Clock,
  User, MapPin, Phone, Calendar, Eye, Users
} from 'lucide-react'

interface Beneficiary {
  id: string
  name: string
  age: number
  gender: string
  phone: string | null
  village_id: string
  villages?: { name: string }[]
  created_at: string
}

interface DuplicateRecord {
  id: string
  new_beneficiary_id: string
  existing_beneficiary_id: string | null
  match_fields: string[]
  match_score: number
  status: 'pending' | 'confirmed' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
  new_beneficiary?: Beneficiary
  existing_beneficiary?: Beneficiary
}

const STATUS_CONFIG: Record<DuplicateRecord['status'], { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: '#f59e0b', icon: Clock },
  confirmed: { label: 'Confirmed Duplicate', color: '#10b981', icon: CheckCircle },
  rejected: { label: 'Not a Duplicate', color: '#6b7280', icon: XCircle },
}

const MATCH_FIELD_LABELS: Record<string, string> = {
  name: 'Name Match',
  name_partial: 'Partial Name',
  phone: 'Phone Match',
  village: 'Same Village',
  age: 'Same Age',
}

export const Duplicates: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<DuplicateRecord['status'] | 'all'>('pending')
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateRecord | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [actionNotes, setActionNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchDuplicates()
  }, [filterStatus])

  const fetchDuplicates = async () => {
    try {
      let query = supabase
        .from('duplicate_records')
        .select(`
          *,
          new_beneficiary:new_beneficiary_id(id, name, age, gender, phone, village_id, villages(name), created_at),
          existing_beneficiary:existing_beneficiary_id(id, name, age, gender, phone, village_id, villages(name), created_at)
        `)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setDuplicates(data || [])
    } catch (error) {
      console.error('Error fetching duplicates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (duplicate: DuplicateRecord, action: 'confirmed' | 'rejected') => {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('duplicate_records')
        .update({
          status: action,
          reviewed_by: null, // Would be admin user ID
          reviewed_at: new Date().toISOString(),
          notes: actionNotes || null
        })
        .eq('id', duplicate.id)

      if (error) throw error

      // If confirmed duplicate, optionally mark the new beneficiary as inactive
      if (action === 'confirmed') {
        // Could add logic to mark beneficiary as duplicate/inactive
      }

      setDuplicates(duplicates.map(d => 
        d.id === duplicate.id 
          ? { ...d, status: action, notes: actionNotes || null, reviewed_at: new Date().toISOString() }
          : d
      ))
      setShowDetails(false)
      setActionNotes('')
    } catch (error) {
      console.error('Error updating duplicate status:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#ef4444'
    if (score >= 60) return '#f59e0b'
    if (score >= 40) return '#eab308'
    return '#6b7280'
  }

  const filteredDuplicates = duplicates.filter(d => {
    const searchLower = searchQuery.toLowerCase()
    return (
      d.new_beneficiary?.name.toLowerCase().includes(searchLower) ||
      d.existing_beneficiary?.name.toLowerCase().includes(searchLower) ||
      d.new_beneficiary?.phone?.includes(searchLower) ||
      d.existing_beneficiary?.phone?.includes(searchLower)
    )
  })

  const getStatusCounts = () => {
    const counts = { all: duplicates.length, pending: 0, confirmed: 0, rejected: 0 }
    duplicates.forEach(d => {
      counts[d.status]++
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Duplicate Review</h1>
          <p className="page-subtitle">Review and resolve potential duplicate beneficiary records</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge pending">
            <Clock size={14} />
            {statusCounts.pending} Pending
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="status-tabs">
        {(['all', 'pending', 'confirmed', 'rejected'] as const).map(status => (
          <button
            key={status}
            className={`status-tab ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'all' ? 'All Records' : STATUS_CONFIG[status].label}
            <span className="count">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Duplicates List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading duplicate records...</p>
        </div>
      ) : filteredDuplicates.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} />
          <h3>No duplicate records found</h3>
          <p>{filterStatus === 'pending' ? 'All potential duplicates have been reviewed' : 'No records match the current filter'}</p>
        </div>
      ) : (
        <div className="duplicates-list">
          {filteredDuplicates.map(duplicate => {
            const statusConfig = STATUS_CONFIG[duplicate.status]
            const StatusIcon = statusConfig.icon
            const scoreColor = getScoreColor(duplicate.match_score)

            return (
              <div key={duplicate.id} className="duplicate-card">
                <div className="duplicate-header">
                  <div className="match-score" style={{ backgroundColor: scoreColor + '20', color: scoreColor }}>
                    {duplicate.match_score}% Match
                  </div>
                  <div className="status-badge" style={{ backgroundColor: statusConfig.color + '20', color: statusConfig.color }}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </div>
                </div>

                <div className="beneficiaries-comparison">
                  <div className="beneficiary-card new">
                    <div className="beneficiary-label">New Record</div>
                    <div className="beneficiary-info">
                      <User size={20} />
                      <div className="beneficiary-details">
                        <span className="beneficiary-name">{duplicate.new_beneficiary?.name}</span>
                        <div className="beneficiary-meta">
                          <span>{duplicate.new_beneficiary?.age} yrs, {duplicate.new_beneficiary?.gender}</span>
                        </div>
                      </div>
                    </div>
                    <div className="beneficiary-extra">
                      {duplicate.new_beneficiary?.phone && (
                        <div className="meta-item">
                          <Phone size={12} />
                          {duplicate.new_beneficiary.phone}
                        </div>
                      )}
                      <div className="meta-item">
                        <MapPin size={12} />
                        {duplicate.new_beneficiary?.villages?.[0]?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  <div className="comparison-arrow">
                    <Users size={20} />
                  </div>

                  <div className="beneficiary-card existing">
                    <div className="beneficiary-label">Existing Record</div>
                    <div className="beneficiary-info">
                      <User size={20} />
                      <div className="beneficiary-details">
                        <span className="beneficiary-name">{duplicate.existing_beneficiary?.name || 'Unknown'}</span>
                        <div className="beneficiary-meta">
                          <span>{duplicate.existing_beneficiary?.age || '-'} yrs, {duplicate.existing_beneficiary?.gender || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="beneficiary-extra">
                      {duplicate.existing_beneficiary?.phone && (
                        <div className="meta-item">
                          <Phone size={12} />
                          {duplicate.existing_beneficiary.phone}
                        </div>
                      )}
                      <div className="meta-item">
                        <MapPin size={12} />
                        {duplicate.existing_beneficiary?.villages?.[0]?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="match-fields">
                  {duplicate.match_fields.map(field => (
                    <span key={field} className="match-field-tag">
                      {MATCH_FIELD_LABELS[field] || field}
                    </span>
                  ))}
                </div>

                <div className="duplicate-footer">
                  <span className="created-date">
                    <Calendar size={12} />
                    {new Date(duplicate.created_at).toLocaleDateString()}
                  </span>
                  {duplicate.status === 'pending' && (
                    <div className="action-buttons">
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedDuplicate(duplicate)
                          setShowDetails(true)
                        }}
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </div>
                  )}
                  {duplicate.status !== 'pending' && duplicate.notes && (
                    <span className="review-notes">Note: {duplicate.notes}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {showDetails && selectedDuplicate && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Duplicate</h2>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert-banner">
                <AlertTriangle size={20} />
                <div>
                  <strong>Potential Duplicate Detected</strong>
                  <p>Please review the records carefully before making a decision.</p>
                </div>
              </div>

              <div className="comparison-detailed">
                <div className="record-section">
                  <h4>New Record</h4>
                  <div className="record-details">
                    <div className="detail-row">
                      <span className="label">Name:</span>
                      <span className="value">{selectedDuplicate.new_beneficiary?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Age/Gender:</span>
                      <span className="value">{selectedDuplicate.new_beneficiary?.age} years, {selectedDuplicate.new_beneficiary?.gender}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{selectedDuplicate.new_beneficiary?.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Village:</span>
                      <span className="value">{selectedDuplicate.new_beneficiary?.villages?.[0]?.name || 'Unknown'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Created:</span>
                      <span className="value">{new Date(selectedDuplicate.new_beneficiary?.created_at || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="record-section">
                  <h4>Existing Record</h4>
                  <div className="record-details">
                    <div className="detail-row">
                      <span className="label">Name:</span>
                      <span className="value">{selectedDuplicate.existing_beneficiary?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Age/Gender:</span>
                      <span className="value">{selectedDuplicate.existing_beneficiary?.age} years, {selectedDuplicate.existing_beneficiary?.gender}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{selectedDuplicate.existing_beneficiary?.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Village:</span>
                      <span className="value">{selectedDuplicate.existing_beneficiary?.villages?.[0]?.name || 'Unknown'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Created:</span>
                      <span className="value">{new Date(selectedDuplicate.existing_beneficiary?.created_at || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="match-summary">
                <h4>Match Details</h4>
                <div className="match-score-large" style={{ color: getScoreColor(selectedDuplicate.match_score) }}>
                  {selectedDuplicate.match_score}% Similarity Score
                </div>
                <div className="match-fields-list">
                  {selectedDuplicate.match_fields.map(field => (
                    <div key={field} className="match-field-item">
                      <CheckCircle size={14} />
                      {MATCH_FIELD_LABELS[field] || field}
                    </div>
                  ))}
                </div>
              </div>

              <div className="notes-section">
                <label>Add Notes (Optional)</label>
                <textarea
                  placeholder="Add any notes about this decision..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetails(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction(selectedDuplicate, 'rejected')}
                disabled={processing}
              >
                <XCircle size={16} />
                Not a Duplicate
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleAction(selectedDuplicate, 'confirmed')}
                disabled={processing}
              >
                <CheckCircle size={16} />
                Confirm Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

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

        .header-stats {
          display: flex;
          gap: 12px;
        }

        .stat-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .stat-badge.pending {
          background: var(--warning-bg);
          color: var(--warning);
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
          max-width: 400px;
        }

        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
        }

        .duplicates-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .duplicate-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .duplicate-card:hover {
          border-color: var(--primary);
        }

        .duplicate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .match-score {
          font-size: 14px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .beneficiaries-comparison {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .beneficiary-card {
          flex: 1;
          padding: 16px;
          background: var(--bg-tertiary);
          border-radius: 10px;
        }

        .beneficiary-card.new {
          border-left: 3px solid var(--primary);
        }

        .beneficiary-card.existing {
          border-left: 3px solid var(--success);
        }

        .beneficiary-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .beneficiary-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .beneficiary-info svg {
          color: var(--text-muted);
        }

        .beneficiary-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .beneficiary-meta {
          font-size: 13px;
          color: var(--text-muted);
        }

        .beneficiary-extra {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .comparison-arrow {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .match-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .match-field-tag {
          font-size: 11px;
          padding: 4px 10px;
          background: var(--primary-bg);
          color: var(--primary);
          border-radius: 4px;
        }

        .duplicate-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .created-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .btn-success {
          background: var(--success);
          color: white;
        }

        .btn-danger {
          background: var(--danger);
          color: white;
        }

        .btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .review-notes {
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
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
          max-width: 700px;
          width: 90%;
          max-height: 85vh;
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

        .alert-banner {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: var(--warning-bg);
          color: var(--warning);
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .alert-banner strong {
          display: block;
          margin-bottom: 4px;
        }

        .alert-banner p {
          margin: 0;
          font-size: 13px;
        }

        .comparison-detailed {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .record-section h4 {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .record-details {
          background: var(--bg-secondary);
          border-radius: 10px;
          padding: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .label {
          color: var(--text-muted);
          font-size: 13px;
        }

        .detail-row .value {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
        }

        .match-summary {
          background: var(--bg-secondary);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .match-summary h4 {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--text-muted);
        }

        .match-score-large {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .match-fields-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .match-field-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--success);
        }

        .notes-section {
          margin-bottom: 20px;
        }

        .notes-section label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .notes-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-primary);
          background: var(--bg-secondary);
          resize: vertical;
        }

        .notes-section textarea:focus {
          outline: none;
          border-color: var(--primary);
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
