import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('system')
  
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [power, setPower] = useState(true)
  const [confirmPowerAction, setConfirmPowerAction] = useState(null)
  const { is24Hour, toggle24Hour } = useTheme()

  // User Management State
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState(null)
  const [userSuccess, setUserSuccess] = useState(null)

  useEffect(() => {
    // Read from localStorage for mock mode
    const savedPower = localStorage.getItem('mockSystemPower')
    if (savedPower !== null) {
      setPower(savedPower === 'true')
    }

    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured.")
      setSchedule([])
      setLoading(false)
      return
    }

    Promise.all([
      supabase.from('schedule').select('*').order('id'),
      supabase.from('sensor_status').select('*').eq('id', 1).single()
    ]).then(([scheduleRes, sensorRes]) => {
      setSchedule(scheduleRes.data ?? [])
      if (sensorRes.data) {
        const savedPower = localStorage.getItem('mockSystemPower')
        if (savedPower !== null) {
          setPower(savedPower === 'true')
        } else {
          setPower(sensorRes.data.power_on)
          localStorage.setItem('mockSystemPower', String(sensorRes.data.power_on))
        }
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (activeTab === 'users' && isSupabaseConfigured) {
      fetchUsers()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/users`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        // Fallback to direct supabase if API not configured
        const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
        setUsers(data || [])
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserError(null)
    setUserSuccess(null)
    setCreatingUser(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.detail || 'Failed to create user')
      
      setUserSuccess('Admin user created successfully!')
      setNewEmail('')
      setNewPassword('')
      fetchUsers()
    } catch (err) {
      setUserError(err.message)
    } finally {
      setCreatingUser(false)
    }
  }

  if (loading) return <div style={{ padding: '32px' }}>Loading...</div>

  const toggle = (i) => {
    setSchedule(prev => prev.map((row, idx) =>
      idx === i ? { ...row, active: !row.active } : row
    ))
  }

  const updateTime = (i, field, value) => {
    setSchedule(prev => prev.map((row, idx) =>
      idx === i ? { ...row, [field]: value } : row
    ))
  }

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return "00:00";
    if (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM")) {
      const parts = timeStr.trim().split(' ');
      if (parts.length < 2) return "00:00";
      let [hours, minutes] = parts[0].split(':');
      if (!minutes) minutes = "00";
      if (hours === '12') hours = '00';
      if (parts[1].toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return timeStr;
  };

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      alert('Demo mode — connect Supabase in frontend/.env to save settings.')
      return
    }
    const { error } = await supabase.from('schedule').upsert(schedule)
    if (error) alert('Save failed: ' + error.message)
    else alert('Schedule saved!')
  }

  return (
    <div className="page-container" style={{
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto 24px auto', display: 'flex', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('system')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'system' ? 'var(--color-blue)' : 'transparent',
            color: activeTab === 'system' ? 'white' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          System Configuration
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'users' ? 'var(--color-blue)' : 'transparent',
            color: activeTab === 'users' ? 'white' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          User Management
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {activeTab === 'system' ? (
          <>
            {/* Master Power Banner */}
            <div style={{
              background: power ? 'linear-gradient(135deg, var(--color-green-dark) 0%, var(--color-green) 100%)' : 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg) 100%)',
              borderRadius: '24px',
              padding: '16px 20px',
              border: power ? 'none' : '1px solid var(--color-border)',
              boxShadow: power ? '0 20px 40px rgba(16, 185, 129, 0.2)' : 'var(--shadow-premium)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: power ? '#ffffff' : 'var(--color-text)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                  System Power
                </h2>
                <p style={{ fontSize: '15px', color: power ? 'rgba(255,255,255,0.9)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: power ? '#A7F3D0' : 'var(--color-danger)',
                    boxShadow: power ? '0 0 10px #A7F3D0' : '0 0 10px var(--color-danger)'
                  }} />
                  {power ? 'Dispenser is currently ONLINE and active.' : 'Dispenser is offline. Turn on to resume normal operations.'}
                </p>
              </div>

              {/* Large Premium Toggle */}
              <button
                onClick={() => setConfirmPowerAction(!power)}
                style={{
                  width: '80px',
                  height: '44px',
                  borderRadius: '22px',
                  background: power ? '#ffffff' : '#e5e7eb',
                  border: power ? 'none' : '1px solid #d1d5db',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: power ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: power ? '40px' : '4px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: power ? 'var(--color-green)' : '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: power ? '#ffffff' : 'var(--color-text-muted)',
                    fontSize: '18px'
                  }}
                >
                  {power ? '⚡' : '🔌'}
                </span>
              </button>
            </div>

            {/* User Preferences */}
            <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-premium)' }}>
              <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: 0, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '4px' }}>User Preferences</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>Customize your dashboard experience</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--color-border)' }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px 0' }}>24-Hour Time Format</p>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>Use 24-hour time format (14:00) instead of AM/PM.</p>
                </div>
                <button
                  onClick={toggle24Hour}
                  style={{
                    width: '48px', height: '26px', borderRadius: '13px',
                    background: is24Hour ? 'var(--color-blue)' : '#d1d5db',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: is24Hour ? '25px' : '3px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} />
                </button>
              </div>
            </div>

            {/* Scheduler */}
            <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-premium)' }}>
              <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: 0, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '4px' }}>Automated Scheduler</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Configure daily operating hours for the dispenser</p>
                </div>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '12px 24px', borderRadius: '12px',
                    background: 'var(--color-blue)', color: 'white', border: 'none',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(37, 99, 235, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.2)'; }}
                >
                  Save Changes
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '460px', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Day', 'Start Time', 'End Time', 'Status'].map(h => (
                      <th key={h} style={{ padding: '12px 0', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'left', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, i) => (
                    <tr key={row.day} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s', background: row.active ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '12px', color: row.active ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: row.active ? 600 : 400, fontSize: '15px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: row.active ? 'var(--color-green)' : 'var(--color-danger)', display: 'inline-block', boxShadow: row.active ? '0 0 8px rgba(16,185,129,0.4)' : 'none' }} />
                        {row.day}
                      </td>
                      <td style={{ padding: '16px 12px 16px 0' }}>
                        <input
                          type="time"
                          value={convertTo24Hour(row.start)}
                          disabled={!row.active}
                          onChange={e => updateTime(i, 'start', e.target.value)}
                          style={{
                            padding: '10px 14px', borderRadius: '8px', border: row.active ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                            fontSize: '14px', width: '110px', fontWeight: 500,
                            background: row.active ? 'var(--color-surface)' : 'var(--color-bg)',
                            color: row.active ? 'var(--color-text)' : 'var(--color-text-muted)',
                            outline: 'none', transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--color-blue)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        />
                      </td>
                      <td style={{ padding: '16px 12px 16px 0' }}>
                        <input
                          type="time"
                          value={convertTo24Hour(row.end)}
                          disabled={!row.active}
                          onChange={e => updateTime(i, 'end', e.target.value)}
                          style={{
                            padding: '10px 14px', borderRadius: '8px', border: row.active ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                            fontSize: '14px', width: '110px', fontWeight: 500,
                            background: row.active ? 'var(--color-surface)' : 'var(--color-bg)',
                            color: row.active ? 'var(--color-text)' : 'var(--color-text-muted)',
                            outline: 'none', transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--color-blue)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        />
                      </td>
                      <td style={{ padding: '16px 0' }}>
                        <button
                          onClick={() => toggle(i)}
                          style={{
                            width: '48px', height: '26px', borderRadius: '13px',
                            background: row.active ? 'var(--color-blue)' : '#d1d5db',
                            border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: '3px',
                            left: row.active ? '25px' : '3px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'white', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            {/* User List */}
            <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-premium)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: 0, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '16px' }}>Registered Admins</h3>
              {loadingUsers ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Loading users...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {users.map(u => (
                    <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={u.is_admin ? "admin-glow" : ""} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>{u.email}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>{u.is_admin ? 'Administrator' : 'User'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No admin users found.</p>}
                </div>
              )}
            </div>

            {/* Create User Form */}
            <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-premium)', height: 'max-content' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '16px' }}>Add Admin User</h3>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)', textTransform: 'uppercase' }}>Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)', textTransform: 'uppercase' }}>Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                  />
                </div>
                
                {userError && <div style={{ color: 'var(--color-danger)', fontSize: '13px', padding: '8px', background: 'var(--color-danger-light)', borderRadius: '6px' }}>{userError}</div>}
                {userSuccess && <div style={{ color: 'var(--color-green)', fontSize: '13px', padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}>{userSuccess}</div>}

                <button
                  type="submit"
                  disabled={creatingUser}
                  style={{
                    padding: '12px', borderRadius: '12px', background: 'var(--color-blue)', color: 'white', border: 'none', fontWeight: 600, cursor: creatingUser ? 'not-allowed' : 'pointer', opacity: creatingUser ? 0.7 : 1
                  }}
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmPowerAction !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: '24px', padding: '32px',
            width: '90%', maxWidth: '400px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            border: '1px solid var(--color-border)', textAlign: 'center'
          }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: confirmPowerAction ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)'
            }}>
              <span style={{ fontSize: '32px' }}>{confirmPowerAction ? '⚡' : '🔌'}</span>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--color-text)' }}>
              {confirmPowerAction ? 'Turn Dispenser ON?' : 'Turn Dispenser OFF?'}
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: '0 0 32px 0', lineHeight: 1.5 }}>
              {confirmPowerAction 
                ? 'The system will boot up and resume normal water dispensing operations.'
                : 'The system will be powered down and users will not be able to dispense water.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                onClick={() => setConfirmPowerAction(null)}
                style={{
                  padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button 
                onClick={async () => {
                  const newPower = confirmPowerAction
                  setConfirmPowerAction(null)
                  setPower(newPower)
                  localStorage.setItem('mockSystemPower', String(newPower))
                  if (isSupabaseConfigured) {
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
                      await fetch(`${apiUrl}/api/sensors/power`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ power_on: newPower })
                      })
                    } catch (error) {
                      console.error('Failed to update power status', error)
                      // Fallback to direct supabase if API is unreachable
                      await supabase.from('sensor_status').update({ power_on: newPower }).eq('id', 1)
                    }
                  }
                }}
                style={{
                  padding: '12px', borderRadius: '12px', border: 'none',
                  background: confirmPowerAction ? 'var(--color-green)' : 'var(--color-danger)', 
                  color: 'white', fontWeight: 600, cursor: 'pointer',
                  boxShadow: confirmPowerAction ? '0 8px 16px rgba(16,185,129,0.2)' : '0 8px 16px rgba(220,38,38,0.2)'
                }}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
