// Mock data for development/demo mode when Supabase is not configured

export const mockTransactions = [
  {
    id: 1,
    customer: 'John Doe',
    payment_method: 'credit card',
    volume_ml: 500,
    price: 2.50,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed'
  },
  {
    id: 2,
    customer: 'Jane Smith',
    payment_method: 'mobile',
    volume_ml: 1000,
    price: 4.50,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    status: 'completed'
  },
  {
    id: 3,
    customer: 'Bob Wilson',
    payment_method: 'cash',
    volume_ml: 100,
    price: 1.00,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    status: 'completed'
  },
  {
    id: 4,
    customer: 'Alice Johnson',
    payment_method: 'credit card',
    volume_ml: 500,
    price: 2.50,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    status: 'completed'
  },
  {
    id: 5,
    customer: 'Charlie Brown',
    payment_method: 'mobile',
    volume_ml: 1000,
    price: 4.50,
    created_at: new Date(Date.now() - 432000000).toISOString(),
    status: 'completed'
  },
]

export const mockSchedule = [
  {
    id: 1,
    active: true,
    start_time: '06:00',
    end_time: '09:00',
    description: 'Morning maintenance window'
  },
  {
    id: 2,
    active: true,
    start_time: '12:00',
    end_time: '14:00',
    description: 'Midday check'
  },
  {
    id: 3,
    active: false,
    start_time: '18:00',
    end_time: '20:00',
    description: 'Evening maintenance'
  },
  {
    id: 4,
    active: true,
    start_time: '22:00',
    end_time: '06:00',
    description: 'Night shutdown'
  },
]

export const mockLogs = [
  {
    id: 1,
    event: 'System startup',
    status: 'success',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    message: 'System initialized successfully'
  },
  {
    id: 2,
    event: 'Sensor reading',
    status: 'success',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    message: 'Water level: 85%'
  },
  {
    id: 3,
    event: 'Transaction processed',
    status: 'success',
    created_at: new Date(Date.now() - 900000).toISOString(),
    message: 'Transaction ID: 12345'
  },
  {
    id: 4,
    event: 'Maintenance alert',
    status: 'warning',
    created_at: new Date(Date.now() - 600000).toISOString(),
    message: 'Filter replacement recommended'
  },
  {
    id: 5,
    event: 'Connection lost',
    status: 'error',
    created_at: new Date(Date.now() - 300000).toISOString(),
    message: 'Cannot reach backend API'
  },
  {
    id: 6,
    event: 'Reconnected',
    status: 'success',
    created_at: new Date(Date.now() - 60000).toISOString(),
    message: 'Connection restored'
  },
]
