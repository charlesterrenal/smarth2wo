import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Droplet, ArrowLeftRight, DollarSign, Wrench } from 'lucide-react'
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
      {/* Anomalies Alert Banner */}
      {anomalies.length > 0 && (
        <div style={{
          background: 'var(--color-danger-light)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-inner)',
          padding: '16px 24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(2,6,23,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-danger-dark)' }}>
              {anomalies.length} System Anomal{anomalies.length > 1 ? 'ies' : 'y'} Detected
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {anomalies.map((anomaly, idx) => (
              <div key={idx} style={{
                fontSize: '13px',
                color: 'var(--color-danger-dark)',
                padding: '12px',
                background: 'rgba(220, 38, 38, 0.05)',
                borderLeft: `4px solid ${
                  anomaly.severity === 'critical' ? 'var(--color-danger-dark)' :
                  anomaly.severity === 'high' ? 'var(--color-warning)' :
                  'var(--color-yellow)'
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
          <StatCard 
            title="Water Level" 
            accent="var(--color-blue)"
            icon={<Droplet size={20} />}
            value={sensorStatus?.power_on ? `${sensorStatus.water_level_pct}%` : '—'}
            caption="Volume remaining"
            subtitle={sensorStatus?.power_on ? '✓ Sensor active' : '⚠ Not connected'}
          />

          {/* Transactions */}
          <StatCard 
            title="Transactions" 
            accent="var(--color-purple)"
            icon={<ArrowLeftRight size={20} />}
            value={transactions.length}
            caption="Total transactions"
            subtitle="All completed orders"
          />

          {/* Revenue */}
          <StatCard 
            title="Revenue" 
            accent="var(--color-green)"
            icon={<DollarSign size={20} />}
            value={`₱${(transactions.reduce((sum, t) => sum + Number(t.price), 0) / 1000).toFixed(1)}K`}
            caption="Total sales"
            subtitle="Gross income"
          />

          {/* Maintenance */}
          <StatCard 
            title="Maintenance" 
            accent={
              !maintenancePrediction ? 'var(--color-text-muted)' :
              maintenancePrediction.severity === 'critical' ? 'var(--color-danger)' :
              maintenancePrediction.severity === 'high' ? 'var(--color-warning)' :
              maintenancePrediction.severity === 'medium' ? 'var(--color-yellow)' :
              'var(--color-warning)'
            }
            icon={<Wrench size={20} />}
            value={maintenancePrediction ? maintenancePrediction.days_remaining : '—'}
            caption={maintenancePrediction ? "Days remaining" : "No Data"}
            subtitle={maintenancePrediction ? maintenancePrediction.reason : 'API unavailable'}
          />
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
            borderRadius: 'var(--radius-card)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text)' }}>Revenue — Last 7 Days</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'var(--table-row-hover)' }}
                  contentStyle={{ borderRadius: 'var(--radius-inner)', border: '1px solid var(--color-border)', fontSize: '12px', background: 'var(--color-surface)', color: 'var(--color-text)' }}
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
            borderRadius: 'var(--radius-card)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.02em' }}>Quick Stats</p>
            
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 102, 204, 0.05)', borderRadius: '12px', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 102, 204, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Avg. Daily Revenue</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-blue)' }}>
                ₱{(transactions.reduce((sum, t) => sum + Number(t.price), 0) / 7).toFixed(0)}
              </span>
            </div>

            {(() => {
              // Get power status from localStorage as fallback for mock mode, otherwise use Supabase sensor data
              const savedPower = localStorage.getItem('mockSystemPower')
              const isOperational = sensorStatus ? sensorStatus.power_on : (savedPower !== null ? savedPower === 'true' : true);
              const color = isOperational ? 'var(--color-green)' : 'var(--color-danger)';
              const bgColor = isOperational ? 'rgba(0, 166, 81, 0.05)' : 'rgba(220, 38, 38, 0.05)';
              const text = isOperational ? 'Operational' : 'Not Operational';

              return (
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: bgColor, borderRadius: '12px', transition: 'all 0.2s ease', cursor: 'default' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = `0 6px 16px ${isOperational ? 'rgba(0, 166, 81, 0.12)' : 'rgba(220, 38, 38, 0.12)'}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>System Status</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: color, borderRadius: '50%' }} />
                    {text}
                  </span>
                </div>
              )
            })()}

            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(123, 63, 242, 0.05)', borderRadius: '12px', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(123, 63, 242, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
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
