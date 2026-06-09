import { useState, useEffect } from 'react'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Droplet, ArrowLeftRight, DollarSign, Wrench, Leaf, AlertTriangle, Info } from 'lucide-react'
import StatCard from '../components/StatCard'
import AlertCard from '../components/AlertCard'
import { supabase } from '../lib/supabase'
import { getMaintenancePrediction, getAnomalies } from '../lib/maintenanceApi'

// TODO: Replace mock data with Supabase queries
// import { supabase } from '../lib/supabase'
// import { useWaterLevel } from '../hooks/useWaterLevel'

export default function Dashboard() {
  const [sensorStatus, setSensorStatus] = useState(null)
  const [sensorHistory, setSensorHistory] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [maintenancePrediction, setMaintenancePrediction] = useState(null)
  const [anomalies, setAnomalies] = useState([])

  useEffect(() => {
    fetchData()

    // Realtime: update water level live when ESP32 posts
    const channel = supabase
      .channel('sensor_status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sensor_status'
      }, (payload) => {
        setSensorStatus(payload.new)
        // If real hardware updates the DB, clear the mock override so the real data takes over
        localStorage.removeItem('mockSystemPower')
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchData() {
    try {
      const [{ data: txData, error: txError }, { data: sensorData, error: sensorError }, { data: shData, error: shError }] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('sensor_status').select('*').eq('id', 1).single(),
        supabase.from('sensor_history').select('*').order('created_at', { ascending: true }).limit(50)
      ])

      if (txError) throw txError

      // Sensor error is OK if no sensor exists yet - don't throw it
      console.log('Sensor data:', sensorData, 'Error:', sensorError)

      if (txData) setTransactions(txData)
      if (shData) setSensorHistory(shData)
      if (sensorData && sensorData.id) setSensorStatus(sensorData)
      else setSensorStatus(null)  // Set to null if no sensor data

      // Build revenue chart data from transactions
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const revenueByDay = days.map(day => ({ day, revenue: 0 }))
      txData?.forEach(t => {
        const dayIndex = new Date(t.created_at).getDay()
        revenueByDay[dayIndex].revenue += Number(t.price)
      })
      setRevenueData(revenueByDay)

      // Fetch ML predictions from Python backend
      const savedPower = localStorage.getItem('mockSystemPower')
      const isOperational = savedPower !== null ? savedPower === 'true' : (sensorData ? sensorData.power_on : true)
      
      let currentSensorData = sensorData ? { ...sensorData } : null;
      if (currentSensorData) {
        currentSensorData.power_on = isOperational;
      } else if (savedPower !== null) {
        currentSensorData = { power_on: isOperational };
      }
      
      const prediction = await getMaintenancePrediction(currentSensorData)
      const anomalyList = await getAnomalies(currentSensorData)
      
      setMaintenancePrediction(prediction)
      setAnomalies(anomalyList)
    } catch (err) {
      console.error('Error fetching dashboard data:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '32px' }}>Loading...</div>
  if (error) return <div style={{ padding: '32px', color: 'red' }}>Error loading dashboard: {error}</div>

  const savedPower = localStorage.getItem('mockSystemPower')
  const isOperational = savedPower !== null ? savedPower === 'true' : (sensorStatus ? sensorStatus.power_on : true)

  // Format sensor history for Recharts
  const historyData = sensorHistory.map(entry => ({
    time: new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temp: entry.temperature,
    level: entry.water_level_pct
  }))

  return (
    <div className="page-container" style={{
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* Top Section: Metrics + Alerts Sidebar */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '24px',
        marginBottom: '24px'
      }}>

        {/* Left: Key Metrics */}
        <div style={{ flex: '1 1 600px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '16px', color: 'var(--color-text)', letterSpacing: '0.08em' }}>KEY METRICS</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {/* Water Level */}
            <StatCard
              title="Water Level"
              accent="var(--color-blue)"
              icon={<Droplet size={20} />}
              value={isOperational && sensorStatus ? `${sensorStatus.water_level_pct}%` : '—'}
              caption="Volume remaining"
              subtitle={isOperational ? '✓ Sensor active' : '⚠ Not connected'}
            />

            {/* Bottles Saved */}
            <StatCard
              title="Bottles Saved"
              accent="var(--color-green)"
              icon={<Leaf size={20} />}
              value={Math.floor(transactions.reduce((sum, t) => sum + t.volume_ml, 0) / 500)}
              caption="Plastic bottles saved"
              subtitle="500mL equivalents"
            />

            {/* Revenue */}
            <StatCard
              title="Revenue"
              accent="var(--color-yellow)"
              icon={<DollarSign />}
              value={`₱${(transactions.reduce((sum, t) => sum + Number(t.price), 0) / 1000).toFixed(1)}K`}
              caption="Total gross income"
              subtitle={
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Avg Daily: ₱{(transactions.reduce((sum, t) => sum + Number(t.price), 0) / 7).toFixed(0)}
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>Last 7 days</span>
                </span>
              }
            />

            {/* Maintenance */}
            <StatCard
              title="Maintenance"
              accent="var(--color-red-orange)"
              icon={<Wrench size={20} />}
              value={isOperational && maintenancePrediction ? maintenancePrediction.days_remaining : '—'}
              caption={isOperational && maintenancePrediction ? "Days remaining" : "System Offline"}
              subtitle={isOperational ? (maintenancePrediction ? maintenancePrediction.reason : 'API unavailable') : 'Machine is powered off'}
            />
          </div>

          {/* Sensor History Trends */}
          <div style={{
            marginTop: '24px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-card)',
            padding: '24px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '24px', color: 'var(--color-text)', letterSpacing: '0.08em' }}>
              WATER LEVEL HISTORY
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={historyData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-blue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} tickMargin={10} />

                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />

                <Tooltip
                  cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '12px', fontSize: '14px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />

                <Area connectNulls={true} type="monotone" name="Water Level (%)" dataKey="level" stroke="var(--color-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorLevel)" activeDot={{ r: 6 }} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Anomalies Sidebar */}
        <div style={{ flex: '0 0 180px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '16px', color: '#f97316', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <AlertTriangle size={18} />
            SYSTEM ALERTS
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            height: 'calc(100% - 38px)'
          }}>
            {/* System Status Card (Injected) */}
            <AlertCard
              title="System Status"
              accentCol={isOperational ? 'var(--color-green)' : '#6b7280'}
              icon={<Info />}
              priority={isOperational ? 'Operational' : 'Offline'}
              message={isOperational ? 'System running normally' : 'System is powered off'}
            />

            {anomalies.filter(a => a.type !== 'Power Status').map((anomaly, idx) => {
              let accentCol, icon;
              if (anomaly.severity === 'critical') {
                accentCol = '#ef4444' // Red
                icon = <AlertTriangle size={20} />
              } else if (anomaly.severity === 'high') {
                accentCol = '#f97316' // Orange
                icon = <AlertTriangle size={20} />
              } else if (anomaly.severity === 'medium') {
                accentCol = '#eab308' // Yellow
                icon = <AlertTriangle size={20} />
              } else {
                accentCol = '#6b7280' // Grey (Neutral)
                icon = <Info size={20} />
              }

              return (
                <AlertCard
                  key={idx}
                  title={anomaly.type}
                  accentCol={accentCol}
                  icon={icon}
                  priority={anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)}
                  message={anomaly.message}
                />
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
