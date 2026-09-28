"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { CandleChart } from "@/components/charts/CandleChart";
import { api, type BotStatusPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "bg-accent/20 text-accent",
    paused: "bg-warn/20 text-warn",
    stopped: "bg-danger/20 text-danger",
  };
  const labels: Record<string, string> = {
    running: "En marche",
    paused: "Pause",
    stopped: "Arrêté",
  };
  return (
    <span className={cn("inline-flex items-center gap-2 px-3 py-1 text-xs font-medium", map[status] || map.stopped)}>
      <span className="h-2 w-2 animate-pulseDot rounded-full bg-current" />
      {labels[status] || status}
    </span>
  );
}

export default function DashboardPage() {
  const [status, setStatus] = useState<BotStatusPayload | null>(null);
  const [candles, setCandles] = useState<
    Array<{ time: number; open: number; high: number; low: number; close: number }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, ohlcv] = await Promise.all([api.status(), api.ohlcv()]);
      setStatus(s);
      setCandles(ohlcv);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const stats = status?.stats;
  const pos = status?.position;

  return (
    <AuthGate>
      <AppShell>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Vue d&apos;ensemble</p>
            <h1 className="mt-1 font-display text-3xl text-ink md:text-4xl">SignalDesk</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              Surveillance live du bot RSI + Bollinger sur BTC/USDT 15m.
            </p>
          </div>
          {status && <StatusBadge status={status.status} />}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "PnL jour", value: stats?.pnl_day },
            { label: "PnL semaine", value: stats?.pnl_week },
            { label: "PnL total", value: stats?.pnl_total },
          ].map((item) => (
            <div key={item.label} className="panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{item.label}</p>
              <p
                className={cn(
                  "mt-2 font-display text-2xl",
                  (item.value ?? 0) >= 0 ? "text-accent" : "text-danger",
                )}
              >
                {item.value == null ? "—" : `${item.value >= 0 ? "+" : ""}${item.value.toFixed(2)} $`}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">BTC/USDT · 15m</h2>
              <p className="font-mono text-xs text-ink-muted">
                RSI {status?.last_rsi?.toFixed(1) ?? "—"} · BB↓ {status?.last_bb_lower?.toFixed(0) ?? "—"}
              </p>
            </div>
            <CandleChart data={candles} />
          </div>

          <div className="panel p-4">
            <h2 className="font-display text-xl">Position actuelle</h2>
            {!pos?.open ? (
              <p className="mt-6 text-sm text-ink-muted">Aucune position ouverte.</p>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Symbole", pos.symbol],
                  ["Entrée", pos.entry_price?.toFixed(2)],
                  ["Stop Loss", pos.stop_loss?.toFixed(2)],
                  ["Take Profit", pos.take_profit?.toFixed(2)],
                  ["Mark", pos.mark_price?.toFixed(2)],
                  [
                    "PnL flottant",
                    pos.floating_pnl_usd != null
                      ? `${pos.floating_pnl_usd.toFixed(2)} $ (${pos.floating_pnl_pct?.toFixed(2)}%)`
                      : "—",
                  ],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-line/70 pb-2">
                    <dt className="text-ink-faint">{k}</dt>
                    <dd className="font-mono text-ink">{v ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
