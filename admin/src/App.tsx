import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Records } from './pages/Records'
import { Patients } from './pages/Patients'
import { Workers } from './pages/Workers'
import { Villages } from './pages/Villages'
import { Analytics } from './pages/Analytics'
import { Templates } from './pages/Templates'
import { Surveys } from './pages/Surveys'
import { SurveySubmissions } from './pages/SurveySubmissions'
import { Duplicates } from './pages/Duplicates'
import { Sidebar } from './components/Sidebar'
import './index.css'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of field health data and AI insights' },
  '/templates': { title: 'Template Library', subtitle: 'Manage survey templates for field data collection' },
  '/surveys': { title: 'Survey Management', subtitle: 'Create and manage surveys for field workers' },
  '/submissions': { title: 'Survey Submissions', subtitle: 'View all collected survey data from field workers' },
  '/duplicates': { title: 'Duplicate Review', subtitle: 'Review and resolve potential duplicate beneficiary records' },
  '/records': { title: 'Health Records', subtitle: 'All patient visit records from field workers' },
  '/patients': { title: 'Patients', subtitle: 'Registered beneficiaries across all villages' },
  '/workers': { title: 'Healthcare Workers', subtitle: 'Field operative activity and performance' },
  '/villages': { title: 'Villages', subtitle: 'Geographic health data distribution' },
  '/analytics': { title: 'AI Analytics', subtitle: 'Grok AI-powered health insights and trends' },
}

const Header: React.FC = () => {
  const path = window.location.pathname
  const info = PAGE_TITLES[path] || PAGE_TITLES['/']
  const { user } = useAuth()

  return (
    <header className="header">
      <div className="header-title">
        <h2>{info.title}</h2>
        <p>{info.subtitle}</p>
      </div>
      <div className="header-actions">
        <div className="header-badge">
          <div className="dot" />
          Live Sync Active
        </div>
        <div className="avatar">{user?.email?.slice(0, 2).toUpperCase() ?? 'AD'}</div>
      </div>
    </header>
  )
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Header />
      {children}
    </div>
  </div>
)

const ProtectedApp: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <Landing />

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/surveys" element={<Surveys />} />
        <Route path="/submissions" element={<SurveySubmissions />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route path="/records" element={<Records />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/villages" element={<Villages />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/login" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}
