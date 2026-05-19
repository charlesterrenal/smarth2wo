export default function StatCard({ title, value, icon, borderColor, bgColor, children }) {
  // If borderColor is provided (old style), convert to new style
  const color = bgColor || borderColor || 'var(--color-blue)'
  
  // Determine if dark background (use white text)
  const isDarkBg = bgColor && !bgColor.includes('var(--color')
  const isLightBg = bgColor === '#F3F4F6' || bgColor === '#E5E7EB' || bgColor === '#FFFFFF'
  
  const textColor = isDarkBg && !isLightBg ? '#ffffff' : 'var(--color-text)'
  const mutedColor = isDarkBg && !isLightBg ? 'rgba(255, 255, 255, 0.85)' : 'var(--color-text-muted)'
  
  // Extract RGB values for hover effect
  const isVarColor = color.includes('var(--color')
  
  return (
    <div style={{
      background: color.includes('var(--color') ? 'var(--color-surface)' : color,
      border: color.includes('var(--color') ? `1.5px solid ${color}` : `1.5px solid transparent`,
      borderRadius: '0px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      transform: 'translateY(0)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.18)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)'
    }}>
      {title && (
        <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', color: textColor, textTransform: 'uppercase', marginBottom: '4px' }}>
          {title}
        </span>
      )}
      {value && (
        <span style={{ fontSize: '32px', fontWeight: 600, color: textColor }}>
          {value}
        </span>
      )}
      {icon && <div style={{ marginTop: '4px' }}>{icon}</div>}
      {children && <div style={{ color: textColor }}>{children}</div>}
    </div>
  )
}
