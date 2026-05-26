import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label="Alternar tema"
      onClick={toggleTheme}
      className="relative flex-shrink-0 rounded-full hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/50"
      style={{ width: 52, height: 28 }}
    >
      {/* Track */}
      <span
        className="absolute inset-0 rounded-full transition-colors duration-300"
        style={{ background: isDark ? '#334155' : '#e2e8f0' }}
      />
      {/* Thumb */}
      <span
        className="absolute w-[22px] h-[22px] rounded-full flex items-center justify-center text-[13px] leading-none transition-all duration-300 ease-in-out"
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          left: isDark ? '27px' : '3px',
          top: '3px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
