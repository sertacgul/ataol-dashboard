import { useState, useEffect } from 'react'

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter') // enter -> visible -> exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100)
    const t2 = setTimeout(() => setPhase('exit'), 1800)
    const t3 = setTimeout(() => onFinish(), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2563EB] transition-opacity duration-500"
      style={{ opacity: phase === 'exit' ? 0 : 1 }}
    >
      <div
        className="flex flex-col items-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
        }}
      >
        {/* Logo */}
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-lg">
          <svg viewBox="0 0 40 40" className="w-10 h-10">
            <circle cx="20" cy="20" r="14" fill="none" stroke="#2563EB" strokeWidth="1.5" opacity="0.3" />
            <circle cx="20" cy="20" r="10" fill="none" stroke="#2563EB" strokeWidth="1.5" opacity="0.5" />
            <text x="20" y="26" textAnchor="middle" fontWeight="800" fontSize="18" fill="#2563EB" fontFamily="system-ui">A</text>
            <path d="M28 14l4-3" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            <path d="M30 12l2-1" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Brand */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">AskDesk</h1>
        <p className="text-sm text-white/70">Powered by OperIQ AI</p>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-6">
          <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  )
}
