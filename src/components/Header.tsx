import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="relative border-b border-[#e2e8f0] dark:border-[#1e2d45] bg-white/80 dark:bg-[#080b14]/80 backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded border border-[#00d4ff]/40 flex items-center justify-center text-[#0f172a] dark:text-[#e2e8f0]">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="font-mono text-base font-bold text-[#0f172a] dark:text-[#e2e8f0] glitch-title tracking-tight">
              COMPARADOR<span className="text-[#00d4ff]">_IA</span>
            </h1>
            <p className="text-[10px] text-[#334155] dark:text-[#f5f6f7] font-mono tracking-widest uppercase mt-0.5">
              Análisis arquitectónico desde config.json
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#334155] dark:text-[#f5f6f7]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            localhost:5050
          </div>
          <div className="text-[10px] font-mono px-2 py-1 border border-[#e2e8f0] dark:border-[#1e2d45] rounded text-[#334155] dark:text-[#f5f6f7]">
            v0.1
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
