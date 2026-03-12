import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Filter, Brain, CheckCircle, Clock } from 'lucide-react'
import type { HealthRecord } from '../lib/supabase'

const RISK_COLORS: Record<string, string> = {
  low: 'success', medium: 'warning', high: 'danger', critical: 'danger'
}

export const Records: React.FC = () => {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSynced, setFilterSynced] = useState('all')

  useEffect(() => {
    fetchRecords()
  }, [filterSynced])

  const fetchRecords = async () => {
    setLoading(true)
    let query = supabase
      .from('health_records')
      .select(`
        *,
        beneficiaries(full_name, age, gender),
        healthcare_workers(full_name),
        villages(name),
        ai_analysis_results(risk_level, risk_summary, possible_conditions)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filterSynced === 'synced') query = query.eq('is_synced', true)
    if (filterSynced === 'pending') query = query.eq('is_synced', false)

    const { data, error } = await query
    if (!error && data) setRecords(data as unknown as HealthRecord[])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const name = (r.beneficiaries as Beneficiary | undefined)?.full_name?.toLowerCase() ?? ''
    const village = (r.villages as { name: string } | undefined)?.name?.toLowerCase() ?? ''
    const s = search.toLowerCase()
    return !s || name.includes(s) || village.includes(s)
  })

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Health Records</div>
            <div className="card-subtitle">{filtered.length} records found</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="records-search"
                className="input"
                placeholder="Search patient or village..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: 220 }}
              />
            </div>
            <select id="records-filter" className="select" value={filterSynced} onChange={e => setFilterSynced(e.target.value)}>
              <option value="all">All Records</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending Sync</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Filter size={32} />
            <p>No records found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Village</th>
                  <th>Visit Date</th>
                  <th>Symptoms</th>
                  <th>BP</th>
                  <th>Temp</th>
                  <th>AI Risk</th>
                  <th>Sync</th>
                  <th>AI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const patient = r.beneficiaries as any
                  const village = r.villages as any
                  const worker = r.healthcare_workers as any
                  const ai = r.ai_analysis_results as any
                  const aiResult = Array.isArray(ai) ? ai[0] : ai
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{patient?.full_name ?? 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{patient?.age}y {patient?.gender}</div>
                      </td>
                      <td>{village?.name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.visit_date ? new Date(r.visit_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <div style={{ maxWidth: 180, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.symptoms_text || (r.symptom_tags?.join(', ')) || '—'}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {r.blood_pressure_systolic ? `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}` : '—'}
                      </td>
                      <td>{r.temperature_celsius ? `${r.temperature_celsius}°C` : '—'}</td>
                      <td>
                        {aiResult?.risk_level ? (
                          <span className={`badge ${RISK_COLORS[aiResult.risk_level] || 'neutral'}`}>
                            {aiResult.risk_level}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {r.is_synced
                          ? <CheckCircle size={14} color="var(--success)" />
                          : <Clock size={14} color="var(--warning)" />}
                      </td>
                      <td>
                        {r.ai_analyzed
                          ? <Brain size={14} color="var(--info)" />
                          : <Brain size={14} color="var(--text-muted)" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

type Beneficiary = { full_name: string; age: number; gender: string }
