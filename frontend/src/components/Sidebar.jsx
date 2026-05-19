import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, BarChart2, ClipboardList, Settings, Sun, Moon, Menu, X, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/transaction', icon: ArrowLeftRight,  label: 'Transaction'  },
  { to: '/analytics',   icon: BarChart2,       label: 'Analytics'    },
  { to: '/logs',        icon: ClipboardList,   label: 'Logs'         },
  { to: '/settings',    icon: Settings,        label: 'Settings'     },
]

export default function Sidebar() {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setIsOpen(false)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile menu button - only show on mobile */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 101,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            display: 'flex',
          }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? '100%' : 'var(--sidebar-width)',
        position: isMobile ? 'fixed' : 'fixed',
        top: 0, left: 0, bottom: 0,
        background: 'var(--color-sidebar)',
        borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: '8px',
        zIndex: 100,
        transition: 'transform 0.3s ease',
        transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
        boxShadow: isMobile && isOpen ? '2px 0 8px rgba(0,0,0,0.1)' : 'none',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '24px', paddingLeft: '8px' }}>
          <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-blue)' }}>
            Smart<span style={{ color: 'var(--color-green)' }}>H₂</span>
            <span style={{ color: 'var(--color-blue)' }}>O</span>
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => isMobile && setIsOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--color-blue)' : 'var(--color-text-muted)',
                background: isActive ? 'rgba(0, 102, 204, 0.1)' : 'transparent',
                transition: 'all 0.2s ease',
              })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Toggle controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', alignItems: 'flex-start' }}>
          {/* Dark mode icon button */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text)'
              e.currentTarget.style.background = isDark ? 'rgba(171, 178, 191, 0.1)' : 'rgba(0, 0, 0, 0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.background = 'var(--color-surface)'
            }}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? (
              <Sun size={18} strokeWidth={2} />
            ) : (
              <Moon size={18} strokeWidth={2} />
            )}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#dc2626'
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.background = 'var(--color-surface)'
            }}
            title="Sign Out"
          >
            <LogOut size={18} strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay - click to close menu */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
          }}
        />
      )}
    </>
  )
}
