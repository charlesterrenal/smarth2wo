import React from 'react'
import { useTheme } from '../context/ThemeContext'

export default function StatCard({ title, caption, subtitle, value, icon, accent, lightBg, children }) {
  const { isDark } = useTheme()
  const isLight = !isDark
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
    <div style={{
      background: isLight ? gradientLight : gradientDark,
      borderRadius: 'var(--radius-card)',
      padding: '26px',
      minHeight: '280px',
      boxShadow: 'var(--shadow-premium)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'all 0.2s ease',
      cursor: 'default',
      overflow: 'hidden',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-premium-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-premium)'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: titleColor }}>{title}</p>
        </div>
        {icon && (
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: badgeBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 10px 20px rgba(0,0,0,0.08)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 24 }) : icon}
          </div>
        )}
      </div>
      
      {icon && (
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '999px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 16px 30px rgba(15, 23, 42, 0.16)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 32 }) : icon}
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        {value !== undefined && (
          <p style={{ margin: 0, fontSize: '3.5rem', lineHeight: 1, fontWeight: 800, color: valueColor }}>{value}</p>
        )}
        {caption && (
          <p style={{ margin: '10px 0 0', fontSize: '16px', fontWeight: 600, color: captionColor }}>{caption}</p>
        )}
        {children && !value && (
          <div style={{ marginTop: '16px' }}>{children}</div>
        )}
      </div>

      {(subtitle || icon) && (
        <div style={{ marginTop: '22px', padding: '16px', background: pillBackground, borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          {icon && (
            <div style={{ width: '42px', height: '42px', borderRadius: '16px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)' }}>
              {React.isValidElement(icon) ? React.cloneElement(icon, { size: 22 }) : icon}
            </div>
          )}
          {subtitle && (
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: subtitleColor }}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  )
}
