"use client";

import { useEffect, useRef, useState } from "react";
import type { NetworkLogEntry } from "@/hooks/use-tetris";

interface NetworkConsoleProps {
  logs: NetworkLogEntry[];
}

export default function NetworkConsole({ logs }: NetworkConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
  };

  const truncatePayload = (data: unknown): string => {
    const str = JSON.stringify(data);
    return str.length > 120 ? str.slice(0, 120) + "..." : str;
  };

  return (
    <div className="bg-gray-950/90 border border-emerald-500/30 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-emerald-900/30 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-emerald-300 tracking-wider uppercase">
            Yellow Network Console
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {logs.length} message{logs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto p-3 space-y-1 font-mono text-xs"
        style={{ maxHeight: "240px" }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-600 text-center py-4">
            Waiting for network messages...
          </div>
        ) : (
          logs.map((log, i) => {
            const isSent = log.direction === "sent";
            const isExpanded = expanded === i;

            return (
              <div key={i}>
                <button
                  type="button"
                  className="w-full text-left flex items-start gap-2 hover:bg-white/5 rounded px-1 py-0.5 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : i)}
                >
                  <span className="text-gray-600 shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <span
                    className={`shrink-0 font-bold ${isSent ? "text-blue-400" : "text-emerald-400"}`}
                  >
                    {isSent ? ">>>" : "<<<"}
                  </span>
                  <span className="text-yellow-300 shrink-0 font-semibold">
                    {log.method}
                  </span>
                  {!isExpanded && (
                    <span className="text-gray-500 truncate">
                      {truncatePayload(log.data)}
                    </span>
                  )}
                </button>
                {isExpanded && (
                  <pre className="ml-6 mt-1 mb-2 p-2 bg-black/40 rounded text-gray-300 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed border border-gray-800">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
