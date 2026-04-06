"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Cpu,
  Radar,
  Shield,
  Terminal,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type TabKey = "engineer" | "ciso";
type LogLevel = { label: "INFO" | "WARN" | "CRIT"; color: string };
type LogLine = { ts: string; level: LogLevel; msg: string };
type SystemStatus = "idle" | "analyzing" | "mitigated";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTs(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function makeLogLine(now: Date) {
  const levels = [
    { label: "INFO", color: "text-neutral-400" },
    { label: "WARN", color: "text-amber-400" },
    { label: "CRIT", color: "text-red-400" },
  ] as const satisfies readonly LogLevel[];
  const events = [
    "Initializing AEGIS hyper-kernel…",
    "TLS handshake validated for edge-node user_id=8829",
    "Scanning inbound packets at edge-01",
    "Unusual pattern detected on port 22",
    "Consecutive failed login attempts from 45.12.88.221",
    "Brute force attack in progress — rate 450 req/sec",
    "Triggering mitigation protocol 0x04",
    "Isolating attack vector — pid=9912",
    "Mitigation rule generated — awaiting operator confirmation",
    "Heartbeat OK — cpu 11% — mem 46%",
  ];
  const level = pick(levels);
  const msg = pick(events);
  return { ts: formatTs(now), level, msg } satisfies LogLine;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("engineer");
  const [isOnline] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("idle");
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>(() => {
    const base = new Date(Date.now() - 1000 * 60);
    return Array.from({ length: 22 }, (_, i) =>
      makeLogLine(new Date(base.getTime() + i * 2200)),
    );
  });

  const logViewportRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const analyzeTimerRef = useRef<number | null>(null);

  const sourceIp = systemStatus === "mitigated" ? "192.168.1.100" : "—";
  const threatId = systemStatus === "mitigated" ? "AEG-20491" : "—";
  const targetNode = "EDGE-NODE-ALPHA-01";
  const confidence = systemStatus === "mitigated" ? "99.9%" : "—";
  const attackType =
    systemStatus === "mitigated" ? "Distributed SSH Brute Force" : "—";
  const cisoText =
    "Executive Board: We have successfully intercepted and automatically mitigated a brute-force authentication attack on the main gateway...";

  const mitigationScript = useMemo(() => {
    if (systemStatus !== "mitigated") return "";
    return "sudo iptables -A INPUT -s 192.168.1.100 -j DROP";
  }, [sourceIp]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLogs((prev) => {
        const next = [...prev, makeLogLine(new Date())];
        return next.length > 240 ? next.slice(next.length - 240) : next;
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = logViewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (analyzeTimerRef.current) window.clearTimeout(analyzeTimerRef.current);
    };
  }, []);

  async function onCopyCode() {
    try {
      await navigator.clipboard.writeText(mitigationScript);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  function onSimulateAttack() {
    if (analyzeTimerRef.current) window.clearTimeout(analyzeTimerRef.current);
    setCopied(false);
    setActiveTab("engineer");
    setSystemStatus("analyzing");

    setLogs((prev) => [
      ...prev,
      {
        ts: formatTs(new Date()),
        level: { label: "CRIT", color: "text-red-400" },
        msg: "SIMULATION: Injected Distributed SSH brute force telemetry — source=192.168.1.100 — port=22",
      },
    ]);

    analyzeTimerRef.current = window.setTimeout(() => {
      setSystemStatus("mitigated");
    }, 2000);
  }

  return (
    <div
      className="min-h-screen font-mono text-neutral-100"
      style={{ backgroundColor: "#09090b" }}
    >
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#09090b]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-neutral-800 bg-neutral-950">
              <Shield className="size-5 text-emerald-400" />
            </div>
            <div className="leading-tight">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold tracking-wide text-emerald-300">
                  AEGIS LOCAL-EDGE RESPONDER
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      "relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] tracking-wide",
                      isOnline
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-neutral-700 bg-neutral-900 text-neutral-300",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isOnline ? "bg-emerald-400" : "bg-neutral-500",
                      )}
                    />
                    {isOnline ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
                    {isOnline ? (
                      <span className="absolute -inset-px rounded-full shadow-[0_0_18px_rgba(16,185,129,0.25)]" />
                    ) : null}
                  </span>
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">
                Threat Mitigation Dashboard · Project Aegis
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold tracking-wide text-white shadow-[0_0_18px_rgba(239,68,68,0.25)] transition focus:outline-none focus:ring-2",
                systemStatus === "analyzing"
                  ? "cursor-not-allowed border-neutral-800 bg-neutral-900 text-neutral-300 shadow-none focus:ring-neutral-700"
                  : "border-red-500/40 bg-red-600 hover:bg-red-500 focus:ring-red-500/50",
              )}
              onClick={onSimulateAttack}
              disabled={systemStatus === "analyzing"}
              aria-label="Simulate attack"
            >
              <Radar className="size-4" />
              {systemStatus === "analyzing" ? "Simulating…" : "Simulate Attack"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs tracking-wide text-neutral-300">
                <Terminal className="size-4 text-emerald-400" />
                <span className="uppercase">Live Log Feed</span>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] text-neutral-500">
                <Activity className="size-3.5" />
                <span>streaming</span>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-black/60">
              <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <Cpu className="size-3.5" />
                  <span>edge-01</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <span className="size-2 rounded-full bg-emerald-500/90" />
                  <span>connected</span>
                </div>
              </div>
              <div
                ref={logViewportRef}
                className="h-[560px] overflow-auto px-3 py-2 leading-5"
              >
                {logs.map((l, idx) => (
                  <div
                    key={`${l.ts}-${idx}`}
                    className="whitespace-pre-wrap break-words text-[11px]"
                  >
                    <span className="text-neutral-500">[{l.ts}]</span>{" "}
                    <span className={cn("font-semibold", l.level.color)}>
                      {l.level.label}
                    </span>{" "}
                    <span className="text-neutral-200">{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {systemStatus === "idle" ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="rounded-lg border border-neutral-800 bg-neutral-950/40"
                >
                  <div className="border-b border-neutral-800 px-5 py-4">
                    <div className="flex items-center gap-2 text-xs tracking-wide text-neutral-300">
                      <AlertTriangle className="size-4 text-neutral-500" />
                      <span className="uppercase">AI Analysis</span>
                    </div>
                    <div className="mt-2 text-sm text-neutral-400">
                      Awaiting telemetry. Click{" "}
                      <span className="text-red-200">Simulate Attack</span> to run a
                      mitigation workflow.
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="rounded-lg border border-neutral-800 bg-black/30 p-4">
                      <div className="text-[11px] text-neutral-500">
                        Status: <span className="text-neutral-300">idle</span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <div className="h-3 w-3/5 rounded bg-neutral-900" />
                        <div className="h-3 w-4/5 rounded bg-neutral-900" />
                        <div className="h-3 w-2/5 rounded bg-neutral-900" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : systemStatus === "analyzing" ? (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="rounded-lg border border-neutral-800 bg-neutral-950/40"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs tracking-wide text-neutral-300">
                        <AlertTriangle className="size-4 text-amber-400" />
                        <span className="uppercase">Scanning for threats…</span>
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        Correlating edge logs and generating mitigation artifacts.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="relative inline-flex size-4">
                        <span className="absolute inline-flex size-4 animate-ping rounded-full bg-emerald-500/25" />
                        <span className="relative inline-flex size-4 rounded-full border border-emerald-500/30 bg-emerald-500/10" />
                      </span>
                      <span>analyzing</span>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="animate-pulse space-y-3">
                      <div className="rounded-lg border border-neutral-800 bg-black/30 p-4">
                        <div className="h-3 w-2/5 rounded bg-neutral-900" />
                        <div className="mt-3 grid gap-2">
                          <div className="h-3 w-5/6 rounded bg-neutral-900" />
                          <div className="h-3 w-4/6 rounded bg-neutral-900" />
                          <div className="h-3 w-3/6 rounded bg-neutral-900" />
                        </div>
                      </div>
                      <div className="rounded-lg border border-neutral-800 bg-black/30 p-4">
                        <div className="h-3 w-1/3 rounded bg-neutral-900" />
                        <div className="mt-3 grid gap-2">
                          <div className="h-3 w-11/12 rounded bg-neutral-900" />
                          <div className="h-3 w-10/12 rounded bg-neutral-900" />
                          <div className="h-3 w-9/12 rounded bg-neutral-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="mitigated"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="rounded-lg border border-neutral-800 bg-neutral-950/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
                    <div className="min-w-[260px]">
                      <div className="flex items-center gap-2 text-xs tracking-wide text-neutral-300">
                        <AlertTriangle className="size-4 text-red-400" />
                        <span className="uppercase">Threat Detected</span>
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-50">
                        {attackType}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        severity: <span className="text-red-300">critical</span> ·
                        threat id:{" "}
                        <span className="text-neutral-300">{threatId}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[11px]">
                      <div>
                        <div className="text-neutral-500">source ip</div>
                        <div className="mt-0.5 text-emerald-300">{sourceIp}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">target node</div>
                        <div className="mt-0.5 text-neutral-200">{targetNode}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">confidence</div>
                        <div className="mt-0.5 text-emerald-300">{confidence}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">detection latency</div>
                        <div className="mt-0.5 text-neutral-200">0.02s</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pt-4">
                    <div className="flex items-center gap-2 border-b border-neutral-800">
                      <button
                        type="button"
                        className={cn(
                          "relative -mb-px inline-flex items-center gap-2 border-b px-3 pb-3 pt-2 text-xs tracking-wide transition",
                          activeTab === "engineer"
                            ? "border-emerald-400 text-emerald-200"
                            : "border-transparent text-neutral-400 hover:text-neutral-200",
                        )}
                        onClick={() => setActiveTab("engineer")}
                      >
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        Engineer View
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "relative -mb-px inline-flex items-center gap-2 border-b px-3 pb-3 pt-2 text-xs tracking-wide transition",
                          activeTab === "ciso"
                            ? "border-emerald-400 text-emerald-200"
                            : "border-transparent text-neutral-400 hover:text-neutral-200",
                        )}
                        onClick={() => setActiveTab("ciso")}
                      >
                        <span className="size-1.5 rounded-full bg-neutral-500" />
                        CISO Post-Mortem
                      </button>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    {activeTab === "engineer" ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1 text-[11px] font-semibold tracking-wide text-red-200">
                              <span className="size-1.5 rounded-full bg-red-400" />
                              SEVERITY: CRITICAL
                            </span>
                            <span className="text-xs text-neutral-400">
                              Recommended mitigation script
                            </span>
                          </div>

                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] tracking-wide transition focus:outline-none focus:ring-2",
                              copied
                                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 focus:ring-emerald-500/40"
                                : "border-neutral-800 bg-neutral-950/40 text-neutral-200 hover:bg-neutral-900/60 focus:ring-neutral-700",
                            )}
                            onClick={onCopyCode}
                          >
                            {copied ? (
                              <>
                                <ClipboardCheck className="size-3.5" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Clipboard className="size-3.5" />
                                Copy Code
                              </>
                            )}
                          </button>
                        </div>

                        <div className="rounded-lg border border-neutral-800 bg-black/40">
                          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                              <CheckCircle2 className="size-3.5 text-emerald-400" />
                              <span>iptables</span>
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              run on:{" "}
                              <span className="text-neutral-300">{targetNode}</span>
                            </div>
                          </div>
                          <pre className="overflow-auto p-3 text-[11px] leading-5 text-neutral-200">
                            <code>{mitigationScript}</code>
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs tracking-wide text-neutral-300">
                          Executive summary
                        </div>
                        <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
                          <textarea
                            className="h-60 w-full resize-none bg-transparent text-[12px] leading-5 text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                            defaultValue={cisoText}
                          />
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          This panel is designed for executive reporting and audit-ready
                          narrative.
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>
    </div>
  );
}
