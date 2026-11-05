"use client";

import { useBotStream } from "@/hooks/useBotStream";
import type { LogRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function LiveLogs({ initial }: { initial: LogRow[] }) {
  const { connected, logs } = useBotStream(initial);

  return (
    <div className="panel max-h-[420px] overflow-auto font-mono text-xs">
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-canvas-raised px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Console temps réel
        </span>
        <Badge variant={connected ? "success" : "danger"} pulse={connected}>
          {connected ? "WS live" : "WS off"}
        </Badge>
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
