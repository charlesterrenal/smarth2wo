import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'
import { Droplet, Activity, Clock, BarChart2, Users, Leaf } from 'lucide-react'
import StatCard from '../components/StatCard'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'

export default function Analytics() {
  const { is24Hour } = useTheme()
  const [transactions, setTransactions] = useState([])
  const [sensorHistory, setSensorHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!isSupabaseConfigured) {
          console.warn("Supabase is not configured.")
          setTransactions([])
          setSensorHistory([])
          return
        }

        const [{ data: txData, error: queryError }, { data: shData, error: shError }] = await Promise.all([
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('sensor_history').select('*').order('created_at', { ascending: true }).limit(50)
        ])

        if (queryError) throw queryError
        setTransactions(txData ?? [])
        if (shData) setSensorHistory(shData)
      } catch (err) {
        console.error('Error fetching analytics data:', err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div style={{ padding: '32px' }}>Loading...</div>
  if (error) return <div style={{ padding: '32px', color: 'red' }}>Error loading analytics: {error}</div>

  // Compute stats from real data
  const totalLiters = transactions.reduce((s, t) => s + t.volume_ml, 0) / 1000
  const uniqueDays = [...new Set(transactions.map(t => t.created_at?.slice(0, 10)))].length
  const avgDaily = uniqueDays > 0 ? (totalLiters / uniqueDays).toFixed(1) : 0

  const bottlesSaved = Math.floor((totalLiters * 1000) / 500)

  // Peak Usage Time calculation
  let peakUsageString = "—"
  let peakCaption = "No data available"
  if (transactions.length > 0) {
    const hourCounts = {}
    transactions.forEach(t => {
      if (t.created_at) {
        const hour = new Date(t.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
    })

    let peakHour = null
    let maxCount = -1
    for (const [h, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count
        peakHour = parseInt(h)
      }
    }

    if (peakHour !== null) {
      const formatHour = (h) => {
        const ampm = h >= 12 ? 'PM' : 'AM'
        const hr12 = h % 12 || 12
        return `${hr12}:00 ${ampm}`
      }
      peakUsageString = `${formatHour(peakHour)} - ${formatHour(peakHour + 1)}`
      peakCaption = `${maxCount} transactions`
    }
  }

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

  const vol100 = transactions.filter(t => t.volume_ml === 100).length
  const vol500 = transactions.filter(t => t.volume_ml === 500).length
  const vol1000 = transactions.filter(t => t.volume_ml === 1000).length
  const total = transactions.length || 1
  const volumeDistribution = [
    { name: '100mL', value: Math.round((vol100 / total) * 100), color: 'var(--color-blue)' },
    { name: '500mL', value: Math.round((vol500 / total) * 100), color: 'var(--color-yellow)' },
    { name: '1 Liter', value: Math.round((vol1000 / total) * 100), color: 'var(--color-purple)' },
  ]

  const mostUsed = volumeDistribution.sort((a, b) => b.value - a.value)[0]?.name ?? '—'

  // Format sensor history for Recharts
  const historyData = sensorHistory.map(entry => ({
    time: new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24Hour }),
    temp: entry.temperature,
    level: entry.water_level_pct
  }))

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
      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatCard
          title="Total Water Dispensed"
          accent="var(--color-blue)"
          value={`${totalLiters}L`}
          icon={<Droplet size={20} />}
          caption="Lifetime volume"
        />
        <StatCard
          title="Avg Daily Water Consumption"
          accent="var(--color-sky)"
          value={`${avgDaily}L`}
          icon={<Activity size={20} />}
          caption="Per day average"
        />
        <StatCard
          title="Bottles Saved"
          accent="var(--color-green)"
          value={bottlesSaved}
          icon={<Leaf size={20} />}
          caption="500mL equivalents"
        />
        <StatCard
          title="Peak Usage Time"
          accent="var(--color-pink)"
          value={peakUsageString}
          icon={<Clock size={20} />}
          caption={peakCaption}
        />
        <StatCard
          title="Most Used Volume"
          accent="var(--color-purple)"
          value={mostUsed}
          icon={<BarChart2 size={20} />}
          caption="Preferred size"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>

        {/* Consumption over time */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.02em', color: 'var(--color-text)' }}>Water consumption over time</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={consumptionData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-blue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 13, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} tickMargin={10} />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '3 3' }}
                formatter={(v) => [`${v}mL`, 'Consumed']}
                contentStyle={{ borderRadius: '12px', fontSize: '14px', fontWeight: '500', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                itemStyle={{ color: 'var(--color-blue)', fontWeight: '700' }}
              />
              <Area type="monotone" dataKey="ml" stroke="var(--color-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorMl)" activeDot={{ r: 6, fill: 'var(--color-blue)', stroke: 'var(--color-surface)', strokeWidth: 2 }} animationDuration={1500} animationEasing="ease-in-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue trend */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.02em', color: 'var(--color-text)' }}>Revenue trend</p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Last week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueData} margin={{ left: 0, right: 10, top: 10 }}>
              <XAxis dataKey="day" tick={{ fontSize: 14, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'var(--table-row-hover)' }} formatter={(v) => [`₱${v}`, 'Revenue']} contentStyle={{ borderRadius: 'var(--radius-inner)', fontSize: '14px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
              <Bar dataKey="revenue" fill="var(--color-yellow)" radius={[6, 6, 0, 0]} barSize={26} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume distribution + users summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* Donut chart */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', letterSpacing: '0.02em', color: 'var(--color-text)' }}>Volume distribution</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '24px', minHeight: '240px' }}>
            <div style={{ width: '240px', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={volumeDistribution}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={2}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {volumeDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: 'var(--radius-inner)', fontSize: '14px', background: '#ffffff', color: '#0f172a', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} itemStyle={{ color: '#0f172a', fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '100px' }}>
              {volumeDistribution.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: entry.color }} />
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '14px' }}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users volume summary */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '24px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>Users volume summary — Today</p>
          {[
            { label: '100mL', users: todayVol100, total: `${todayVolume100Total.toFixed(2)}L`, color: 'var(--color-blue)' },
            { label: '500mL', users: todayVol500, total: `${todayVolume500Total.toFixed(2)}L`, color: 'var(--color-yellow)' },
            { label: '1 Liter', users: todayVol1000, total: `${todayVolume1000Total.toFixed(2)}L`, color: 'var(--color-purple)' },
          ].map(({ label, users, total, color }) => (
            <div
              key={label}
              style={{
                background: color,
                borderRadius: 'var(--radius-inner)',
                padding: '16px 20px',
                color: 'white',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(15, 23, 42, 0.04)',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02) translateX(4px)'
                e.currentTarget.style.boxShadow = `0 12px 24px -4px color-mix(in srgb, ${color} 30%, transparent), 0 8px 16px rgba(15, 23, 42, 0.08)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateX(0)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.04)'
              }}
            >
              <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px' }}>{label}</p>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>{users} total users · {total} total volume</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
