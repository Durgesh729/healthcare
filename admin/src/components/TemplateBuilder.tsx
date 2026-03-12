import React, { useState } from 'react'
import { 
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Type, Hash, List, ListChecks, Calendar, AlignLeft,
  CheckSquare, Circle, Camera, PenTool, Settings, Save, X
} from 'lucide-react'

export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'textarea' | 'checkbox' | 'radio' | 'photo' | 'signature'
  required: boolean
  options?: string[]
  validation?: { min?: number; max?: number; pattern?: string }
  placeholder?: string
}

interface TemplateBuilderProps {
  initialFields?: TemplateField[]
  onSave: (fields: TemplateField[]) => void
  onCancel: () => void
  templateName?: string
}

const FIELD_TYPES: { type: TemplateField['type']; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'text', label: 'Text Input', icon: Type, description: 'Single line text field' },
  { type: 'number', label: 'Number Input', icon: Hash, description: 'Numeric input field' },
  { type: 'select', label: 'Dropdown', icon: List, description: 'Single selection dropdown' },
  { type: 'multiselect', label: 'Multi-Select', icon: ListChecks, description: 'Multiple selection checkboxes' },
  { type: 'date', label: 'Date Picker', icon: Calendar, description: 'Date selection field' },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft, description: 'Multi-line text field' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Single checkbox field' },
  { type: 'radio', label: 'Radio Buttons', icon: Circle, description: 'Single choice radio buttons' },
  { type: 'photo', label: 'Photo Capture', icon: Camera, description: 'Camera/photo capture field' },
  { type: 'signature', label: 'Signature Pad', icon: PenTool, description: 'Digital signature capture' },
]

