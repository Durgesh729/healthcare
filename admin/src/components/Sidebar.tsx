import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, MapPin, Activity,
  LogOut, Settings, BarChart2, LayoutTemplate, ClipboardList, AlertTriangle, Inbox
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/surveys', label: 'Surveys', icon: ClipboardList },
  { to: '/submissions', label: 'Submissions', icon: Inbox },
  { to: '/duplicates', label: 'Duplicates', icon: AlertTriangle },
  { to: '/records', label: 'Health Records', icon: FileText },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/workers', label: 'Workers', icon: Activity },
  { to: '/villages', label: 'Villages', icon: MapPin },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
]

export const Sidebar: React.FC = () => {
  const { signOut, user } = useAuth()
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={18} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <h1>HealthSync</h1>
          <p>Admin Portal</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="nav-section-title" style={{ marginTop: 16 }}>System</div>
        <div className="nav-item">
          <Settings size={16} />
          Settings
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', marginBottom: 8 }}>
          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email?.split('@')[0] ?? 'Admin'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Administrator</div>
          </div>
        </div>
        <button className="nav-item" style={{ width: '100%', background: 'none', border: 'none', color: 'var(--danger)' }} onClick={signOut}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
