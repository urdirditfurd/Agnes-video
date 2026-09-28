"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { api } from "@/lib/api";

export default function SecurityPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isTestnet, setIsTestnet] = useState(true);
  const [status, setStatus] = useState<string>("…");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api.credentials().then((c) => {
      setStatus(
        c.configured
          ? `Configuré (${c.label}) · testnet=${String(c.is_testnet)} · maj ${c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}`
          : "Aucune clé enregistrée",
      );
      if (c.is_testnet != null) setIsTestnet(c.is_testnet);
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.saveCredentials({
        api_key: apiKey,
        api_secret: apiSecret,
        is_testnet: isTestnet,
      });
      setApiKey("");
      setApiSecret("");
      setMessage("Clés chiffrées (Fernet) et stockées. Jamais renvoyées en clair.");
      const c = await api.credentials();
      setStatus(
        c.configured
          ? `Configuré (${c.label}) · testnet=${String(c.is_testnet)}`
          : "Aucune clé",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <AuthGate>
      <AppShell>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Sécurité</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Clés API Binance</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Les secrets sont chiffrés côté serveur avec <code className="text-accent">cryptography.fernet</code> avant
          insertion en PostgreSQL. Ils ne transitent jamais en clair dans les réponses API.
        </p>

        <p className="mt-4 font-mono text-xs text-ink-faint">{status}</p>

        <form onSubmit={onSubmit} className="panel mt-6 max-w-xl space-y-4 p-5">
          <label className="block text-xs uppercase tracking-wider text-ink-faint">
            API Key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-2 w-full border border-line bg-canvas px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
              required
              minLength={8}
              autoComplete="off"
            />
          </label>
          <label className="block text-xs uppercase tracking-wider text-ink-faint">
            API Secret
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="mt-2 w-full border border-line bg-canvas px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
              required
              minLength={8}
              autoComplete="off"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={isTestnet}
              onChange={(e) => setIsTestnet(e.target.checked)}
            />
            Utiliser Binance Testnet
          </label>
          <button type="submit" className="bg-accent px-5 py-3 text-sm font-medium text-canvas">
            Chiffrer & enregistrer
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-ink-muted">{message}</p>}
      </AppShell>
    </AuthGate>
  );
}
