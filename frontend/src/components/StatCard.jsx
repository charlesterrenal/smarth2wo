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
      padding: isSmall ? '14px' : '16px',
      borderRadius: 'var(--radius-card)',
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
        <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
          <p style={{ margin: 0, fontSize: isSmall ? '10px' : '11px', fontWeight: 700, color: titleColor, textTransform: 'uppercase', letterSpacing: '0', overflowWrap: 'normal' }}>{title}</p>
        </div>
        {icon && (
          <div style={{ flexShrink: 0, width: isSmall ? '28px' : '32px', height: isSmall ? '28px' : '32px', borderRadius: isSmall ? '8px' : '10px', background: badgeBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 8px 16px rgba(0,0,0,0.08)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: isSmall ? 14 : 16 }) : icon}
          </div>
        )}
      </div>

      {!isSmall && icon && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
          <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '999px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 18 }) : icon}
          </div>
        </div>
      )}

      <div style={{ marginTop: isSmall ? '8px' : '16px' }}>
        {value !== undefined && (
          <p style={{ margin: 0, fontSize: isSmall ? '1.25rem' : ((typeof value === 'string' && value.length > 8) ? '1.25rem' : '1.5rem'), lineHeight: 1.1, fontWeight: 800, color: valueColor, overflowWrap: 'anywhere' }}>{value}</p>
        )}
        {caption && (
          <p style={{ margin: isSmall ? '4px 0 0' : '6px 0 0', fontSize: isSmall ? '11px' : '13px', fontWeight: 600, color: captionColor }}>{caption}</p>
        )}
        {children && !value && (
          <div style={{ marginTop: isSmall ? '8px' : '12px' }}>{children}</div>
        )}
      </div>

      {(subtitle || icon) && (
        <div style={{ marginTop: isSmall ? '10px' : '14px', padding: isSmall ? '6px' : '8px', background: pillBackground, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon && (
            <div style={{ flexShrink: 0, width: isSmall ? '24px' : '26px', height: isSmall ? '24px' : '26px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 4px 10px rgba(15, 23, 42, 0.08)' }}>
              {React.isValidElement(icon) ? React.cloneElement(icon, { size: isSmall ? 12 : 14 }) : icon}
            </div>
          )}
          {subtitle && (
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 600, color: subtitleColor, lineHeight: 1.2, overflowWrap: 'break-word', hyphens: 'auto' }}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  )
}
