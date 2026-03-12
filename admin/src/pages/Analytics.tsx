import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts'

export const Analytics: React.FC = () => {
  const [aiData, setAiData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAnalytics() }, [])

  const fetchAnalytics = async () => {
    const { data } = await supabase
      .from('ai_analysis_results')
      .select('*, health_records(visit_date, villages(name))')
      .order('analyzed_at', { ascending: false })
      .limit(200)

    if (data) setAiData(data)
    setLoading(false)
  }

  // Condition frequency
  const conditionCounts: Record<string, number> = {}
  aiData.forEach(r => {
    if (r.possible_conditions) r.possible_conditions.forEach((c: string) => {
      conditionCounts[c] = (conditionCounts[c] || 0) + 1
    })
  })
  const conditionsChart = Object.entries(conditionCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count]) => ({ name, count }))

  // Risk over time
  const riskByDate: Record<string, Record<string, number>> = {}
  aiData.forEach(r => {
    const d = r.analyzed_at?.slice(0, 10)
    if (d) {
      if (!riskByDate[d]) riskByDate[d] = { low: 0, medium: 0, high: 0, critical: 0, date: d }
      riskByDate[d][r.risk_level] = (riskByDate[d][r.risk_level] || 0) + 1
    }
  })
  const riskTrendData = Object.values(riskByDate).slice(-14)

  // Risk radar
  const riskLevels = ['low', 'medium', 'high', 'critical']
  const radarData = riskLevels.map(level => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    count: aiData.filter(r => r.risk_level === level).length
  }))

  const criticalCount = aiData.filter(r => r.risk_level === 'critical' || r.risk_level === 'high').length

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div className="page-content">
      {/* Alert Banner */}
      {criticalCount > 0 && (
        <div style={{ background: 'rgba(218, 54, 51, 0.1)', border: '1px solid rgba(218, 54, 51, 0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="var(--danger)" />
          <span style={{ fontSize: 13, color: 'var(--danger)' }}>
            <strong>{criticalCount}</strong> patients have been flagged as High or Critical risk by AI analysis. Immediate attention required.
          </span>
        </div>
      )}

      <div className="charts-grid" style={{ marginBottom: 16 }}>
        {/* Possible Conditions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Possible Conditions</div>
              <div className="card-subtitle">AI-identified disease patterns</div>
            </div>
            <Brain size={16} color="var(--info)" />
          </div>
          {conditionsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={conditionsChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#58a6ff" radius={[0, 4, 4, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><Brain size={32} /><p>No AI analysis data yet</p></div>
          )}
        </div>

        {/* Risk Radar */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Risk Level Radar</div>
              <div className="card-subtitle">Distribution of risk assessments</div>
            </div>
            <TrendingUp size={16} color="var(--warning)" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="level" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Radar name="Count" dataKey="count" stroke="#1a6b4a" fill="#1a6b4a" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Trend over time */}
      {riskTrendData.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Risk Trend Over Time</div>
            <div className="card-subtitle">Daily risk level distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={riskTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>} />
              <Line type="monotone" dataKey="low" stroke="#3fb950" strokeWidth={2} dot={false} name="Low" />
              <Line type="monotone" dataKey="medium" stroke="#e3b341" strokeWidth={2} dot={false} name="Medium" />
              <Line type="monotone" dataKey="high" stroke="#f85149" strokeWidth={2} dot={false} name="High" />
              <Line type="monotone" dataKey="critical" stroke="#da3633" strokeWidth={2} dot={false} name="Critical" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent AI Insights */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent AI Insights</div>
          <div className="card-subtitle">Latest Grok AI health analysis results</div>
        </div>
        {aiData.length === 0 ? (
          <div className="empty-state"><Brain size={32} /><p>No AI analysis results yet. Data will appear after field workers sync records.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiData.slice(0, 10).map(r => (
              <div key={r.id} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className={`badge risk-${r.risk_level}`}>{r.risk_level} risk</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.analyzed_at ? new Date(r.analyzed_at).toLocaleString('en-IN') : '—'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{r.risk_summary || 'No summary available'}</div>
                {r.recommendations && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.recommendations}</div>
                )}
                {r.alerts && r.alerts.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.alerts.map((alert: string, i: number) => (
                      <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(248,81,73,0.1)', color: 'var(--danger)', borderRadius: 20 }}>{alert}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
