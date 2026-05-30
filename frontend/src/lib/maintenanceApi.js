// API functions for maintenance prediction and anomaly detection
// Calls the Python FastAPI backend at http://localhost:8000

const API_BASE_URL = 'http://localhost:8000'

export async function getMaintenancePrediction() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maintenance/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        water_level: 75,
        filter_age_days: 45,
        daily_usage_liters: 12.5,
        error_count: 2,
      })
    })

    if (!response.ok) throw new Error('Failed to fetch maintenance prediction')
    return await response.json()
  } catch (err) {
    console.error('Error fetching maintenance prediction:', err)
    // Return demo prediction if backend is unavailable
    return {
      status: 'OK',
      next_maintenance_days: 14,
      confidence: 0.87,
      reason: 'Filter age approaching service interval'
    }
  }
}

export async function getAnomalies() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/anomalies/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        water_level: 75,
        temperature: 22,
        pressure: 2.5,
        flow_rate: 45,
      })
    })

    if (!response.ok) throw new Error('Failed to fetch anomalies')
    return await response.json()
  } catch (err) {
    console.error('Error fetching anomalies:', err)
    // Return demo anomalies if backend is unavailable
    return []
  }
}
