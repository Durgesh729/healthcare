import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Plus, Search, MoreVertical, Copy, Pencil, Trash2, LayoutTemplate, Eye } from 'lucide-react'

interface TemplateField {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'textarea' | 'checkbox' | 'radio' | 'photo' | 'signature'
  required: boolean
  options?: string[]
  validation?: { min?: number; max?: number; pattern?: string }
  placeholder?: string
}

interface Template {
  id: string
  name: string
  description: string | null
  fields: TemplateField[]
  is_system: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

const FIELD_TYPE_LABELS: Record<TemplateField['type'], string> = {
  text: 'Text Input',
  number: 'Number Input',
  select: 'Dropdown',
  multiselect: 'Multi-Select',
  date: 'Date Picker',
  textarea: 'Text Area',
  checkbox: 'Checkbox',
  radio: 'Radio Buttons',
  photo: 'Photo Capture',
  signature: 'Signature Pad',
}

const FIELD_TYPE_COLORS: Record<TemplateField['type'], string> = {
  text: '#3b82f6',
  number: '#10b981',
  select: '#8b5cf6',
  multiselect: '#a855f7',
  date: '#f59e0b',
  textarea: '#6366f1',
  checkbox: '#22c55e',
  radio: '#ec4899',
  photo: '#ef4444',
  signature: '#64748b',
}

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTemplates(templates.filter(t => t.id !== id))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleDuplicate = async (template: Template) => {
    try {
      const newTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        fields: template.fields,
        is_system: false,
        created_by: null,
      }

      const { data, error } = await supabase
        .from('templates')
        .insert(newTemplate)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setTemplates([data, ...templates])
      }
      setActiveMenu(null)
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesFilter = filterType === 'all' ||
      (filterType === 'system' && template.is_system) ||
      (filterType === 'custom' && !template.is_system)
    return matchesSearch && matchesFilter
  })

  const getFieldTypesSummary = (fields: TemplateField[]) => {
    const typeCounts: Record<string, number> = {}
    fields.forEach(f => {
      typeCounts[f.type] = (typeCounts[f.type] || 0) + 1
    })
    return Object.entries(typeCounts).slice(0, 3)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Template Library</h1>
          <p className="page-subtitle">Manage survey templates for field data collection</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Templates
          </button>
          <button
            className={`filter-tab ${filterType === 'system' ? 'active' : ''}`}
            onClick={() => setFilterType('system')}
          >
            System Templates
          </button>
          <button
            className={`filter-tab ${filterType === 'custom' ? 'active' : ''}`}
            onClick={() => setFilterType('custom')}
          >
            Custom Templates
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">
          <LayoutTemplate size={48} />
          <h3>No templates found</h3>
          <p>Create your first template to get started with surveys</p>
          <button className="btn btn-primary">
            <Plus size={16} />
            Create Template
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-card-header">
                <div className="template-icon">
                  <FileText size={20} />
                </div>
                <div className="template-title-section">
                  <h3 className="template-name">{template.name}</h3>
                  {template.is_system && (
                    <span className="system-badge">System</span>
                  )}
                </div>
                <div className="template-actions">
                  <button
                    className="action-btn"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowPreview(true)
                    }}
                    title="Preview"
                  >
                    <Eye size={16} />
                  </button>
                  <div className="dropdown">
                    <button
                      className="action-btn"
                      onClick={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === template.id && (
                      <div className="dropdown-menu">
                        <button onClick={() => handleDuplicate(template)}>
                          <Copy size={14} />
                          Duplicate
                        </button>
                        {!template.is_system && (
                          <>
                            <button>
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              className="danger"
                              onClick={() => setShowDeleteConfirm(template.id)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="template-description">
                {template.description || 'No description provided'}
              </p>

              <div className="template-meta">
                <div className="field-count">
                  <span className="count">{template.fields.length}</span>
                  <span className="label">fields</span>
                </div>
                <div className="field-types">
                  {getFieldTypesSummary(template.fields).map(([type, count]) => (
                    <span
                      key={type}
                      className="field-type-tag"
                      style={{ backgroundColor: FIELD_TYPE_COLORS[type as TemplateField['type']] + '20', color: FIELD_TYPE_COLORS[type as TemplateField['type']] }}
                    >
                      {FIELD_TYPE_LABELS[type as TemplateField['type']]}: {count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="template-footer">
                <span className="date">
                  Updated {new Date(template.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal template-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTemplate.name}</h2>
              <button className="close-btn" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="template-description-full">
                {selectedTemplate.description || 'No description provided'}
              </p>
              <div className="fields-list">
                <h4>Form Fields ({selectedTemplate.fields.length})</h4>
                {selectedTemplate.fields.map((field, index) => (
                  <div key={field.id} className="field-item">
                    <div className="field-number">{index + 1}</div>
                    <div className="field-details">
                      <div className="field-header">
                        <span className="field-label">{field.label}</span>
                        {field.required && <span className="required-badge">Required</span>}
                      </div>
                      <div className="field-type-info">
                        <span
                          className="type-badge"
                          style={{ backgroundColor: FIELD_TYPE_COLORS[field.type] + '20', color: FIELD_TYPE_COLORS[field.type] }}
                        >
                          {FIELD_TYPE_LABELS[field.type]}
                        </span>
                        {field.options && field.options.length > 0 && (
                          <span className="options-count">{field.options.length} options</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => handleDuplicate(selectedTemplate)}>
                <Copy size={16} />
                Use as Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Template</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this template? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>
                Delete
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

        .btn-danger {
          background: var(--danger);
          color: white;
        }

        .filters-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          align-items: center;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          flex: 1;
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

        .filter-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-secondary);
          padding: 4px;
          border-radius: 8px;
        }

        .filter-tab {
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab.active {
          background: var(--primary);
          color: white;
        }

        .filter-tab:hover:not(.active) {
          background: var(--bg-tertiary);
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .template-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .template-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .template-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .template-icon {
          width: 40px;
          height: 40px;
          background: var(--primary-bg);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .template-title-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .template-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .system-badge {
          font-size: 11px;
          padding: 2px 8px;
          background: var(--success-bg);
          color: var(--success);
          border-radius: 4px;
          font-weight: 500;
        }

        .template-actions {
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

        .template-description {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 16px 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .template-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }

        .field-count {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .field-count .count {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .field-count .label {
          font-size: 13px;
          color: var(--text-muted);
        }

        .field-types {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .field-type-tag {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .template-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .date {
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

        .template-description-full {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .fields-list h4 {
          font-size: 14px;
          color: var(--text-primary);
          margin: 0 0 16px 0;
        }

        .field-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .field-number {
          width: 24px;
          height: 24px;
          background: var(--primary-bg);
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .field-details {
          flex: 1;
        }

        .field-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .field-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .required-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: var(--warning-bg);
          color: var(--warning);
          border-radius: 4px;
          font-weight: 500;
        }

        .field-type-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .type-badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .options-count {
          font-size: 12px;
          color: var(--text-muted);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }

        .confirm-modal {
          max-width: 400px;
        }

        .confirm-modal .modal-body p {
          margin: 0;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
