"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { CandleChart } from "@/components/charts/CandleChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type BotStatus, type BotStatusPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

function statusVariant(status: BotStatus): "success" | "warn" | "danger" {
  switch (status) {
    case "running":
      return "success";
    case "paused":
      return "warn";
    case "stopped":
      return "danger";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusLabel(status: BotStatus): string {
  switch (status) {
    case "running":
      return "En marche";
    case "paused":
      return "Pause";
    case "stopped":
      return "Arrêté";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
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
          {status && (
            <Badge variant={statusVariant(status.status)} pulse>
              {statusLabel(status.status)}
            </Badge>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "PnL jour", value: stats?.pnl_day },
            { label: "PnL semaine", value: stats?.pnl_week },
            { label: "PnL total", value: stats?.pnl_total },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{item.label}</p>
                <p
                  className={cn(
                    "mt-2 font-display text-2xl",
                    (item.value ?? 0) >= 0 ? "text-accent" : "text-danger",
                  )}
                >
                  {item.value == null ? "—" : `${item.value >= 0 ? "+" : ""}${item.value.toFixed(2)} $`}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-0">
              <CardTitle>BTC/USDT · 15m</CardTitle>
              <p className="font-mono text-xs text-ink-muted">
                RSI {status?.last_rsi?.toFixed(1) ?? "—"} · BB↓ {status?.last_bb_lower?.toFixed(0) ?? "—"}
              </p>
            </CardHeader>
            <CardContent>
              <CandleChart data={candles} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Position actuelle</CardTitle>
            </CardHeader>
            <CardContent>
              {!pos?.open ? (
                <p className="text-sm text-ink-muted">Aucune position ouverte.</p>
              ) : (
                <dl className="space-y-3 text-sm">
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
            </CardContent>
          </Card>
        </section>
      </AppShell>
    </AuthGate>
  );
}