const generateId = () => Math.random().toString(36).substr(2, 9)

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  initialFields = [],
  onSave,
  onCancel,
  templateName = 'New Template'
}) => {
  const [fields, setFields] = useState<TemplateField[]>(initialFields)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [expandedField, setExpandedField] = useState<string | null>(null)

  const addField = (type: TemplateField['type']) => {
    const newField: TemplateField = {
      id: generateId(),
      label: '',
      type,
      required: false,
      options: ['select', 'multiselect', 'radio'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
      placeholder: '',
      validation: type === 'number' ? { min: undefined, max: undefined } : undefined,
    }
    setFields([...fields, newField])
    setShowFieldPicker(false)
    setExpandedField(newField.id)
  }

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields]
    const [removed] = newFields.splice(fromIndex, 1)
    newFields.splice(toIndex, 0, removed)
    setFields(newFields)
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      moveField(dragIndex, index)
      setDragIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (field?.options) {
      updateField(fieldId, { options: [...field.options, `Option ${field.options.length + 1}`] })
    }
  }

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (field?.options) {
      const newOptions = [...field.options]
      newOptions[optionIndex] = value
      updateField(fieldId, { options: newOptions })
    }
  }

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId)
    if (field?.options && field.options.length > 2) {
      const newOptions = field.options.filter((_, i) => i !== optionIndex)
      updateField(fieldId, { options: newOptions })
    }
  }

  const handleSave = () => {
    const validFields = fields.filter(f => f.label.trim() !== '')
    onSave(validFields)
  }

  const getFieldTypeInfo = (type: TemplateField['type']) => {
    return FIELD_TYPES.find(ft => ft.type === type)!
  }

  return (
    <div className="template-builder">
      <div className="builder-header">
        <div className="header-info">
          <h2>Template Builder</h2>
          <p>{templateName} • {fields.length} fields</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            <X size={16} />
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={fields.length === 0}>
            <Save size={16} />
            Save Template
          </button>
        </div>
      </div>

      <div className="builder-content">
        <div className="fields-list">
          {fields.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Settings size={32} />
              </div>
              <h3>No fields added yet</h3>
              <p>Click "Add Field" to start building your template</p>
            </div>
          ) : (
            fields.map((field, index) => {
              const typeInfo = getFieldTypeInfo(field.type)
              const TypeIcon = typeInfo.icon
              const isExpanded = expandedField === field.id

              return (
                <div
                  key={field.id}
                  className={`field-card ${dragIndex === index ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="field-header">
                    <div className="field-drag-handle">
                      <GripVertical size={16} />
                    </div>
                    <div className="field-type-icon">
                      <TypeIcon size={16} />
                    </div>
                    <div className="field-number">{index + 1}</div>
                    <input
                      type="text"
                      className="field-label-input"
                      placeholder="Field label..."
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />
                    <div className="field-type-badge">{typeInfo.label}</div>
                    <div className="field-actions">
                      <button
                        className="action-btn"
                        onClick={() => setExpandedField(isExpanded ? null : field.id)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => removeField(field.id)}
                        title="Remove field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="field-config">
                      <div className="config-row">
                        <div className="config-field">
                          <label>Placeholder Text</label>
                          <input
                            type="text"
                            placeholder="Enter placeholder..."
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          />
                        </div>
                        <div className="config-field checkbox-field">
                          <label>
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            />
                            Required field
                          </label>
                        </div>
                      </div>

                      {['select', 'multiselect', 'radio'].includes(field.type) && field.options && (
                        <div className="options-section">
                          <label>Options</label>
                          <div className="options-list">
                            {field.options.map((option, optIndex) => (
                              <div key={optIndex} className="option-item">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(field.id, optIndex, e.target.value)}
                                />
                                {field.options!.length > 2 && (
                                  <button
                                    className="remove-option-btn"
                                    onClick={() => removeOption(field.id, optIndex)}
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button className="add-option-btn" onClick={() => addOption(field.id)}>
                              <Plus size={14} />
                              Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      {field.type === 'number' && (
                        <div className="config-row">
                          <div className="config-field">
                            <label>Minimum Value</label>
                            <input
                              type="number"
                              placeholder="No minimum"
                              value={field.validation?.min ?? ''}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined }
                              })}
                            />
                          </div>
                          <div className="config-field">
                            <label>Maximum Value</label>
                            <input
                              type="number"
                              placeholder="No maximum"
                              value={field.validation?.max ?? ''}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined }
                              })}
                            />
                          </div>
                        </div>
                      )}

                      {field.type === 'text' && (
                        <div className="config-field">
                          <label>Validation Pattern (Regex)</label>
                          <input
                            type="text"
                            placeholder="e.g., ^[A-Za-z]+$ for letters only"
                            value={field.validation?.pattern || ''}
                            onChange={(e) => updateField(field.id, {
                              validation: { ...field.validation, pattern: e.target.value || undefined }
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="add-field-section">
          {showFieldPicker ? (
            <div className="field-picker">
              <h4>Select Field Type</h4>
              <div className="field-types-grid">
                {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
                  <button
                    key={type}
                    className="field-type-btn"
                    onClick={() => addField(type)}
                  >
                    <Icon size={20} />
                    <div className="field-type-info">
                      <span className="field-type-label">{label}</span>
                      <span className="field-type-desc">{description}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button className="cancel-picker-btn" onClick={() => setShowFieldPicker(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="add-field-btn" onClick={() => setShowFieldPicker(true)}>
              <Plus size={16} />
              Add Field
            </button>
          )}
        </div>
      </div>

      <style>{`
        .template-builder {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary);
        }

        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .header-info h2 {
          margin: 0;
          font-size: 18px;
          color: var(--text-primary);
        }

        .header-info p {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--text-muted);
        }

        .header-actions {
          display: flex;
          gap: 12px;
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

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-dark);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover {
          background: var(--bg-secondary);
        }

        .builder-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .fields-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: var(--bg-secondary);
          border: 2px dashed var(--border);
          border-radius: 12px;
          color: var(--text-muted);
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          background: var(--bg-tertiary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px;
          color: var(--text-primary);
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .field-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          transition: all 0.2s;
        }

        .field-card:hover {
          border-color: var(--primary);
        }

        .field-card.dragging {
          opacity: 0.5;
          border-color: var(--primary);
        }

        .field-card.expanded {
          border-color: var(--primary);
        }

        .field-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }

        .field-drag-handle {
          color: var(--text-muted);
          cursor: grab;
        }

        .field-drag-handle:active {
          cursor: grabbing;
        }

        .field-type-icon {
          width: 32px;
          height: 32px;
          background: var(--primary-bg);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .field-number {
          width: 24px;
          height: 24px;
          background: var(--bg-tertiary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .field-label-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 15px;
          color: var(--text-primary);
          outline: none;
        }

        .field-label-input::placeholder {
          color: var(--text-muted);
        }

        .field-type-badge {
          font-size: 11px;
          padding: 4px 8px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: 4px;
          font-weight: 500;
        }

        .field-actions {
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

        .action-btn.danger:hover {
          background: var(--danger-bg);
          color: var(--danger);
        }

        .field-config {
          padding: 16px;
          border-top: 1px solid var(--border);
          background: var(--bg-tertiary);
        }

        .config-row {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .config-row:last-child {
          margin-bottom: 0;
        }

        .config-field {
          flex: 1;
        }

        .config-field label {
          display: block;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .config-field input[type="text"],
        .config-field input[type="number"] {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .config-field input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .checkbox-field label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-field input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .options-section {
          margin-top: 16px;
        }

        .options-section > label {
          display: block;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .option-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .option-item input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .option-item input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .remove-option-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: var(--danger-bg);
          border-radius: 6px;
          cursor: pointer;
          color: var(--danger);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .add-option-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px dashed var(--border);
          background: transparent;
          border-radius: 6px;
          font-size: 13px;
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-option-btn:hover {
          background: var(--primary-bg);
          border-color: var(--primary);
        }

        .add-field-section {
          margin-top: 20px;
        }

        .add-field-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          border: 2px dashed var(--border);
          background: transparent;
          border-radius: 10px;
          font-size: 15px;
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-field-btn:hover {
          background: var(--primary-bg);
          border-color: var(--primary);
        }

        .field-picker {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }

        .field-picker h4 {
          margin: 0 0 16px;
          font-size: 15px;
          color: var(--text-primary);
        }

        .field-types-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .field-type-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .field-type-btn:hover {
          border-color: var(--primary);
          background: var(--primary-bg);
        }

        .field-type-btn svg {
          color: var(--primary);
          flex-shrink: 0;
        }

        .field-type-info {
          display: flex;
          flex-direction: column;
        }

        .field-type-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .field-type-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        .cancel-picker-btn {
          width: 100%;
          margin-top: 16px;
          padding: 10px;
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .cancel-picker-btn:hover {
          background: var(--bg-secondary);
        }
      `}</style>
    </div>
  )
}
