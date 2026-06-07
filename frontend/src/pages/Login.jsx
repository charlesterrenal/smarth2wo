import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/smarth2wo_logo.png'
import logoDark from '../assets/smarth2wo_logo_dark.png'

export default function Login() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    <div className="page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <img src={isDark ? logoDark : logo} alt="SmartH2WO Logo" style={{ height: '36px', width: '100%', maxWidth: '250px', marginBottom: '12px', objectFit: 'contain' }} />
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
              placeholder="admin@example.com"
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
            style={{
              background: 'var(--color-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = 'var(--color-blue-dark)')}
            onMouseLeave={(e) => (e.target.style.background = 'var(--color-blue)')}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {!isSupabaseConfigured && (
          <div style={{
            background: 'var(--color-warning-light)',
            border: '1px solid var(--color-warning)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '13px',
            color: 'var(--color-warning-dark)',
            marginTop: '8px',
          }}>
            Supabase is not configured. Add credentials to <code>frontend/.env</code>, or open the app in demo mode (dashboard loads automatically).
          </div>
        )}

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          marginTop: '20px'
        }}>
          Use your Supabase admin account to log in
        </p>
      </div>
    </div>
  )
}
