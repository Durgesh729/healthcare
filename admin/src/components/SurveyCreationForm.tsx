import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  X, Calendar, MapPin, FileText, Check, ChevronRight,
  AlertCircle
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  fields: any[]
  is_system: boolean
}

interface Worker {
  id: string
  full_name: string
  phone_number: string
  designation: string
  assigned_village_id: string
  villages?: { name: string }[]
}

interface SurveyFormData {
  name: string
  description: string
  area_village: string
  start_date: string
  end_date: string
  template_ids: string[]
  assigned_workers: string[]
  status: 'draft' | 'active'
}

interface SurveyCreationFormProps {
  isOpen: boolean
  onClose: () => void
  onSurveyCreated: () => void
  editSurvey?: any
}

export const SurveyCreationForm: React.FC<SurveyCreationFormProps> = ({
  isOpen,
  onClose,
  onSurveyCreated,
  editSurvey
}) => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<SurveyFormData>({
    name: '',
    description: '',
    area_village: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    template_ids: [],
    assigned_workers: [],
    status: 'draft'
  })

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      fetchWorkers()
      if (editSurvey) {
        setFormData({
          name: editSurvey.name,
          description: editSurvey.description || '',
          area_village: editSurvey.area_village,
          start_date: editSurvey.start_date.split('T')[0],
          end_date: editSurvey.end_date.split('T')[0],
          template_ids: editSurvey.template_ids || [],
          assigned_workers: [],
          status: editSurvey.status
        })
      }
    }
  }, [isOpen, editSurvey])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, description, fields, is_system')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('healthcare_workers')
        .select('id, full_name, phone_number, designation, assigned_village_id, villages(name)')
        .eq('is_active', true)

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }

  const updateFormData = (updates: Partial<SurveyFormData>) => {
    setFormData({ ...formData, ...updates })
    setErrors({})
  }

  const toggleTemplate = (templateId: string) => {
    const currentIds = formData.template_ids
    if (currentIds.includes(templateId)) {
      updateFormData({ template_ids: currentIds.filter(id => id !== templateId) })
    } else {
      updateFormData({ template_ids: [...currentIds, templateId] })
    }
  }

  const toggleWorker = (workerId: string) => {
    const currentIds = formData.assigned_workers
    if (currentIds.includes(workerId)) {
      updateFormData({ assigned_workers: currentIds.filter(id => id !== workerId) })
    } else {
      updateFormData({ assigned_workers: [...currentIds, workerId] })
    }
  }

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!formData.name.trim()) newErrors.name = 'Survey name is required'
      if (!formData.area_village.trim()) newErrors.area_village = 'Area/Village is required'
      if (!formData.start_date) newErrors.start_date = 'Start date is required'
      if (!formData.end_date) newErrors.end_date = 'End date is required'
      if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    if (stepNumber === 2) {
      if (formData.template_ids.length === 0) {
        newErrors.templates = 'Select at least one template'
      }
    }

    // Step 3 (worker assignment) is now optional - no validation needed

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    // Skip validation for step 3 since worker assignment is now optional
    if (step === 3 && !validateStep(3)) return
    // For step 2, validate
    if (step === 2 && !validateStep(2)) return

    setLoading(true)
    try {
      // Insert/update survey - let Supabase generate UUID for new surveys
      const surveyData: any = {
        name: formData.name,
        description: formData.description || null,
        area_village: formData.area_village,
        start_date: formData.start_date,
        end_date: formData.end_date,
        template_ids: formData.template_ids,
        created_by: null,
        status: formData.status
      }

      let surveyId: string

      if (editSurvey) {
        surveyId = editSurvey.id
        const { error } = await supabase
          .from('surveys')
          .update({ ...surveyData, updated_at: new Date().toISOString() })
          .eq('id', surveyId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('surveys')
          .insert(surveyData)
          .select('id')
          .single()
        if (error) throw error
        surveyId = data.id
      }

      // Worker assignments are now optional - surveys are visible to all workers
      // No need to create individual assignments

      onSurveyCreated()
      handleClose()
    } catch (error) {
      console.error('Error saving survey:', error)
      setErrors({ submit: 'Failed to save survey. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setFormData({
      name: '',
      description: '',
      area_village: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      template_ids: [],
      assigned_workers: [],
      status: 'draft'
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal survey-creation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editSurvey ? 'Edit Survey' : 'Create New Survey'}</h2>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">{step > 1 ? <Check size={14} /> : 1}</div>
            <span>Details</span>
          </div>
          <div className="step-line" />
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span>Templates</span>
          </div>
        </div>

        <div className="modal-body">
          {errors.submit && (
            <div className="error-banner">
              <AlertCircle size={16} />
              {errors.submit}
            </div>
          )}

          {/* Step 1: Basic Details */}
          {step === 1 && (
            <div className="form-step">
              <div className="form-group">
                <label>Survey Name *</label>
                <input
                  type="text"
                  placeholder="Enter survey name..."
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Describe the purpose of this survey..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><MapPin size={14} /> Area/Village *</label>
                  <input
                    type="text"
                    placeholder="e.g., Ward 5, Village Name"
                    value={formData.area_village}
                    onChange={(e) => updateFormData({ area_village: e.target.value })}
                    className={errors.area_village ? 'error' : ''}
                  />
                  {errors.area_village && <span className="error-text">{errors.area_village}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Calendar size={14} /> Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateFormData({ start_date: e.target.value })}
                    className={errors.start_date ? 'error' : ''}
                  />
                  {errors.start_date && <span className="error-text">{errors.start_date}</span>}
                </div>
                <div className="form-group">
                  <label><Calendar size={14} /> End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => updateFormData({ end_date: e.target.value })}
                    className={errors.end_date ? 'error' : ''}
                  />
                  {errors.end_date && <span className="error-text">{errors.end_date}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-options">
                  <button
                    type="button"
                    className={`status-option ${formData.status === 'draft' ? 'active' : ''}`}
                    onClick={() => updateFormData({ status: 'draft' })}
                  >
                    <FileText size={16} />
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className={`status-option ${formData.status === 'active' ? 'active' : ''}`}
                    onClick={() => updateFormData({ status: 'active' })}
                  >
                    <Check size={16} />
                    Activate Immediately
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <div className="form-step">
              <p className="step-description">Select templates to include in this survey. All active workers will be able to see and conduct this survey.</p>
              
              {errors.templates && <span className="error-text">{errors.templates}</span>}

              <div className="templates-selection">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`template-select-card ${formData.template_ids.includes(template.id) ? 'selected' : ''}`}
                    onClick={() => toggleTemplate(template.id)}
                  >
                    <div className="template-checkbox">
                      {formData.template_ids.includes(template.id) && <Check size={14} />}
                    </div>
                    <div className="template-info">
                      <div className="template-header">
                        <span className="template-name">{template.name}</span>
                        {template.is_system && <span className="system-badge">System</span>}
                      </div>
                      <p className="template-desc">{template.description || 'No description'}</p>
                      <span className="template-fields">{template.fields?.length || 0} fields</span>
                    </div>
                  </div>
                ))}
              </div>

              {formData.template_ids.length > 0 && (
                <div className="selected-count">
                  {formData.template_ids.length} template(s) selected
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={prevStep}>
              Back
            </button>
          )}
          {step < 2 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : editSurvey ? 'Update Survey' : 'Create Survey'}
            </button>
          )}
        </div>

        <style>{`
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
            width: 90%;
            max-width: 600px;
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
            cursor: pointer;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
          }

          .close-btn:hover {
            background: var(--bg-secondary);
          }

          .progress-steps {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px 24px;
            background: var(--bg-secondary);
            gap: 8px;
          }

          .progress-step {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-muted);
          }

          .progress-step.active {
            color: var(--primary);
          }

          .progress-step.completed {
            color: var(--success);
          }

          .step-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid currentColor;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
          }

          .progress-step.active .step-number {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
          }

          .progress-step.completed .step-number {
            background: var(--success);
            border-color: var(--success);
            color: white;
          }

          .progress-step span {
            font-size: 13px;
            font-weight: 500;
          }

          .step-line {
            width: 40px;
            height: 2px;
            background: var(--border);
          }

          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }

          .error-banner {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: var(--danger-bg);
            color: var(--danger);
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 14px;
          }

          .form-step {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .step-description {
            font-size: 14px;
            color: var(--text-muted);
            margin: 0 0 16px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .form-group label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
          }

          .form-group input,
          .form-group textarea {
            padding: 10px 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 14px;
            color: var(--text-primary);
            background: var(--bg-secondary);
            transition: border-color 0.2s;
          }

          .form-group input:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
          }

          .form-group input.error,
          .form-group textarea.error {
            border-color: var(--danger);
          }

          .form-group textarea {
            resize: vertical;
            min-height: 80px;
          }

          .error-text {
            font-size: 12px;
            color: var(--danger);
          }

          .form-row {
            display: flex;
            gap: 16px;
          }

          .form-row .form-group {
            flex: 1;
          }

          .status-options {
            display: flex;
            gap: 12px;
          }

          .status-option {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            border: 1px solid var(--border);
            background: var(--bg-secondary);
            border-radius: 8px;
            font-size: 14px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
          }

          .status-option:hover {
            border-color: var(--primary);
          }

          .status-option.active {
            border-color: var(--primary);
            background: var(--primary-bg);
            color: var(--primary);
          }

          .templates-selection,
          .workers-selection {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
          }

          .template-select-card,
          .worker-select-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px;
            border: 1px solid var(--border);
            background: var(--bg-secondary);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .template-select-card:hover,
          .worker-select-card:hover {
            border-color: var(--primary);
          }

          .template-select-card.selected,
          .worker-select-card.selected {
            border-color: var(--primary);
            background: var(--primary-bg);
          }

          .template-checkbox,
          .worker-checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
          }

          .template-select-card.selected .template-checkbox,
          .worker-select-card.selected .worker-checkbox {
            background: var(--primary);
            border-color: var(--primary);
          }

          .template-info {
            flex: 1;
          }

          .template-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }

          .template-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .system-badge {
            font-size: 10px;
            padding: 2px 6px;
            background: var(--success-bg);
            color: var(--success);
            border-radius: 4px;
            font-weight: 500;
          }

          .template-desc {
            font-size: 12px;
            color: var(--text-muted);
            margin: 0 0 4px;
          }

          .template-fields {
            font-size: 11px;
            color: var(--text-muted);
          }

          .worker-avatar {
            width: 36px;
            height: 36px;
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

          .worker-info {
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .worker-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
          }

          .worker-village {
            font-size: 12px;
            color: var(--text-muted);
          }

          .selected-count {
            text-align: center;
            padding: 10px;
            background: var(--primary-bg);
            color: var(--primary);
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            margin-top: 12px;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid var(--border);
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
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

          .btn-primary:hover:not(:disabled) {
            background: var(--primary-dark);
          }

          .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border);
          }

          .btn-secondary:hover {
            background: var(--bg-tertiary);
          }
        `}</style>
      </div>
    </div>
  )
}
