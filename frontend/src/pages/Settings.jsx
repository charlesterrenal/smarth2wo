import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { mockSchedule } from '../lib/mockData'

export default function Settings() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [power, setPower] = useState(true)

  useEffect(() => {
    // Read from localStorage for mock mode
    const savedPower = localStorage.getItem('mockSystemPower')
    if (savedPower !== null) {
      setPower(savedPower === 'true')
    }

    if (!isSupabaseConfigured) {
      setSchedule(mockSchedule)
      setLoading(false)
      return
    }

    Promise.all([
      supabase.from('schedule').select('*').order('id'),
      supabase.from('sensor_status').select('*').eq('id', 1).single()
    ]).then(([scheduleRes, sensorRes]) => {
      setSchedule(scheduleRes.data ?? [])
      if (sensorRes.data) {
        setPower(sensorRes.data.power_on)
        localStorage.setItem('mockSystemPower', String(sensorRes.data.power_on))
      }
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Master Power Banner */}
        <div style={{
          background: power ? 'linear-gradient(135deg, var(--color-green-dark) 0%, var(--color-green) 100%)' : 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg) 100%)',
          borderRadius: '24px',
          padding: '12px 32px',
          border: power ? 'none' : '1px solid var(--color-border)',
          boxShadow: power ? '0 20px 40px rgba(16, 185, 129, 0.2)' : 'var(--shadow-premium)',
          display: 'flex',
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
            onClick={async () => {
              const newPower = !power
              setPower(newPower)
              localStorage.setItem('mockSystemPower', String(newPower))
              if (isSupabaseConfigured) {
                await supabase.from('sensor_status').update({ power_on: newPower }).eq('id', 1)
              }
            }}
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

        {/* Scheduler */}
        <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px 40px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-premium)' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
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
                      type="text"
                      value={row.start}
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
                      type="text"
                      value={row.end}
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
    </div>
  )
}
