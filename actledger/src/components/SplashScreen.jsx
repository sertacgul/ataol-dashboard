import { useState, useEffect } from 'react'

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100)
    const t2 = setTimeout(() => setPhase('exit'), 2200)
    const t3 = setTimeout(() => onFinish(), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-600"
      style={{
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 40%, #2563EB 70%, #1E40AF 100%)',
        opacity: phase === 'exit' ? 0 : 1,
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute"
        style={{
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.15) 0%, transparent 70%)',
          animation: 'splashGlow 3s ease-in-out infinite',
        }}
      />

      {/* Pulse rings */}
      <div className="absolute" style={{
        width: 200, height: 200, borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        animation: 'pulseRing 2.5s ease-out infinite',
      }} />
      <div className="absolute" style={{
        width: 200, height: 200, borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        animation: 'pulseRing 2.5s ease-out infinite 0.8s',
      }} />

      {/* Dot pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Content */}
      <div
        className="relative flex flex-col items-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(24px) scale(0.9)' : 'translateY(0) scale(1)',
          filter: phase === 'enter' ? 'blur(8px)' : 'blur(0px)',
        }}
      >
        {/* Corporate Logo */}
        <div style={{
          width: 80, height: 80,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <svg width="52" height="52" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="10" fill="rgba(255,255,255,0.15)" />
            <circle cx="22" cy="22" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" />
            <ellipse cx="22" cy="22" rx="12" ry="4" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <path d="M14 34L22 10L30 34" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="17" y1="26" x2="27" y2="26" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            <line x1="27" y1="13" x2="35" y2="7" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" />
            <polyline points="31,6 35,7 34,11" fill="none" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Brand name */}
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
          color: '#FFFFFF', marginBottom: 8,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}>AskDesk</h1>

        <p style={{
          fontSize: 13, color: 'rgba(191, 219, 254, 0.8)',
          letterSpacing: '0.5px', fontWeight: 500, marginBottom: 36,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}>POWERED BY ATAOL AI TECHS</p>

        {/* Loading bar */}
        <div style={{
          width: 160, height: 2, borderRadius: 1,
          background: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 1,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.6), #93C5FD)',
            animation: phase !== 'enter' ? 'splashBar 1.8s ease-out forwards' : 'none',
          }} />
        </div>
      </div>
    </div>
  )
}
