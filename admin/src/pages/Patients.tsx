import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, User, Phone } from 'lucide-react'

interface Patient {
  id: string
  full_name: string
  age: number
  gender: string
  phone_number: string
  is_synced: boolean
  created_at: string
  villages?: { name: string }
}

export const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchPatients() }, [])

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('beneficiaries')
      .select(`*, villages(name)`)
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setPatients(data as Patient[])
    setLoading(false)
  }

  const filtered = patients.filter(p => {
    const s = search.toLowerCase()
    return !s || p.full_name?.toLowerCase().includes(s) || p.phone_number?.includes(s)
  })

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Registered Patients</div>
            <div className="card-subtitle">{filtered.length} beneficiaries</div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="patients-search"
              className="input"
              placeholder="Search name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 220 }}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Village</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Sync Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(26,107,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={12} color="var(--primary-light)" />
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.full_name}</span>
                      </div>
                    </td>
                    <td>{p.age ?? '—'}</td>
                    <td>
                      <span className={`badge ${p.gender === 'female' ? 'danger' : p.gender === 'male' ? 'info' : 'neutral'}`}>
                        {p.gender ?? '—'}
                      </span>
                    </td>
                    <td>{(p.villages as any)?.name ?? '—'}</td>
                    <td>
                      {p.phone_number ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} color="var(--text-muted)" />
                          {p.phone_number}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`badge ${p.is_synced ? 'success' : 'warning'}`}>
                        {p.is_synced ? 'Synced' : 'Pending'}
                      </span>
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
