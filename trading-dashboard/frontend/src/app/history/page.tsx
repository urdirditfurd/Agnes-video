"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { LiveLogs } from "@/components/logs/LiveLogs";
import { api, type LogRow, type Trade, type TradeStats } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);

  useEffect(() => {
    void Promise.all([api.trades(), api.logs(), api.status()]).then(([t, l, s]) => {
      setTrades(t);
      setLogs(l);
      setStats(s.stats);
    });
  }, []);

  return (
    <AuthGate>
      <AppShell>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Historique & logs</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Performance</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ["Winrate", stats ? `${stats.winrate}%` : "—"],
            ["Profit Factor", stats ? String(stats.profit_factor) : "—"],
            ["Wins", stats ? String(stats.wins) : "—"],
            ["Losses", stats ? String(stats.losses) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
              <p className="mt-2 font-display text-2xl text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto panel">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Symbole</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3">Entrée</th>
                <th className="px-3 py-3">Sortie</th>
                <th className="px-3 py-3">PnL</th>
                <th className="px-3 py-3">Raison</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-line/50">
                  <td className="px-3 py-2 font-mono text-ink-muted">{t.id}</td>
                  <td className="px-3 py-2">{t.symbol}</td>
                  <td className="px-3 py-2">{t.status}</td>
                  <td className="px-3 py-2 font-mono">{t.entry_price.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono">{t.exit_price?.toFixed(2) ?? "—"}</td>
                  <td
                    className={cn(
                      "px-3 py-2 font-mono",
                      (t.pnl_usd ?? 0) >= 0 ? "text-accent" : "text-danger",
                    )}
                  >
                    {t.pnl_usd == null ? "—" : `${t.pnl_usd.toFixed(2)} $`}
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{t.reason ?? "—"}</td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-ink-muted">
                    Aucun trade enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <LiveLogs initial={logs} />
        </div>
      </AppShell>
    </AuthGate>
  );
}
