import React from 'react'
import { useTheme } from '../context/ThemeContext'

export default function StatCard({ title, caption, subtitle, value, icon, accent, lightBg, size = 'default', children }) {
  const { isDark } = useTheme()
  const isLight = !isDark
  const isSmall = size === 'small'
  
  const titleColor = isLight ? '#111827' : '#F8FAFC'
  const valueColor = isLight ? '#111827' : '#FFFFFF'
  const captionColor = isLight ? '#374151' : '#CBD5E1'
  const subtitleColor = isLight ? '#374151' : '#CBD5E1'
  const badgeBackground = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)'
  const pillBackground = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)'

  const gradientLight = lightBg
    ? `linear-gradient(135deg, ${lightBg}, color-mix(in srgb, ${accent} 20%, transparent))`
    : (accent ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, transparent), color-mix(in srgb, ${accent} 80%, transparent))` : 'var(--color-surface)')

  const gradientDark = accent
    ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, transparent), color-mix(in srgb, ${accent} 80%, transparent))`
    : 'var(--color-surface)'

  return (
    <div className="stat-card" style={{
      background: isLight ? gradientLight : gradientDark,
      padding: isSmall ? '14px' : '20px',
      minHeight: isSmall ? '100px' : '160px',
      boxShadow: isSmall ? 'var(--shadow-card)' : 'var(--shadow-premium)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'visible',
      zIndex: 1,
      '--card-accent': accent || 'var(--color-warning)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <p style={{ margin: 0, fontSize: isSmall ? '12px' : '15px', fontWeight: 700, color: titleColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        </div>
        {icon && (
          <div style={{ width: isSmall ? '28px' : '36px', height: isSmall ? '28px' : '36px', borderRadius: isSmall ? '8px' : '12px', background: badgeBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 8px 16px rgba(0,0,0,0.08)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: isSmall ? 14 : 18 }) : icon}
          </div>
        )}
      </div>

      {!isSmall && icon && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '999px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.16)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 22 }) : icon}
          </div>
        </div>
      )}

      <div style={{ marginTop: isSmall ? '8px' : '16px' }}>
        {value !== undefined && (
          <p style={{ margin: 0, fontSize: isSmall ? '1.5rem' : ((typeof value === 'string' && value.length > 10) ? '1.25rem' : '2rem'), lineHeight: 1.1, fontWeight: 800, color: valueColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
        )}
        {caption && (
          <p style={{ margin: isSmall ? '4px 0 0' : '6px 0 0', fontSize: isSmall ? '11px' : '13px', fontWeight: 600, color: captionColor }}>{caption}</p>
        )}
        {children && !value && (
          <div style={{ marginTop: isSmall ? '8px' : '12px' }}>{children}</div>
        )}
      </div>

      {(subtitle || icon) && (
        <div style={{ marginTop: isSmall ? '12px' : '16px', padding: isSmall ? '8px' : '12px', background: pillBackground, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && (
            <div style={{ width: isSmall ? '24px' : '32px', height: isSmall ? '24px' : '32px', borderRadius: isSmall ? '8px' : '12px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)' }}>
              {React.isValidElement(icon) ? React.cloneElement(icon, { size: isSmall ? 12 : 16 }) : icon}
            </div>
          )}
          {subtitle && (
            <p style={{ margin: 0, fontSize: isSmall ? '11px' : '12px', fontWeight: 600, color: subtitleColor }}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  )
}
