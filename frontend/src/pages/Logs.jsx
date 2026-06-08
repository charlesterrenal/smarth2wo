import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { mockLogs } from '../lib/mockData'

export default function Logs() {
  const [logs, setLogs]     = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort]     = useState('Newest First')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        if (!isSupabaseConfigured) {
          setLogs(mockLogs)
          return
        }
        const { data, error: queryError } = await supabase
          .from('logs')
          .select('*')
          .order('created_at', { ascending: false })

        if (queryError) throw queryError
        setLogs(data ?? [])
      } catch (err) {
        console.error('Error fetching logs:', err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  if (loading) return <div style={{ padding: '32px' }}>Loading...</div>
  if (error) return <div style={{ padding: '32px', color: 'red' }}>Error loading logs: {error}</div>

  const filtered = logs
    .filter(l => {
      const matchSearch = l.event.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'All' || l.status === filter
      return matchSearch && matchFilter
    })
    .sort((a, b) => sort === 'Newest First'
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at)
    )

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const statusStyle = (status) => ({
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    background: status === 'success' ? 'var(--color-green-light)' : status === 'error' ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
    color: status === 'success' ? 'var(--color-green-dark)' : status === 'error' ? 'var(--color-danger-dark)' : 'var(--color-warning-dark)'
  })
  const handleExport = () => {
    const csv = ['Date,Time,Event,Volume,Payment Method,Status', ...filtered.map(l => `${formatDate(l.created_at)},${formatTime(l.created_at)},${l.event},${l.volume_ml || ''},${l.payment_method || ''},${l.status}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="page-container" style={{
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* Controls bar - responsive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', transition: 'all 0.3s ease' }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', transition: 'all 0.3s ease' }}>
          <option>All</option>
          <option>success</option>
          <option>scheduled</option>
          <option>error</option>
          <option>warning</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', transition: 'all 0.3s ease' }}>
          <option>Newest First</option>
          <option>Oldest First</option>
        </select>
        <button onClick={handleExport}
          style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.3s ease' }}>
          ⬇ Download CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', overflowX: 'auto', boxShadow: 'var(--shadow-card)' }}>
        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: 'var(--surface-card-strong)' }}>
            <tr>
              {['Date', 'Time', 'Event', 'Volume', 'Payment', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'left', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)', background: log.status === 'Scheduled' ? 'var(--table-row-alt)' : 'transparent', color: 'var(--color-text)' }}>
                <td style={{ padding: '12px 16px' }}>{formatDate(log.created_at)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{formatTime(log.created_at)}</td>
                <td style={{ padding: '12px 16px', fontWeight: log.status === 'Scheduled' ? 500 : 400 }}>{log.event}</td>
                <td style={{ padding: '12px 16px' }}>{log.volume_ml ? `${log.volume_ml}mL` : '—'}</td>
                <td style={{ padding: '12px 16px' }}>{log.payment ? `₱${log.payment.toFixed(2)}` : '—'}</td>
                <td style={{ padding: '12px 16px' }}><span style={statusStyle(log.status)}>{log.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
          Showing 1–{filtered.length} out of {logs.length}
        </div>
      </div>
    </div>
  )
}
