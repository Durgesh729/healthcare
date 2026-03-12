import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Activity, CheckCircle, XCircle } from 'lucide-react'

interface Worker {
  id: string
  full_name: string
  employee_id: string
  phone_number: string
  designation: string
  is_active: boolean
  preferred_language: string
  created_at: string
  villages?: { name: string }
  record_count?: number
}

export const Workers: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchWorkers() }, [])

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('healthcare_workers')
      .select(`*, villages(name)`)
      .order('created_at', { ascending: false })
    if (data) {
      // Fetch record counts per worker
      const workerIds = data.map(w => w.id)
      const { data: rcData } = await supabase
        .from('health_records')
        .select('recorded_by')
        .in('recorded_by', workerIds)

      const countMap: Record<string, number> = {}
      if (rcData) rcData.forEach(r => { countMap[r.recorded_by] = (countMap[r.recorded_by] || 0) + 1 })

      setWorkers(data.map(w => ({ ...w, record_count: countMap[w.id] || 0 })) as Worker[])
    }
    setLoading(false)
  }

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Healthcare Workers</div>
            <div className="card-subtitle">Field operative performance</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <Activity size={14} />
            {workers.filter(w => w.is_active).length} active workers
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : workers.length === 0 ? (
          <div className="empty-state">
            <Activity size={32} />
            <p>No workers registered yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Employee ID</th>
                  <th>Designation</th>
                  <th>Assigned Village</th>
                  <th>Records</th>
                  <th>Language</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workers.map(w => (
                  <tr key={w.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.phone_number || '—'}</div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{w.employee_id || '—'}</td>
                    <td>
                      <span className="badge info">{w.designation || 'Field Worker'}</span>
                    </td>
                    <td>{(w.villages as any)?.name ?? 'Unassigned'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.record_count}</span>
                        <div className="stats-bar">
                          <div className="stats-bar-fill">
                            <div className="stats-bar-fill-inner" style={{ width: `${Math.min((w.record_count || 0) / 50 * 100, 100)}%`, background: 'var(--primary-light)' }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge neutral">{w.preferred_language === 'mr' ? 'Marathi' : 'English'}</span>
                    </td>
                    <td>
                      {w.is_active
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} color="var(--success)" /><span style={{ fontSize: 12, color: 'var(--success)' }}>Active</span></div>
                        : <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={14} color="var(--danger)" /><span style={{ fontSize: 12, color: 'var(--danger)' }}>Inactive</span></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
