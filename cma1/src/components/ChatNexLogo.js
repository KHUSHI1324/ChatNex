import React from 'react';

/**
 * ChatNex Official Brand Logo
 * Premium chat messenger badge with emerald gradient, glass highlight, and crisp nexus-chat vector.
 */
export default function ChatNexLogo({
  size = 36,
  showText = false,
  textSize = '1.25rem',
  textColor = '#e9edef',
  className = '',
  style = {},
  glow = true,
  onClick,
}) {
  const badgeRadius = Math.round(size * 0.28);
  const iconSize = Math.round(size * 0.62);

  return (
    <div
      className={`chatnex-brand-logo ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div
        className="chatnex-logo-badge"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${badgeRadius}px`,
          background: 'linear-gradient(135deg, #00f298 0%, #00a884 52%, #046347 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: glow
            ? '0 4px 14px rgba(0, 168, 132, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
            : 'inset 0 1px 1px rgba(255, 255, 255, 0.3)',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Top Gloss Highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '42%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
            borderRadius: `${badgeRadius}px ${badgeRadius}px 0 0`,
          }}
        />

        {/* Central Vector: Crisp White Chat Bubble + Emerald Nexus Lightning */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'relative',
            zIndex: 2,
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))',
          }}
        >
          {/* Crisp White Chat Bubble Silhouette */}
          <path
            d="M20.5 11C20.5 15.1421 16.9183 18.5 12.5 18.5C11.1096 18.5 9.80099 18.1698 8.66487 17.5864L3.8 18.8C3.32943 18.9323 2.90226 18.5051 3.03454 18.0346L4.35 14.15C3.51 13.23 3 12.18 3 11C3 6.85786 7.25 3.5 12.5 3.5C16.9183 3.5 20.5 6.85786 20.5 11Z"
            fill="#ffffff"
          />

          {/* Dynamic Nexus Bolt / Pulse Symbol Inside */}
          <path
            d="M13.6 6.8L8.6 12.3H12.2L11 16.2L16.4 10.3H12.6L13.6 6.8Z"
            fill="#00a884"
          />
        </svg>
      </div>

      {showText && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: textColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          Chat<span style={{ color: '#00a884' }}>Nex</span>
        </span>
      )}
    </div>
  );
}
