import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'
import { getMaintenancePrediction, getAnomalies } from '../lib/maintenanceApi'

// TODO: Replace mock data with Supabase queries
// import { supabase } from '../lib/supabase'
// import { useWaterLevel } from '../hooks/useWaterLevel'

export default function Dashboard() {
const [sensorStatus, setSensorStatus] = useState(null)
const [revenueData, setRevenueData]   = useState([])
const [transactions, setTransactions] = useState([])
const [loading, setLoading]           = useState(true)
const [error, setError]               = useState(null)
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
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])

async function fetchData() {
  try {
    const [{ data: txData, error: txError }, { data: sensorData, error: sensorError }] = await Promise.all([
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('sensor_status').select('*').eq('id', 1).single(),
    ])

    if (txError) throw txError
    
    // Sensor error is OK if no sensor exists yet - don't throw it
    console.log('Sensor data:', sensorData, 'Error:', sensorError)
    
    if (txData)     setTransactions(txData)
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
    const prediction = await getMaintenancePrediction()
    const anomalyList = await getAnomalies()
    
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

  return (
    <div className="page-container" style={{ 
      padding: '20px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <PageHeader title="DASHBOARD" />

      {/* Anomalies Alert Banner */}
      {anomalies.length > 0 && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '16px',
          padding: '16px 24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(2,6,23,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#991b1b' }}>
              {anomalies.length} System Anomal{anomalies.length > 1 ? 'ies' : 'y'} Detected
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {anomalies.map((anomaly, idx) => (
              <div key={idx} style={{
                fontSize: '13px',
                color: '#991b1b',
                padding: '12px',
                background: 'rgba(220, 38, 38, 0.05)',
                borderLeft: `4px solid ${
                  anomaly.severity === 'critical' ? '#dc2626' :
                  anomaly.severity === 'high' ? '#f97316' :
                  '#eab308'
                }`,
                borderRadius: '12px',
              }}>
                <strong>{anomaly.type}</strong> — {anomaly.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text)', letterSpacing: '0.08em' }}>KEY METRICS</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {/* Water Level */}
          <StatCard title="Water Level" bgColor="#0066CC">
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#ffffff' }}>
              {sensorStatus?.power_on ? `${sensorStatus.water_level_pct}%` : '—'}
            </span>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px' }}>
              {sensorStatus?.power_on ? '✓ Sensor active' : '⚠ Not connected'}
            </p>
          </StatCard>

          {/* Transactions */}
          <StatCard title="Transactions" bgColor="#7B3FF2">
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#ffffff' }}>
              {transactions.length}
            </span>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px' }}>
              Total transactions
            </p>
          </StatCard>

          {/* Revenue */}
          <StatCard title="Revenue" bgColor="#00B341">
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#ffffff' }}>
              ₱{(transactions.reduce((sum, t) => sum + Number(t.price), 0) / 1000).toFixed(1)}K
            </span>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px' }}>
              Total sales
            </p>
          </StatCard>

          {/* Maintenance */}
          <StatCard 
            title="Maintenance" 
            bgColor={
              !maintenancePrediction ? '#E5E7EB' :
              maintenancePrediction.severity === 'critical' ? '#DC2626' :
              maintenancePrediction.severity === 'high' ? '#F97316' :
              maintenancePrediction.severity === 'medium' ? '#FFB81C' :
              '#00B341'
            }
          >
            {maintenancePrediction ? (
                <>
                <span style={{
                  fontSize: '2.75rem',
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  {maintenancePrediction.days_remaining}
                </span>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px' }}>
                  {maintenancePrediction.reason}
                </p>
              </>
            ) : (
                <>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-muted)' }}>No Data</span>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>API unavailable</p>
              </>
            )}
          </StatCard>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text)', letterSpacing: '0.08em' }}>REVENUE ANALYTICS</h3>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {/* Revenue Chart */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(2,6,23,0.06)',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text)' }}>Revenue — Last 7 Days</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px', background: 'var(--color-surface)' }}
                  formatter={(v) => [`₱${v}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="var(--color-green)" radius={[6, 6, 0, 0]} barSize={28} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(2,6,23,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.02em' }}>Quick Stats</p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 102, 204, 0.05)', borderRadius: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Avg. Daily Revenue</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-blue)' }}>
                ₱{(transactions.reduce((sum, t) => sum + Number(t.price), 0) / 7).toFixed(0)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 166, 81, 0.05)', borderRadius: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>System Status</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: 'var(--color-green)', borderRadius: '50%' }} />
                Operational
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(123, 63, 242, 0.05)', borderRadius: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Active Users</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-purple)' }}>
                {new Set(transactions.map(t => t.customer)).size}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
