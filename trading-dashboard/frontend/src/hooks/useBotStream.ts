"use client";

import { useEffect, useState } from "react";
import { wsUrl, type LogRow } from "@/lib/api";

interface StreamState {
  connected: boolean;
  logs: LogRow[];
  lastStatus: Record<string, unknown> | null;
}

export function useBotStream(initialLogs: LogRow[] = []) {
  const [state, setState] = useState<StreamState>({
    connected: false,
    logs: initialLogs,
    lastStatus: null,
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, logs: initialLogs }));
  }, [initialLogs]);

  useEffect(() => {
    const url = wsUrl();
    if (!url) return;

    let closed = false;
    let ws: WebSocket | null = null;
    let pingId = 0;
    let retryId = 0;
    let attempt = 0;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);

      ws.onopen = () => {
        attempt = 0;
        setState((prev) => ({ ...prev, connected: true }));
        pingId = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            channel: string;
            data: LogRow & Record<string, unknown>;
          };
          if (msg.channel === "bot:logs" && msg.data?.message) {
            setState((prev) => ({
              ...prev,
              logs: [msg.data as LogRow, ...prev.logs].slice(0, 200),
            }));
          }
          if (msg.channel === "bot:status") {
            setState((prev) => ({ ...prev, lastStatus: msg.data }));
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        window.clearInterval(pingId);
        setState((prev) => ({ ...prev, connected: false }));
        if (closed) return;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        attempt += 1;
        retryId = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closed = true;
      window.clearInterval(pingId);
      window.clearTimeout(retryId);
      ws?.close();
    };
  }, []);

  return state;
}
