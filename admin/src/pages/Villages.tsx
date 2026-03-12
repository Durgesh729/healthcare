import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface VillageData {
  id: string
  name: string
  district: string
  taluka: string
  patient_count: number
  record_count: number
}

export const Villages: React.FC = () => {
  const [villages, setVillages] = useState<VillageData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchVillages() }, [])

  const fetchVillages = async () => {
    const { data: vData } = await supabase.from('villages').select('*').order('name')
    if (!vData) { setLoading(false); return }

    const { data: bData } = await supabase.from('beneficiaries').select('village_id')
    const { data: rData } = await supabase.from('health_records').select('village_id')

    const pCount: Record<string, number> = {}
    const rCount: Record<string, number> = {}
    bData?.forEach(b => { if (b.village_id) pCount[b.village_id] = (pCount[b.village_id] || 0) + 1 })
    rData?.forEach(r => { if (r.village_id) rCount[r.village_id] = (rCount[r.village_id] || 0) + 1 })

    setVillages(vData.map(v => ({ ...v, patient_count: pCount[v.id] || 0, record_count: rCount[v.id] || 0 })))
    setLoading(false)
  }

  const chartData = villages.slice(0, 8).map(v => ({ name: v.name, patients: v.patient_count, records: v.record_count }))

  return (
    <div className="page-content">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Village-wise Health Overview</div>
            <div className="card-subtitle">Patient and record distribution across all villages</div>
          </div>
        </div>
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="patients" fill="#1a6b4a" radius={[4, 4, 0, 0]} name="Patients" />
              <Bar dataKey="records" fill="#58a6ff" radius={[4, 4, 0, 0]} name="Records" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Village Directory</div>
        </div>
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Village</th>
                  <th>District</th>
                  <th>Taluka</th>
                  <th>Patients</th>
                  <th>Records</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {villages.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={13} color="var(--primary-light)" />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.name}</span>
                      </div>
                    </td>
                    <td>{v.district || '—'}</td>
                    <td>{v.taluka || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.patient_count}</td>
                    <td>{v.record_count}</td>
                    <td>
                      <div className="stats-bar">
                        <div className="stats-bar-fill">
                          <div className="stats-bar-fill-inner" style={{ width: `${Math.min(v.patient_count * 10, 100)}%`, background: 'var(--primary-light)' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 30 }}>{v.patient_count}</span>
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
  )
}
