import React from 'react'

export default function AlertCard({ title, icon, priority, message, accentCol, time }) {
  // Using a very faint background for the icon container
  const iconBg = `color-mix(in srgb, ${accentCol} 15%, transparent)`

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
      border: '1px solid #F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'all 0.2s ease',
      cursor: 'default'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.04)'; }}
    >
      {/* Top row: Title and Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px' }}>
          <span style={{ 
            width: '6px', height: '6px', 
            borderRadius: '50%', 
            background: accentCol, 
            boxShadow: `0 0 6px ${accentCol}` 
          }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
            {title}
          </span>
        </div>
        {icon && (
          <div style={{ 
            width: '24px', height: '24px', 
            borderRadius: '8px', 
            background: iconBg, 
            color: accentCol,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 14 }) : icon}
          </div>
        )}
      </div>

      {/* Middle row: Priority Value */}
      <div style={{ marginTop: '2px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
          {priority}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
          Priority Level
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#F1F5F9', margin: '8px 0' }} />

      {/* Bottom row: Details (Message) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px' }}>
            STATUS MESSAGE
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: accentCol }}>
            {message}
          </div>
        </div>
        {time && (
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px' }}>
              TIME
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              {time}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
