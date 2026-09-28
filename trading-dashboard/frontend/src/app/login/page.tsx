"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
      <form
        onSubmit={onSubmit}
        className="panel relative z-10 w-full max-w-md animate-riseIn p-8 shadow-glow"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">SignalDesk</p>
        <h1 className="mt-3 font-display text-3xl text-ink">Accès opérateur</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Authentifiez-vous pour piloter le bot BTC/USDT.
        </p>
        <label className="mt-8 block text-xs uppercase tracking-wider text-ink-faint">
          Mot de passe admin
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border border-line bg-canvas px-3 py-3 text-sm text-ink outline-none focus:border-accent"
            autoFocus
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-accent px-4 py-3 text-sm font-medium text-canvas transition hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Entrer"}
        </button>
      </form>
    </div>
  );
}
