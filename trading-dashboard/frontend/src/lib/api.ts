const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export type BotStatus = "running" | "paused" | "stopped";

export interface TradeStats {
  total_trades: number;
  wins: number;
  losses: number;
  winrate: number;
  profit_factor: number;
  pnl_day: number;
  pnl_week: number;
  pnl_total: number;
}

export interface Position {
  open: boolean;
  symbol?: string | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  quantity?: number | null;
  size_usd?: number | null;
  floating_pnl_usd?: number | null;
  floating_pnl_pct?: number | null;
  mark_price?: number | null;
}

export interface BotStatusPayload {
  status: BotStatus;
  position: Position;
  stats: TradeStats;
  last_rsi?: number | null;
  last_bb_lower?: number | null;
  last_price?: number | null;
}

export interface Settings {
  bot_status: BotStatus;
  symbol: string;
  timeframe: string;
  trade_size_usd: number;
  rsi_period: number;
  rsi_threshold: number;
  bb_period: number;
  bb_std: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  updated_at: string;
}

export interface Trade {
  id: number;
  symbol: string;
  side: string;
  status: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  size_usd: number;
  stop_loss: number;
  take_profit: number;
  pnl_usd: number | null;
  pnl_pct: number | null;
  reason: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface LogRow {
  id: number;
  level: string;
  message: string;
  context: Record<string, unknown> | null;
  created_at: string;
}

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("td_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("td_token");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  status: () => request<BotStatusPayload>("/api/bot/status"),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (body: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  command: (action: string) =>
    request<{ status: string; action: string }>("/api/bot/command", {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
  trades: () => request<Trade[]>("/api/trades"),
  logs: () => request<LogRow[]>("/api/logs"),
  credentials: () =>
    request<{
      configured: boolean;
      label: string | null;
      is_testnet: boolean | null;
      updated_at: string | null;
    }>("/api/credentials"),
  saveCredentials: (body: {
    api_key: string;
    api_secret: string;
    is_testnet: boolean;
  }) =>
    request("/api/credentials", { method: "PUT", body: JSON.stringify(body) }),
  ohlcv: (symbol = "BTC/USDT", timeframe = "15m") =>
    request<
      Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>
    >(`/api/market/ohlcv?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=120`),
};

export function wsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/stream`;
}
