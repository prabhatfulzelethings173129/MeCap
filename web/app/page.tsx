"use client";

import { useEffect, useMemo, useState } from "react";
import AnalystNote from "@/components/AnalystNote";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import HistoryTab from "@/components/HistoryTab";
import PriceChart from "@/components/PriceChart";
import RecordsTab from "@/components/RecordsTab";
import StatCards from "@/components/StatCards";
import TodayPanel from "@/components/TodayPanel";
import TopBar from "@/components/TopBar";
import TradesTab from "@/components/TradesTab";
import {
  buildHistory,
  DEFAULT_PROFILE,
  DEFAULT_RATINGS,
  IPO_PRICE,
  stats as computeStats,
  todayStr,
  tradeLog,
  weeklyStats,
} from "@/lib/engine";
import { clear as clearStorage, load, save } from "@/lib/storage";
import { Block, Category, DayResult, ParsedBlock, Profile, Rating } from "@/lib/types";
import { generateSample } from "@/lib/sample";

type TabId = "trades" | "history" | "records";

const TABS: { id: TabId; label: string }[] = [
  { id: "trades", label: "Trades" },
  { id: "history", label: "History" },
  { id: "records", label: "Records" },
];

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [startDate, setStartDate] = useState("");
  const [isSample, setIsSample] = useState(false);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [tab, setTab] = useState<TabId>("trades");

  useEffect(() => {
    const stored = load();
    const t = todayStr();
    setToday(t);
    if (stored) {
      setProfile(stored.profile);
      setBlocks(stored.blocks);
      setStartDate(stored.startDate || t);
      setIsSample(stored.isSample);
    } else {
      setStartDate(t);
    }
    setSelectedDate(t);
    setMounted(true);
  }, []);

  // Persist whenever the dataset changes (never before the first load).
  useEffect(() => {
    if (!mounted || !today) return;
    if (!profile && blocks.length === 0) return;
    save({ profile: profile ?? DEFAULT_PROFILE, blocks, startDate: startDate || today, isSample });
  }, [mounted, today, profile, blocks, startDate, isSample]);

  const effStart = useMemo(() => {
    let s = startDate || today;
    for (const b of blocks) {
      if (b.date < s) s = b.date;
    }
    return s;
  }, [startDate, blocks, today]);

  const history = useMemo<DayResult[]>(
    () => (today ? buildHistory(blocks, effStart, today) : []),
    [blocks, effStart, today],
  );
  const st = useMemo(() => computeStats(history, blocks), [history, blocks]);
  const trades = useMemo(() => tradeLog(blocks, history), [blocks, history]);
  const weekly = useMemo(
    () => (history.length > 0 ? weeklyStats(history, blocks) : null),
    [history, blocks],
  );

  const shownProfile = profile ?? DEFAULT_PROFILE;
  const hasBlocks = blocks.length > 0;

  const sectors = useMemo(() => {
    const per = new Map<Category, { minutes: number; rating: Rating }>();
    for (const b of blocks) {
      if (b.date !== selectedDate) continue;
      const cur = per.get(b.category);
      if (cur) cur.minutes += b.minutes;
      else per.set(b.category, { minutes: b.minutes, rating: b.rating });
    }
    return [...per.entries()]
      .map(([category, v]) => ({ category, minutes: v.minutes, rating: v.rating }))
      .sort((a, z) => z.minutes - a.minutes);
  }, [blocks, selectedDate]);

  function addBlocks(newBlocks: Block[]): void {
    setBlocks((prev) => [...prev, ...newBlocks]);
    setProfile((prev) => prev ?? DEFAULT_PROFILE);
    setIsSample(false);
    setStartDate((prev) => {
      let s = prev || today;
      for (const b of newBlocks) {
        if (b.date < s) s = b.date;
      }
      return s;
    });
  }

  function handleParsed(parsed: ParsedBlock[], date: string): void {
    const base = Date.now();
    addBlocks(
      parsed.map((p, i) => ({
        id: `p${base}-${i}`,
        date,
        activity: p.activity,
        category: p.category,
        minutes: p.minutes,
        rating: p.rating,
      })),
    );
  }

  function handleManual(
    item: { activity: string; category: Category; minutes: number },
    date: string,
  ): void {
    addBlocks([
      {
        id: `m${Date.now()}`,
        date,
        activity: item.activity,
        category: item.category,
        minutes: item.minutes,
        rating: DEFAULT_RATINGS[item.category],
      },
    ]);
  }

  function handleLoadSample(): void {
    if (hasBlocks && !isSample && !window.confirm("Replace your current data with sample data?")) {
      return;
    }
    const t = today || todayStr();
    const sample = generateSample(t);
    setProfile(sample.profile);
    setBlocks(sample.blocks);
    setStartDate(sample.startDate);
    setIsSample(true);
    setSelectedDate(t);
    setTab("trades");
  }

  function handleReset(): void {
    if (!window.confirm("Reset all data? This clears your profile, blocks and price history.")) {
      return;
    }
    clearStorage();
    setProfile(null);
    setBlocks([]);
    setIsSample(false);
    setStartDate(today || todayStr());
    setSelectedDate(today || todayStr());
  }

  if (!mounted) {
    // Stable placeholder — anything date-dependent runs only after mount.
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0e12] text-[#e6edf3]">
        <TopBar hasData={false} onLoadSample={handleLoadSample} onReset={handleReset} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <div className="h-64 animate-pulse rounded-lg border border-[#1c242d] bg-[#0f141a]" />
        </main>
        <footer className="mt-auto border-t border-[#1c242d] py-4">
          <p className="text-center font-mono text-[11px] text-[#8b949e]">
            MeCap · IPO yourself. · Simulated market. No real money. Not financial advice.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e12] text-[#e6edf3]">
      <TopBar hasData={hasBlocks} onLoadSample={handleLoadSample} onReset={handleReset} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Header
          name={shownProfile.name}
          ticker={shownProfile.ticker}
          currentPrice={st.currentPrice}
          todayPct={st.todayPct}
          isSample={isSample}
        />

        <div className="mt-5">
          <StatCards stats={st} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {hasBlocks ? (
              <>
                <PriceChart history={history} ipoPrice={IPO_PRICE} />

                <div className="rounded-lg border border-[#1c242d] bg-[#0f141a]">
                  <div className="flex gap-1 border-b border-[#1c242d] px-3 pt-3">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
                          tab === t.id
                            ? "bg-[#1c242d] text-[#e6edf3]"
                            : "text-[#8b949e] hover:text-[#e6edf3]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {tab === "trades" && <TradesTab trades={trades} />}
                    {tab === "history" && <HistoryTab history={history} today={today} />}
                    {tab === "records" && <RecordsTab stats={st} />}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState onLoadSample={handleLoadSample} />
            )}
          </div>

          <div className="space-y-6">
            <TodayPanel
              today={today}
              selectedDate={selectedDate || today}
              onDateChange={setSelectedDate}
              onParsedBlocks={handleParsed}
              onManualBlock={handleManual}
              sectors={sectors}
            />
            <AnalystNote stats={st} profile={shownProfile} weekly={weekly} />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#1c242d] py-4">
        <p className="text-center font-mono text-[11px] text-[#8b949e]">
          MeCap · IPO yourself. · Simulated market. No real money. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
