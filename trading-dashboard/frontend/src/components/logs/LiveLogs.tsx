"use client";

import { useEffect, useState } from "react";
import { wsUrl, type LogRow } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LiveLogs({ initial }: { initial: LogRow[] }) {
  const [logs, setLogs] = useState<LogRow[]>(initial);

  useEffect(() => {
    setLogs(initial);
  }, [initial]);

  useEffect(() => {
    const url = wsUrl();
    if (!url) return;
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          channel: string;
          data: LogRow & { type?: string };
        };
        if (msg.channel === "bot:logs" && msg.data?.message) {
          setLogs((prev) => [msg.data as LogRow, ...prev].slice(0, 200));
        }
      } catch {
        // ignore malformed
      }
    };
    const ping = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25000);
    return () => {
      window.clearInterval(ping);
      ws.close();
    };
  }, []);

  return (
    <div className="panel max-h-[420px] overflow-auto font-mono text-xs">
      <div className="sticky top-0 border-b border-line bg-canvas-raised px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        Console temps réel
      </div>
      <ul className="divide-y divide-line/60">
        {logs.length === 0 && (
          <li className="px-3 py-4 text-ink-muted">Aucun log pour le moment.</li>
        )}
        {logs.map((log) => (
          <li key={`${log.id}-${log.created_at}`} className="px-3 py-2">
            <span className="text-ink-faint">{new Date(log.created_at).toLocaleTimeString()}</span>{" "}
            <span
              className={cn(
                "mr-2",
                log.level === "ERROR" && "text-danger",
                log.level === "WARNING" && "text-warn",
                log.level === "INFO" && "text-accent",
              )}
            >
              {log.level}
            </span>
            <span className="text-ink">{log.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
