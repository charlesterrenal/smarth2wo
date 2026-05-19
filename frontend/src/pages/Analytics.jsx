import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
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
  if (error) return <div style={{ padding: '32px', color: 'red' }}>Error loading analytics: {error}</div>

  // Compute stats from real data
  const totalLiters = transactions.reduce((s, t) => s + t.volume_ml, 0) / 1000
  const uniqueDays  = [...new Set(transactions.map(t => t.created_at?.slice(0, 10)))].length
  const avgDaily    = uniqueDays > 0 ? (totalLiters / uniqueDays).toFixed(1) : 0

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const consumptionData = days.map((day, index) => ({
    day,
    ml: transactions
      .filter(t => new Date(t.created_at).getDay() === index)
      .reduce((s, t) => s + t.volume_ml, 0)
  }))

  const revenueData = days.map((day, index) => ({
    day,
    revenue: transactions
      .filter(t => new Date(t.created_at).getDay() === index)
      .reduce((s, t) => s + Number(t.price), 0)
  }))

  const vol100  = transactions.filter(t => t.volume_ml === 100).length
  const vol500  = transactions.filter(t => t.volume_ml === 500).length
  const vol1000 = transactions.filter(t => t.volume_ml === 1000).length
  const total   = transactions.length || 1
  const volumeDistribution = [
    { name: '100mL',  value: Math.round((vol100  / total) * 100), color: '#0066CC' },
    { name: '500mL',  value: Math.round((vol500  / total) * 100), color: '#FFB81C' },
    { name: '1 Liter',value: Math.round((vol1000 / total) * 100), color: '#7B3FF2' },
  ]

  const mostUsed = volumeDistribution.sort((a, b) => b.value - a.value)[0]?.name ?? '—'

  // Today's data
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const todayTransactions = transactions.filter(t => new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) === today)
  const todayUsers = new Set(todayTransactions.map(t => t.user_id || t.id)).size
  const todayVol100 = todayTransactions.filter(t => t.volume_ml === 100).length
  const todayVol500 = todayTransactions.filter(t => t.volume_ml === 500).length
  const todayVol1000 = todayTransactions.filter(t => t.volume_ml === 1000).length
  const todayVolume100Total = (todayVol100 * 100) / 1000
  const todayVolume500Total = (todayVol500 * 500) / 1000
  const todayVolume1000Total = (todayVol1000 * 1000) / 1000

  return (
    <div className="page-container" style={{
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <PageHeader title="ANALYTICS" />

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <StatCard title="Total Water Dispensed" bgColor="#0066CC">
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff' }}>💧 {totalLiters} <span style={{ fontSize: '16px' }}>Liters</span></span>
        </StatCard>
        <StatCard title="Avg Daily Consumption" bgColor="#00B341">
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff' }}>{avgDaily} <span style={{ fontSize: '14px' }}>Liters/day</span></span>
        </StatCard>
        <StatCard title="Peak Usage Time" bgColor="#FFB81C">
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#1a202c' }}>—</span>
          <p style={{ fontSize: '13px', color: 'rgba(26, 32, 44, 0.7)' }}>⚠ No data available</p>
        </StatCard>
        <StatCard title="Most Used Volume" bgColor="#E5E7EB">
          <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)' }}>—</span>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>⚠ No data available</p>
        </StatCard>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>

        {/* Consumption over time */}
        <div style={{ background: 'var(--color-surface)', borderRadius: '0px', padding: '20px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.02em' }}>Water consumption over time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={consumptionData} margin={{ left: -20 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => [`${v}mL`, 'Consumed']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="ml" stroke="#0066CC" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue trend */}
        <div style={{ background: 'var(--color-surface)', borderRadius: '0px', padding: '20px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.02em' }}>Revenue trend</p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Last week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueData} margin={{ left: -20 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => [`₱${v}`, 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="revenue" fill="#00B341" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume distribution + users summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>

        {/* Donut chart */}
        <div style={{ background: 'var(--color-surface)', borderRadius: '0px', padding: '20px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.02em' }}>Volume distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={volumeDistribution} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {volumeDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Total users */}
        <StatCard title="Total Users — Today" bgColor="#7B3FF2">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <span style={{ fontSize: '48px' }}>👥</span>
            <p style={{ fontSize: '36px', fontWeight: 700, color: '#ffffff' }}>{todayUsers}</p>
          </div>
        </StatCard>

        {/* Users volume summary */}
        <div style={{ background: 'var(--color-surface)', borderRadius: '0px', padding: '20px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}>
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Users volume summary — Today</p>
          {[
            { label: '100mL', users: todayVol100, total: `${todayVolume100Total.toFixed(2)}L`, color: '#0066CC' },
            { label: '500mL', users: todayVol500, total: `${todayVolume500Total.toFixed(2)}L`, color: '#FFB81C' },
            { label: '1 Liter', users: todayVol1000, total: `${todayVolume1000Total.toFixed(2)}L`, color: '#7B3FF2' },
          ].map(({ label, users, total, color }) => (
            <div key={label} style={{ background: color, borderRadius: '0px', padding: '10px 14px', color: color === '#FFB81C' ? '#1a202c' : 'white', transition: 'all 0.2s ease', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>{label}</p>
              <p style={{ fontSize: '12px', opacity: 0.85 }}>{users} total users · {total} total volume</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
