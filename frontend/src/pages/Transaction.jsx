import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Search, Users, Repeat, DollarSign, ChevronDown, ShoppingBag } from 'lucide-react'
import PageHeader from '../components/PageHeader'
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

  const total100  = transactions.filter(t => t.volume_ml === 100).length
  const total500  = transactions.filter(t => t.volume_ml === 500).length
  const total1000 = transactions.filter(t => t.volume_ml === 1000).length
  const totalRevenue = transactions.reduce((s, t) => s + Number(t.price), 0)
  const uniqueCustomers = new Set(transactions.map(t => t.customer)).size

  return (
    <div className="page-container" style={{
      padding: '22px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <PageHeader title="TRANSACTION OVERVIEW" />

      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--dropdown-border)',
        borderRadius: '24px',
        padding: '26px',
        boxShadow: '0 24px 70px rgba(15, 23, 42, 0.12)',
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
                  <td style={{ padding: '18px 16px', color: 'var(--color-text-secondary)', textTransform: 'capitalize', fontSize: '14px' }}>{t.payment_method}</td>
                  <td style={{ padding: '18px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>{formatTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <MetricCard
          title={
           <span style={{ fontSize: '20px', fontWeight: '800' }}>
            Total Customers
           </span>
          }
          caption="Customers"
          subtitle="Unique customers"
          value={uniqueCustomers}
          icon={<Users size={20} />}
          accent="#7B3FF2"
          lightBg="#E9D5FF"
        />
        <MetricCard
          title={
            <span style={{ fontSize: '20px', fontWeight: '800' }}>
              Transactions
            </span>
          }
          caption="Customers"
          subtitle="Completed orders"
          value={transactions.length}
          icon={<Repeat size={20} />}
          accent="#2563EB"
          lightBg="#DBEAFE"
        />
        <MetricCard
          title={
            <span style={{ fontSize: '20px', fontWeight: '800' }}>
              Total Revenue
            </span>
          }
          caption="Customers"
          subtitle="Sales this period"
          value={`₱${totalRevenue.toFixed(0)}`}
          icon={<DollarSign size={20} />}
          accent="#10B981"
          lightBg="#BBF7D0"
        />
        <TotalSalesCard
          transactions={transactions.length}
          revenue={totalRevenue}
        />
      </div>
    </div>
  )
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function MetricCard({ title, caption, subtitle, value, icon, accent, lightBg }) {
  const { isDark } = useTheme()
  const isLight = !isDark
  const titleColor = isLight ? '#111827' : '#F8FAFC'
  const valueColor = isLight ? '#111827' : '#FFFFFF'
  const captionColor = isLight ? '#374151' : '#CBD5E1'
  const subtitleColor = isLight ? '#374151' : '#CBD5E1'
  const badgeBackground = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)'
  const pillBackground = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)'

  return (
    <div style={{
      background: isLight && lightBg ? `linear-gradient(135deg, ${lightBg}, ${accent}20)` : (accent ? `linear-gradient(135deg, ${accent}22, ${accent}80)` : 'var(--surface-card)'),
      borderRadius: '24px',
      padding: '26px',
      minHeight: '280px',
      boxShadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'all 0.2s ease',
      cursor: 'default',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = '0 20px 60px rgba(15, 23, 42, 0.16)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 18px 50px rgba(15, 23, 42, 0.12)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: titleColor }}>{title}</p>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: badgeBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 10px 20px rgba(0,0,0,0.08)' }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '68px', height: '68px', borderRadius: '999px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 16px 30px rgba(15, 23, 42, 0.16)' }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop: '24px' }}>
        <p style={{ margin: 0, fontSize: '3.5rem', lineHeight: 1, fontWeight: 800, color: valueColor }}>{value}</p>
        <p style={{ margin: '10px 0 0', fontSize: '16px', fontWeight: 600, color: captionColor }}>{caption}</p>
      </div>
      <div style={{ marginTop: '22px', padding: '16px', background: pillBackground, borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '16px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)' }}>
          {icon}
        </div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: subtitleColor }}>{subtitle}</p>
      </div>
    </div>
  )
}

function TotalSalesCard({ transactions, revenue }) {
  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--dropdown-border)',
      borderRadius: '20px',
      padding: '24px',
      minHeight: '200px',
      boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = '0 24px 60px rgba(15, 23, 42, 0.18)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 20px 50px rgba(15, 23, 42, 0.12)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total Sales</p>
          <p style={{ margin: '10px 0 0', fontSize: '28px', fontWeight: 800, color: 'var(--color-text)' }}>{transactions} Transactions</p>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(37, 99, 235, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
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
