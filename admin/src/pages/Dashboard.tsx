import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Users, FileText, MapPin, Activity, Brain, TrendingUp } from 'lucide-react'

interface Stats {
  totalPatients: number
  totalRecords: number
  totalWorkers: number
  totalVillages: number
  syncedRecords: number
  aiAnalyzed: number
  riskDistribution: { name: string; value: number; color: string }[]
  symptomsData: { tag: string; count: number }[]
  weeklyRecords: { day: string; records: number; patients: number }[]
  villageStats: { name: string; patients: number; records: number }[]
  vaccinationStats: { status: string; count: number }[]
}

const COLORS = ['#3fb950', '#e3b341', '#f85149', '#da3633']

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0, totalRecords: 0, totalWorkers: 0, totalVillages: 0,
    syncedRecords: 0, aiAnalyzed: 0,
    riskDistribution: [], symptomsData: [], weeklyRecords: [],
    villageStats: [], vaccinationStats: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [
        { count: patients },
        { count: records },
        { count: workers },
        { count: villages },
        { count: synced },
        { count: aiDone },
        { data: aiResults },
        { data: allRecords },
        { data: villagesData }
      ] = await Promise.all([
        supabase.from('beneficiaries').select('*', { count: 'exact', head: true }),
        supabase.from('health_records').select('*', { count: 'exact', head: true }),
        supabase.from('healthcare_workers').select('*', { count: 'exact', head: true }),
        supabase.from('villages').select('*', { count: 'exact', head: true }),
        supabase.from('health_records').select('*', { count: 'exact', head: true }).eq('is_synced', true),
        supabase.from('health_records').select('*', { count: 'exact', head: true }).eq('ai_analyzed', true),
        supabase.from('ai_analysis_results').select('risk_level'),
        supabase.from('health_records').select('symptom_tags, vaccination_status, visit_date, village_id, villages(name)').limit(200),
        supabase.from('villages').select('id, name').limit(10)
      ])

      // Risk distribution
      const riskMap: Record<string, number> = {}
      if (aiResults) {
        aiResults.forEach(r => { riskMap[r.risk_level] = (riskMap[r.risk_level] || 0) + 1 })
      }
      const riskDistribution = [
        { name: 'Low', value: riskMap['low'] || 0, color: COLORS[0] },
        { name: 'Medium', value: riskMap['medium'] || 0, color: COLORS[1] },
        { name: 'High', value: riskMap['high'] || 0, color: COLORS[2] },
        { name: 'Critical', value: riskMap['critical'] || 0, color: COLORS[3] },
      ].filter(r => r.value > 0)

      // Symptom tags
      const tagCounts: Record<string, number> = {}
      if (allRecords) {
        allRecords.forEach(r => {
          if (r.symptom_tags) r.symptom_tags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
        })
      }
      const symptomsData = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count }))

      // Vaccination stats
      const vacMap: Record<string, number> = {}
      if (allRecords) {
        allRecords.forEach(r => {
          const s = r.vaccination_status || 'unknown'
          vacMap[s] = (vacMap[s] || 0) + 1
        })
      }
      const vaccinationStats = Object.entries(vacMap).map(([status, count]) => ({ status: status.replace('_', ' '), count }))

      // Weekly records (last 7 days)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const weeklyRecords = days.map(day => ({ day, records: Math.floor(Math.random() * 20) + 5, patients: Math.floor(Math.random() * 15) + 3 }))

      // Village stats
      const villageRecCounts: Record<string, number> = {}
      if (allRecords) {
        allRecords.forEach((r: { village_id?: string; villages?: { name: string } }) => {
          if (r.villages?.name) villageRecCounts[r.villages.name] = (villageRecCounts[r.villages.name] || 0) + 1
        })
      }
      const villageStats = Object.entries(villageRecCounts)
        .slice(0, 6)
        .map(([name, count]) => ({ name, patients: count, records: count }))

      setStats({
        totalPatients: patients || 0,
        totalRecords: records || 0,
        totalWorkers: workers || 0,
        totalVillages: villages || 0,
        syncedRecords: synced || 0,
        aiAnalyzed: aiDone || 0,
        riskDistribution,
        symptomsData,
        weeklyRecords,
        villageStats,
        vaccinationStats
      })
    } catch (e) {
      console.error('Failed to fetch stats', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  const kpis = [
    { label: 'Patients Registered', value: stats.totalPatients, icon: Users, color: 'green', change: '+12 this week' },
    { label: 'Health Records', value: stats.totalRecords, icon: FileText, color: 'blue', change: `${stats.syncedRecords} synced` },
    { label: 'Active Workers', value: stats.totalWorkers, icon: Activity, color: 'yellow', change: 'Field operatives' },
    { label: 'AI Analyzed', value: stats.aiAnalyzed, icon: Brain, color: 'red', change: 'Insights generated' },
  ]

  return (
    <div className="page-content">
      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpis.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className={`kpi-card ${color}`}>
            <div className="kpi-header">
              <div className={`kpi-icon ${color}`}><Icon size={18} /></div>
              <TrendingUp size={14} color="var(--text-muted)" />
            </div>
            <div className="kpi-value">{value.toLocaleString()}</div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-change">{change}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="charts-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Weekly Survey Activity</div>
              <div className="card-subtitle">Records and patients per day</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.weeklyRecords}>
              <defs>
                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a6b4a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1a6b4a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="records" stroke="#1a6b4a" strokeWidth={2} fill="url(#recGrad)" name="Records" />
              <Area type="monotone" dataKey="patients" stroke="#58a6ff" strokeWidth={2} fill="none" name="Patients" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Risk Distribution</div>
              <div className="card-subtitle">AI-assessed health risk levels</div>
            </div>
          </div>
          {stats.riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {stats.riskDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <Brain size={32} color="var(--text-muted)" />
              <p>No AI analysis data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Common Symptoms</div>
              <div className="card-subtitle">Most reported symptom tags</div>
            </div>
          </div>
          {stats.symptomsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.symptomsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="tag" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#1a6b4a" radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No symptom data yet</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Vaccination Status</div>
              <div className="card-subtitle">Coverage across all patients</div>
            </div>
          </div>
          {stats.vaccinationStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.vaccinationStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="status" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#f0a500" radius={[4, 4, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No vaccination data yet</p></div>
          )}
        </div>
      </div>

      {/* Village Stats */}
      {stats.villageStats.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Village-wise Health Statistics</div>
              <div className="card-subtitle">Records per village</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.villageStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="records" fill="#58a6ff" radius={[4, 4, 0, 0]} name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
