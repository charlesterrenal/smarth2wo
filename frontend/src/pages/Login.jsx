import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/smarth2wo_logo.png'
import logoDark from '../assets/smarth2wo_logo_dark.png'

const bubbles = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  size: Math.random() * 8 + 4,
  left: Math.random() * 100,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * -15,
  opacity: Math.random() * 0.3 + 0.1,
  tx: (Math.random() - 0.5) * 80
}));

export default function Login() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isBtnHovered, setIsBtnHovered] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', data.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      if (!profile?.is_admin) {
        await supabase.auth.signOut()
        throw new Error('Only admin users can access this dashboard')
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container hero-ocean-bg relative overflow-hidden" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Animated Water Caustics Effects */}
      <div className="caustic-1 absolute inset-0 pointer-events-none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div className="caustic-2 absolute inset-0 pointer-events-none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Rising Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {bubbles.map(b => (
          <div
            key={b.id}
            className="bubble"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              opacity: b.opacity,
              '--tx': `${b.tx}px`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`
            }}
          />
        ))}
      </div>

      {/* Animated Wave Divider at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', overflow: 'hidden', lineHeight: 0, zIndex: 5 }}>
        <svg
          style={{ position: 'relative', display: 'block', width: '100%', height: '120px' }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          shapeRendering="auto"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
            />
          </defs>
          <g className="waves">
            <use href="#gentle-wave" x="48" y="0" className="wave wave-1" />
            <use href="#gentle-wave" x="48" y="3" className="wave wave-2" />
            <use href="#gentle-wave" x="48" y="5" className="wave wave-3" />
          </g>
        </svg>
      </div>

      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <img src={isDark ? logoDark : logo} alt="SmartH2WO Logo" style={{ display: 'block', margin: '0 auto 12px auto', height: '36px', width: '100%', maxWidth: '250px', objectFit: 'contain' }} />
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Admin Dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
              color: 'var(--color-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smarth2wo.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-blue)'
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
              color: 'var(--color-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-blue)'
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--color-danger-light)',
              border: '1px solid var(--color-danger)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '13px',
              color: 'var(--color-danger-dark)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-glow"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              e.currentTarget.style.setProperty('--mouse-x', `${x}px`)
              e.currentTarget.style.setProperty('--mouse-y', `${y}px`)
            }}
            style={{
              padding: '14px 16px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              width: '100%'
            }}
          >
            <span style={{ position: 'relative', zIndex: 10 }}>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {!isSupabaseConfigured() && (
          <div style={{
            background: 'var(--color-warning-light)',
            border: '1px solid var(--color-warning)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '13px',
            color: 'var(--color-warning-dark)',
            marginTop: '8px',
          }}>
            Supabase is not configured. Use the generic credentials below to bypass login.
          </div>
        )}

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          marginTop: '20px'
        }}>
          Use <strong>admin@smarth2wo.com</strong> / <strong>admin123</strong> to login as demo
        </p>
      </div>
    </div>
  )
}
