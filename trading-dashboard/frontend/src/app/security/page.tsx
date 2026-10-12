"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          Les secrets sont chiffrés côté serveur avec cryptography.fernet avant insertion en PostgreSQL.
        </p>
        <p className="mt-4 font-mono text-xs text-ink-faint">{status}</p>

        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg">Enregistrer des clés</CardTitle>
            <CardDescription>Les valeurs ne sont jamais renvoyées en clair par l&apos;API.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="mt-2"
                  required
                  minLength={8}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="mt-2"
                  required
                  minLength={8}
                  autoComplete="off"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={isTestnet}
                  onChange={(e) => setIsTestnet(e.target.checked)}
                />
                Utiliser Binance Testnet
              </label>
              <Button type="submit">Chiffrer & enregistrer</Button>
            </form>
          </CardContent>
        </Card>
        {message && <p className="mt-4 text-sm text-ink-muted">{message}</p>}
      </AppShell>
    </AuthGate>
  );
}
