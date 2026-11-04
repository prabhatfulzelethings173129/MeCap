"use client";

export default function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  return (
    <div className="rounded-lg border border-[#1c242d] bg-[#0f141a] px-6 py-12 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#8b949e]">
        MeCap · simulated exchange
      </div>
      <h2 className="mt-2 text-2xl font-bold text-[#e6edf3]">IPO yourself.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#8b949e]">
        Your logged time is the trading activity. Study, work and workouts buy the tape; scrolling
        dumps it. Every day your life closes at a price. 100% simulation — no real money, not
        financial advice.
      </p>
      <button
        type="button"
        onClick={onLoadSample}
        className="mt-6 rounded-md bg-[#16c784] px-5 py-2.5 text-sm font-semibold text-[#04120c] transition hover:brightness-110"
      >
        Load sample data
      </button>
      <p className="mt-3 text-xs text-[#8b949e]">…or log your first day in the panel on the right.</p>
    </div>
  );
}
