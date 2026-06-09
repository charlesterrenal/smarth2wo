import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, CreditCard, BarChart2, ClipboardList, Settings, Sun, Moon, Menu, X, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import logo from '../assets/smarth2wo_logo.png'
import logoDark from '../assets/smarth2wo_logo_dark.png'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transaction', icon: ArrowLeftRight, label: 'Transaction' },
  { to: '/admin/payments', icon: CreditCard, label: 'Admin Payments' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/logs', icon: ClipboardList, label: 'Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [hoveredLink, setHoveredLink] = useState(null)

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
            top: '15px',
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
        width: isMobile ? '280px' : 'var(--sidebar-width)',
        position: isMobile ? 'fixed' : 'fixed',
        top: 0, left: 0, bottom: 0,
        background: 'var(--color-sidebar)',
        borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 16px 24px',
        gap: '8px',
        zIndex: 100,
        transition: 'transform 0.3s ease',
        transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
        boxShadow: isMobile && isOpen ? '2px 0 8px rgba(0,0,0,0.1)' : 'none',
      }}>

        {/* Logo */}
        <div style={{
          marginBottom: '24px',
          padding: isMobile ? '0 8px 0 48px' : '0 8px',
          display: 'flex',
          justifyContent: isMobile ? 'flex-start' : 'center',
          alignItems: 'center',
          minHeight: '40px'
        }}>
          <NavLink 
            to="/dashboard" 
            onClick={() => isMobile && setIsOpen(false)}
            style={{ display: 'block', width: '100%', textDecoration: 'none' }}
          >
            <img
              src={isDark ? logoDark : logo}
              alt="SmartH2WO Logo"
              style={{
                width: '100%',
                maxWidth: isMobile ? '160px' : '220px',
                height: isMobile ? '24px' : '32px',
                objectFit: 'contain',
                display: 'block',
                margin: isMobile ? '0' : '0 auto'
              }}
            />
          </NavLink>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className="sidebar-link"
              onMouseEnter={() => setHoveredLink(to)}
              onMouseLeave={() => setHoveredLink(null)}
              onClick={() => isMobile && setIsOpen(false)}
              style={({ isActive }) => {
                const isHovered = hoveredLink === to && !isActive;
                return {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-text)' : (isHovered ? 'var(--color-text)' : 'var(--color-text-secondary)'),
                  background: isActive ? (isDark ? 'rgba(97,175,239,0.08)' : 'rgba(0,102,204,0.08)') : (isHovered ? 'var(--table-row-hover)' : 'transparent'),
                  borderLeft: isActive ? '4px solid var(--color-blue)' : '4px solid transparent',
                  boxShadow: isActive ? (isDark ? '0 8px 28px rgba(97,175,239,0.08)' : '0 8px 28px rgba(0,102,204,0.08)') : 'none',
                  transition: 'all 0.18s ease',
                };
              }}
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
              color: 'var(--color-text-secondary)',
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
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-danger)'
              e.currentTarget.style.background = 'var(--color-danger-light)'
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
