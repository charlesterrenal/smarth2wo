import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { mockTransactions } from '../lib/mockData'

export default function Transaction() {
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        if (!isSupabaseConfigured) {
          setTransactions(mockTransactions)
          return
        }
        const { data, error: queryError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })

        if (queryError) throw queryError
        setTransactions(data ?? [])
      } catch (err) {
        console.error('Error fetching transactions:', err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  if (loading) return <div style={{ padding: '32px' }}>Loading...</div>
  if (error) return <div style={{ padding: '32px', color: 'red' }}>Error loading transactions: {error}</div>

  const filtered = transactions.filter(t => {
    const matchSearch = t.customer?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || t.payment_method === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  const total100  = transactions.filter(t => t.volume_ml === 100).length
  const total500  = transactions.filter(t => t.volume_ml === 500).length
  const total1000 = transactions.filter(t => t.volume_ml === 1000).length
  const totalRevenue = transactions.reduce((s, t) => s + Number(t.price), 0)

  return (
    <div className="page-container" style={{ 
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <PageHeader title="TRANSACTION OVERVIEW" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>

        {/* Transaction table */}
        <div style={{ background: 'var(--color-surface)', borderRadius: '0px', padding: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px',
                border: '1px solid var(--color-border)', fontSize: '13px',
                outline: 'none', background: '#f9fafb',
              }}
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid var(--color-border)', fontSize: '13px',
                background: '#f9fafb', cursor: 'pointer',
              }}
            >
              <option>All</option>
              <option>Coin</option>
              <option>QR</option>
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                {['Customer', 'Volume', 'Price', 'Payment', 'Time'].map(h => (
                  <th key={h} style={{ padding: '8px 4px', fontWeight: 500, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 4px' }}>{t.customer}</td>
                  <td style={{ padding: '10px 4px' }}>{t.volume_ml >= 1000 ? `${t.volume_ml / 1000}L` : `${t.volume_ml}mL`}</td>
                  <td style={{ padding: '10px 4px' }}>₱{t.price.toFixed(2)}</td>
                  <td style={{ padding: '10px 4px', textTransform: 'capitalize' }}>{t.payment_method}</td>
                  <td style={{ padding: '10px 4px', color: 'var(--color-text-muted)' }}>{formatTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', gridColumn: '1 / -1' }}>
          <VolumeCard label="100mL" count={total100} color="#378ADD" />
          <VolumeCard label="500mL" count={total500} color="#EF9F27" />
          <VolumeCard label="1 Liter" count={total1000} color="#D4537E" />

          <StatCard borderColor="#1a1a2e">
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Sales</p>
            <p style={{ fontSize: '28px', fontWeight: 700 }}>{transactions.length} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-muted)' }}>Total Transactions</span></p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#EF9F27' }}>₱{totalRevenue.toFixed(0)} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-muted)' }}>Total Revenue</span></p>
          </StatCard>
        </div>
      </div>

    </div>
  )
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function VolumeCard({ label, count, color }) {
  return (
    <div style={{ background: color, borderRadius: '0px', padding: '14px 18px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{label} — Units Sold</p>
      <p style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>👥 {count} <span style={{ fontSize: '13px', fontWeight: 400 }}>Customers</span></p>
    </div>
  )
}
