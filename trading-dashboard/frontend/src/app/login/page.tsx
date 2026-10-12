"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(password);
      localStorage.setItem("td_token", res.access_token);
      router.replace("/");
    } catch {
      setError("Authentification échouée.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,42,54,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(30,42,54,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <Card className="relative z-10 w-full max-w-md animate-riseIn shadow-glow">
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">SignalDesk</p>
          <CardTitle className="text-3xl">Accès opérateur</CardTitle>
          <CardDescription>Authentifiez-vous pour piloter le bot BTC/USDT.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Mot de passe admin</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion…" : "Entrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
