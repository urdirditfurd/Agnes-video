"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { api, type Settings } from "@/lib/api";

export default function ControlPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.settings().then(setSettings).catch((e) => setMessage(String(e)));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    try {
      const updated = await api.updateSettings({
        trade_size_usd: settings.trade_size_usd,
        rsi_period: settings.rsi_period,
        rsi_threshold: settings.rsi_threshold,
        bb_period: settings.bb_period,
        bb_std: settings.bb_std,
        stop_loss_pct: settings.stop_loss_pct,
        take_profit_pct: settings.take_profit_pct,
      });
      setSettings(updated);
      setMessage("Paramètres appliqués (lus au prochain cycle bot).");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function run(action: string) {
    setBusy(true);
    try {
      await api.command(action);
      setMessage(`Commande « ${action} » envoyée.`);
      const s = await api.settings();
      setSettings(s);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function field(
    key: keyof Settings,
    label: string,
    step = 1,
  ) {
    if (!settings) return null;
    const value = settings[key];
    if (typeof value !== "number") return null;
    return (
      <label className="block text-xs uppercase tracking-wider text-ink-faint">
        {label}
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) =>
            setSettings({ ...settings, [key]: Number(e.target.value) })
          }
          className="mt-2 w-full border border-line bg-canvas px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
        />
      </label>
    );
  }

  return (
    <AuthGate>
      <AppShell>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Centre de contrôle</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Paramètres à chaud</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Les changements sont persistés en DB et appliqués sans redéployer le code.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["start", "Start", "bg-accent text-canvas"],
            ["pause", "Pause", "border border-warn text-warn"],
            ["stop", "Stop", "border border-danger text-danger"],
            ["close_position", "Close Position (Market)", "border border-line text-ink"],
          ].map(([action, label, cls]) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => void run(action)}
              className={`px-4 py-2.5 text-sm transition disabled:opacity-50 ${cls}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={save} className="panel mt-8 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {field("trade_size_usd", "Taille trade (USD)", 1)}
          {field("rsi_period", "Période RSI", 1)}
          {field("rsi_threshold", "Seuil RSI", 0.5)}
          {field("bb_period", "Période Bollinger", 1)}
          {field("bb_std", "Déviation BB", 0.1)}
          {field("stop_loss_pct", "Stop Loss %", 0.1)}
          {field("take_profit_pct", "Take Profit %", 0.1)}
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={busy || !settings}
              className="bg-accent px-5 py-3 text-sm font-medium text-canvas disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </form>

        {message && <p className="mt-4 text-sm text-ink-muted">{message}</p>}
        {settings && (
          <p className="mt-2 font-mono text-xs text-ink-faint">
            Statut DB: {settings.bot_status} · maj {new Date(settings.updated_at).toLocaleString()}
          </p>
        )}
      </AppShell>
    </AuthGate>
  );
}
