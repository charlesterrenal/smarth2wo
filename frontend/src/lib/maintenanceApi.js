// API functions for maintenance prediction and anomaly detection
// Calls the Python FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function getMaintenancePrediction(sensorData) {
  try {
    const payload = {
      water_level_pct: 80,
      flow_rate: 2.5,
      power_on: true,
      ...(sensorData || {})
    }

    const response = await fetch(`${API_BASE_URL}/api/maintenance/predict?simulate=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('Failed to fetch maintenance prediction')
    return await response.json()
  } catch (err) {
    console.error('Error fetching maintenance prediction:', err)
    // Return demo prediction if backend is unavailable
    return {
      status: 'OK',
      days_remaining: 14,
      confidence: 0.87,
      reason: 'Filter age approaching service interval'
    }
  }
}

export async function getAnomalies(sensorData) {
  try {
    const payload = {
      water_level_pct: 80,
      flow_rate: 2.5,
      power_on: true,
      ...(sensorData || {})
    }

    const response = await fetch(`${API_BASE_URL}/api/anomalies/detect?simulate=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('Failed to fetch anomalies')
    return await response.json()
  } catch (err) {
    console.error('Error fetching anomalies:', err)
    // Return demo anomalies if backend is unavailable
    return []
  }
}
