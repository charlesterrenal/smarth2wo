import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { mockSchedule } from '../lib/mockData'

export default function Settings() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading]   = useState(true)
  const [power, setPower] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSchedule(mockSchedule)
      setLoading(false)
      return
    }
    supabase
      .from('schedule')
      .select('*')
      .order('id')
      .then(({ data }) => {
        setSchedule(data ?? [])
        setLoading(false)
      })
  }, [])

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
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

        {/* Power Control */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', letterSpacing: '0.05em', color: 'var(--color-text)' }}>System Power</p>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: power ? 'var(--color-green-light)' : 'var(--color-danger-light)', borderRadius: '12px', border: `2px solid ${power ? 'var(--color-green)' : 'var(--color-danger)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{power ? '⚡' : '🔌'}</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', color: power ? 'var(--color-green-dark)' : 'var(--color-danger-dark)' }}>Dispenser Power</p>
                <p style={{ fontSize: '12px', color: power ? '#065f46' : '#991b1b' }}>
                  {power ? 'System is ON' : 'System is OFF'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPower(!power)}
              style={{
                width: '50px',
                height: '28px',
                borderRadius: '14px',
                background: power ? 'var(--color-green)' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.3s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: power ? '28px' : '4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Scheduler */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px', letterSpacing: '0.05em', color: 'var(--color-text)' }}>Scheduler</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Day', 'Start', 'End', 'Toggle'].map(h => (
                  <th key={h} style={{ padding: '8px 0', fontWeight: 500, color: 'var(--color-text-muted)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={row.day} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: row.active ? 'var(--color-green)' : 'var(--color-danger)', display: 'inline-block' }} />
                    {row.day}
                  </td>
                  <td style={{ padding: '12px 8px 12px 0' }}>
                    <input
                      type="text"
                      value={row.start}
                      disabled={!row.active}
                      onChange={e => updateTime(i, 'start', e.target.value)}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                        fontSize: '13px', width: '90px', 
                        background: row.active ? 'var(--color-surface)' : 'var(--color-bg)',
                        color: row.active ? 'var(--color-text)' : 'var(--color-text-muted)',
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px 12px 0' }}>
                    <input
                      type="text"
                      value={row.end}
                      disabled={!row.active}
                      onChange={e => updateTime(i, 'end', e.target.value)}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                        fontSize: '13px', width: '90px', 
                        background: row.active ? 'var(--color-surface)' : 'var(--color-bg)',
                        color: row.active ? 'var(--color-text)' : 'var(--color-text-muted)',
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <button
                      onClick={() => toggle(i)}
                      style={{
                        width: '40px', height: '22px', borderRadius: '11px',
                        background: row.active ? 'var(--color-blue)' : '#d1d5db',
                        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '3px',
                        left: row.active ? '21px' : '3px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: 'white', transition: 'left 0.2s',
                      }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleSave}
            style={{
              marginTop: '20px', padding: '10px 24px', borderRadius: '8px',
              background: 'var(--color-blue)', color: 'white', border: 'none',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
