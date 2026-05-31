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
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s',
      cursor: 'pointer',
      transform: 'translateY(0)',
      boxShadow: '0 6px 18px rgba(2,6,23,0.06)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-6px)'
      e.currentTarget.style.boxShadow = '0 18px 40px rgba(2,6,23,0.12)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 6px 18px rgba(2,6,23,0.06)'
    }}>
      {title && (
        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', color: textColor, textTransform: 'uppercase', marginBottom: '4px' }}>
          {title}
        </span>
      )}
      {value && (
        <span style={{ fontSize: '2.75rem', lineHeight: 1, fontWeight: 800, color: textColor }}>
          {value}
        </span>
      )}
      {icon && <div style={{ marginTop: '6px' }}>{icon}</div>}
      {children && <div style={{ color: textColor }}>{children}</div>}
    </div>
  )
}
