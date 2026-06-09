import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import PageHeader from './components/PageHeader'
import Dashboard from './pages/Dashboard'
import Transaction from './pages/Transaction'
import AdminPayments from './pages/AdminPayments'
import Analytics from './pages/Analytics'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import Login from './pages/Login'
import SetupBanner from './components/SetupBanner'
import { supabase, isSupabaseConfigured } from './lib/supabase'

function AppContent() {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return (
    <main style={{ 
      flex: 1, 
      marginLeft: isMobile ? '0' : 'var(--sidebar-width)', 
      overflow: 'hidden',
      animation: 'pageTransition 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <PageHeader 
        title={
          location.pathname.startsWith('/dashboard') ? 'DASHBOARD' :
          location.pathname.startsWith('/transaction') ? 'TRANSACTION OVERVIEW' :
          location.pathname.startsWith('/admin/payments') ? 'ADMIN PAYMENTS' :
          location.pathname.startsWith('/analytics') ? 'ANALYTICS' :
          location.pathname.startsWith('/logs') ? 'SYSTEM LOGS' :
          location.pathname.startsWith('/settings') ? 'SETTINGS' : 'SMARTH2WO'
        } 
      />
      <div style={{
        flex: 1,
        overflowY: 'scroll',
        width: '100%',
        paddingTop: 0,
      }}>
        <Routes key={location.pathname}>
          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/transaction" element={<Transaction />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/analytics"   element={<Analytics />} />
          <Route path="/logs"        element={<Logs />} />
          <Route path="/settings"    element={<Settings />} />
        </Routes>
      </div>
    </main>
  )
}

function AppInner() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch((err) => {
        console.error('Auth session error:', err)
      })
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  if (!isSupabaseConfigured()) {
    return <Routes><Route path="*" element={<Login />} /></Routes>
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // If not logged in, only show login
  if (!user) {
    return <Routes><Route path="*" element={<Login />} /></Routes>
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'var(--color-bg)' }}>
      <Sidebar />
      <AppContent />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @keyframes pageTransition {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <AppInner />
    </BrowserRouter>
  )
}
