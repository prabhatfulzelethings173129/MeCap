"use client";

interface TopBarProps {
  hasData: boolean;
  onLoadSample: () => void;
  onReset: () => void;
}

export default function TopBar({ hasData, onLoadSample, onReset }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#1c242d] bg-[#0a0e12]/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-widest">
            <span className="text-[#e6edf3]">ME</span>
            <span className="text-[#16c784]">CAP</span>
          </span>
          <span className="hidden text-[10px] uppercase tracking-wider text-[#8b949e] sm:inline">
            personal exchange · sim
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="rounded-md border border-[#1c242d] bg-[#0f141a] px-3 py-1.5 text-xs font-medium text-[#e6edf3] transition-colors hover:border-[#16c784] hover:text-[#16c784]"
          >
            Load sample data
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasData}
            className="rounded-md border border-[#1c242d] bg-[#0f141a] px-3 py-1.5 text-xs font-medium text-[#ea3943] transition-colors hover:border-[#ea3943] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset data
          </button>
        </div>
      </div>
    </header>
  );
}
