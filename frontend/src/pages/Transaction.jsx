import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Search, Users, Repeat, DollarSign, ChevronDown, ShoppingBag, CreditCard } from 'lucide-react'
import StatCard from '../components/StatCard'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { mockTransactions } from '../lib/mockData'

const timeFilters = ['All', 'Today', 'This Week', 'This Month']

export default function Transaction() {
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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
    const transactionDate = new Date(t.created_at)
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const weekStart = new Date(startOfDay)
    weekStart.setDate(startOfDay.getDate() - startOfDay.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const matchFilter = filter === 'All' ||
      (filter === 'Today' && transactionDate >= startOfDay) ||
      (filter === 'This Week' && transactionDate >= weekStart) ||
      (filter === 'This Month' && transactionDate >= monthStart)

    return matchSearch && matchFilter
  })

  const total100 = transactions.filter(t => t.volume_ml === 100).length
  const total500 = transactions.filter(t => t.volume_ml === 500).length
  const total1000 = transactions.filter(t => t.volume_ml === 1000).length
  const totalRevenue = transactions.reduce((s, t) => s + Number(t.price), 0)
  
  const aov = transactions.length > 0 ? (totalRevenue / transactions.length).toFixed(2) : '0.00'
  const paymentCounts = transactions.reduce((acc, t) => {
    acc[t.payment_method] = (acc[t.payment_method] || 0) + 1
    return acc
  }, {})
  const preferredPayment = Object.keys(paymentCounts).sort((a, b) => paymentCounts[b] - paymentCounts[a])[0] || 'N/A'
  const preferredPaymentCount = paymentCounts[preferredPayment] || 0

  return (
    <div className="page-container" style={{
      padding: '22px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        <StatCard
          title="Preferred Payment"
          caption="Most used"
          subtitle={`${preferredPaymentCount} transactions`}
          value={<span>{formatPaymentMethod(preferredPayment)}</span>}
          icon={<CreditCard size={20} />}
          accent="var(--color-purple)"
        />
        <StatCard
          title="Transactions"
          caption="Total orders"
          subtitle="Completed orders"
          value={transactions.length}
          icon={<Repeat size={20} />}
          accent="var(--color-blue)"
        />
        <StatCard
          title="Avg Order Value"
          caption="Per transaction"
          subtitle="Average spend"
          value={`₱${aov}`}
          icon={<DollarSign size={20} />}
          accent="var(--color-green)"
        />
        <TotalSalesCard
          transactions={transactions.length}
          revenue={totalRevenue}
        />
      </div>

      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--dropdown-border)',
        borderRadius: 'var(--radius-card)',
        padding: '26px',
        boxShadow: 'var(--shadow-premium)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            flex: '1 1 420px',
            minWidth: '260px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            borderRadius: '16px',
            background: 'var(--input-bg)',
            border: '1px solid var(--dropdown-border)',
            padding: '12px 16px',
          }}>
            <Search size={18} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: '14px',
              }}
              className="transaction-search-input"
            />
          </div>

          <div ref={filterRef} style={{ position: 'relative', minWidth: '220px' }}>
            <button
              type="button"
              onClick={() => setFilterOpen(prev => !prev)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'var(--surface-card)',
                border: '1px solid var(--dropdown-border)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
              }}
            >
              <span>{filter}</span>
              <ChevronDown size={18} />
            </button>

            {filterOpen && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '100%',
                borderRadius: '16px',
                background: 'var(--dropdown-bg)',
                border: '1px solid var(--dropdown-border)',
                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)',
                overflow: 'hidden',
                animation: 'fadeIn 180ms ease-out',
                zIndex: 20,
              }}>
                {timeFilters.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setFilter(option)
                      setFilterOpen(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: option === filter ? 'var(--color-blue)' : 'transparent',
                      color: option === filter ? '#FFFFFF' : 'var(--color-text)',
                      fontSize: '14px',
                      fontWeight: option === filter ? 700 : 500,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (option !== filter) e.currentTarget.style.background = 'var(--surface-card-strong)' }}
                    onMouseLeave={(e) => { if (option !== filter) e.currentTarget.style.background = 'transparent' }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '720px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-card-strong)', borderBottom: '1px solid var(--dropdown-border)' }}>
                {['Customer', 'Volume', 'Price', 'Payment', 'Time'].map(h => (
                  <th key={h} style={{ padding: '18px 16px', fontWeight: 700, color: 'var(--color-text)', textAlign: 'left', letterSpacing: '0.03em', fontSize: '13px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, index) => (
                <tr
                  key={t.id}
                  style={{
                    background: index % 2 === 0 ? 'var(--table-row-alt)' : 'transparent',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--table-row-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'var(--table-row-alt)' : 'transparent'}
                >
                  <td style={{ padding: '18px 16px', color: 'var(--color-text)', fontSize: '14px' }}>{t.customer}</td>
                  <td style={{ padding: '18px 16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t.volume_ml >= 1000 ? `${t.volume_ml / 1000}L` : `${t.volume_ml}mL`}</td>
                  <td style={{ padding: '18px 16px', color: 'var(--color-text)', fontWeight: 700, fontSize: '14px' }}>₱{t.price.toFixed(2)}</td>
                  <td style={{ padding: '18px 16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{formatPaymentMethod(t.payment_method)}</td>
                  <td style={{ padding: '18px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>{formatTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatPaymentMethod(method) {
  if (!method || method === 'N/A') return 'N/A';
  const m = method.toLowerCase();
  if (m === 'qr') return 'QR';
  if (m === 'rfid') return 'RFID';
  if (m === 'gcash') return 'GCash';
  return m.charAt(0).toUpperCase() + m.slice(1);
}



function TotalSalesCard({ transactions, revenue }) {
  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--dropdown-border)',
      borderRadius: 'var(--radius-card)',
      padding: '24px',
      minHeight: '200px',
      boxShadow: 'var(--shadow-premium)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      cursor: 'default',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-premium-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-premium)'
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>Total Sales</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '3.5rem', lineHeight: 1, fontWeight: 800, color: 'var(--color-text)' }}>{transactions}</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Transactions</span>
          </div>
        </div>
        <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '16px', background: 'rgba(37, 99, 235, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
          <ShoppingBag size={22} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', margin: '18px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Revenue</p>
          <p style={{ margin: '10px 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>₱{revenue.toFixed(0)}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Transactions</p>
          <p style={{ margin: '10px 0 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>{transactions}</p>
        </div>
      </div>
    </div>
  )
}
