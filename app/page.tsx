"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  Cpu,
  Radar,
  Shield,
  Terminal,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAttackAnalysis } from "../hooks/useAttackAnalysis";

type LogLevel = { label: "INFO" | "WARN" | "CRIT"; color: string };
type LogLine = {
  ts: string;
  level: LogLevel;
  msg: string;
  tint?: "red" | "green";
};
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

function ipFromReservedRanges() {
  const pools = [
    "203.0.113", // TEST-NET-3
    "198.51.100", // TEST-NET-2
    "192.0.2", // TEST-NET-1
  ] as const;
  return `${pick(pools)}.${Math.floor(1 + Math.random() * 254)}`;
}

function makeLogLine(now: Date, opts?: { tint?: LogLine["tint"] }) {
  const levels = [
    { label: "INFO", color: "text-neutral-400" },
    { label: "WARN", color: "text-amber-400" },
    { label: "CRIT", color: "text-red-400" },
  ] as const satisfies readonly LogLevel[];
  const level = pick(levels);
  const ip = ipFromReservedRanges();
  const user = pick(["root", "admin", "ubuntu", "deploy", "guest"] as const);
  const host = pick(["gateway", "edge-01", "edge-02", "bastion", "auth"] as const);
  const pool = [
    `[INFO] sshd[2214]: Connection attempt from ${ip}:22`,
    `[INFO] sshd[2214]: Accepted publickey for ${user} from ${ip} port 51234 ssh2`,
    `[WARN] sshd[2214]: Failed password for invalid user ${user} from ${ip} port 51234 ssh2`,
    `[WARN] sshd[2214]: Failed auth: ${user}@${host} from ${ip}`,
    `[INFO] kernel: IN=eth0 OUT= MAC=... SRC=${ip} DST=10.0.0.10 LEN=60 TOS=0x00 PREC=0x00 TTL=52 PROTO=TCP SPT=51234 DPT=22`,
    `[INFO] audit: USER_AUTH pid=9912 uid=0 msg='op=PAM:authentication acct="${user}" exe="/usr/sbin/sshd" hostname=${ip} res=failed'`,
    `[WARN] fail2ban: Ban ${ip}`,
    `[INFO] aegis-agent: Correlated ${host} telemetry — score=0.${Math.floor(
      70 + Math.random() * 29,
    )}`,
    `[INFO] aegis-agent: Updated edge ruleset — blacklist add ${ip}`,
  ] as const;

  const msg = pick(pool);
  return { ts: formatTs(now), level, msg, tint: opts?.tint } satisfies LogLine;
}

export default function Home() {
  const [isOnline] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const logViewportRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const { status, threatData, error, trigger, reset } = useAttackAnalysis();
  const systemStatus: SystemStatus = status;

  const sourceIp = threatData?.sourceIp ?? "—";
  const threatId = threatData?.threatId ?? "—";
  const targetNode = threatData?.targetNode ?? "EDGE-NODE-ALPHA-01";
  const confidence = threatData?.confidence ?? "—";
  const attackType = threatData?.attackType ?? "—";
  const cisoReport = threatData?.cisoReport ?? "";
  const mitigationScript = threatData?.mitigationScript ?? "";
  const detectedAtIso = threatData?.detectedAtIso ?? null;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (error) setErrorDismissed(false);
  }, [error]);

  useEffect(() => {
    if (!hasMounted) return;
    const delayMs = systemStatus === "analyzing" ? 200 : 800;
    const tint: LogLine["tint"] = systemStatus === "analyzing" ? "red" : undefined;
    const id = window.setInterval(() => {
      setLogs((prev) => {
        const next = [...prev, makeLogLine(new Date(), { tint })];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
    }, delayMs);
    return () => window.clearInterval(id);
  }, [hasMounted, systemStatus]);

  useEffect(() => {
    if (!hasMounted) return;
    if (systemStatus !== "mitigated") return;
    setLogs((prev) => {
      const next = [
        ...prev,
        {
          ts: formatTs(new Date()),
          level: { label: "INFO", color: "text-emerald-400" },
          msg: "[MITIGATED] Threat neutralized. Firewall rule applied.",
          tint: "green" as const,
        } satisfies LogLine,
      ];
      return next.length > 100 ? next.slice(next.length - 100) : next;
    });
  }, [hasMounted, systemStatus]);

  useEffect(() => {
    const el = logViewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function onCopyCode() {
    try {
      await navigator.clipboard.writeText(mitigationScript);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const simulateAttackRef = useRef<() => void>(() => {});

  function onSimulateAttack() {
    setCopied(false);
    trigger();

    setLogs((prev) => [
      ...prev,
      {
        ts: formatTs(new Date()),
        level: { label: "CRIT", color: "text-red-400" },
        msg: "SIMULATION: Injected Distributed SSH brute force telemetry — source=192.168.1.100 — port=22",
      },
    ]);

  }

  useEffect(() => {
    simulateAttackRef.current = onSimulateAttack;
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key?.toLowerCase() !== "d") return;
      if (systemStatus === "analyzing" || systemStatus === "mitigated") return;
      e.preventDefault();
      simulateAttackRef.current();
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [systemStatus]);

  function onReset() {
    setCopied(false);
    setErrorDismissed(false);
    reset();
    setLogs([]);
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
            {systemStatus === "mitigated" ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold tracking-wide text-neutral-200 transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
                onClick={onReset}
                aria-label="Reset dashboard"
              >
                <span className="size-4">⟲</span>
                Reset Dashboard
              </button>
            ) : (
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
            )}
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
                {logs.length === 0 ? (
                  <div className="text-[11px] text-neutral-500">
                    Console cleared — awaiting telemetry…
                  </div>
                ) : (
                  logs.map((l, idx) => (
                    <div
                      key={`${l.ts}-${idx}`}
                      className={cn(
                        "whitespace-pre-wrap break-words text-[11px]",
                        l.tint === "red" && "text-red-200",
                        l.tint === "green" && "text-emerald-200",
                      )}
                    >
                      <span className="text-neutral-500">[{l.ts}]</span>{" "}
                      <span className={cn("font-semibold", l.level.color)}>
                        {l.level.label}
                      </span>{" "}
                      <span
                        className={cn(
                          "text-neutral-200",
                          l.tint === "red" && "text-red-200",
                          l.tint === "green" && "text-emerald-200",
                        )}
                      >
                        {l.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="lg:col-span-3">
            {error && !errorDismissed ? (
              <div className="mb-3 flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-red-300" />
                  <span className="tracking-wide">{error}</span>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-red-500/20 bg-transparent px-2 py-1 text-[11px] text-red-200 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  onClick={() => setErrorDismissed(true)}
                  aria-label="Dismiss backend unreachable banner"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
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

                  <div className="divide-y divide-neutral-700">
                    <div className="px-5 py-3">
                      <div className="grid gap-3 text-[11px] md:grid-cols-3">
                        <div className="rounded-md border border-neutral-800 bg-black/20 px-3 py-2">
                          <div className="text-neutral-500">Source IP</div>
                          <div className="mt-0.5 text-emerald-300">
                            192.168.1.100
                          </div>
                        </div>
                        <div className="rounded-md border border-neutral-800 bg-black/20 px-3 py-2">
                          <div className="text-neutral-500">Port</div>
                          <div className="mt-0.5 text-neutral-200">22 (SSH)</div>
                        </div>
                        <div className="rounded-md border border-neutral-800 bg-black/20 px-3 py-2">
                          <div className="text-neutral-500">Detected At</div>
                          <div className="mt-0.5 text-neutral-200">
                            {detectedAtIso ?? "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs tracking-wide text-neutral-300">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          <span className="uppercase">Engineer View</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1 text-[11px] font-semibold tracking-wide text-red-200">
                          <span className="size-1.5 rounded-full bg-red-400" />
                          SEVERITY: CRITICAL
                        </span>
                      </div>

                      <div className="mb-3 text-sm font-semibold tracking-tight text-neutral-50">
                        {attackType}
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
                        <div className="relative overflow-hidden">
                          <button
                            type="button"
                            className={cn(
                              "absolute right-2 top-2 z-10 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] tracking-wide transition focus:outline-none focus:ring-2",
                              copied
                                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 focus:ring-emerald-500/40"
                                : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55 focus:ring-neutral-700",
                            )}
                            onClick={onCopyCode}
                          >
                            {copied ? (
                              <>
                                <Check className="size-3.5" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Clipboard className="size-3.5" />
                                Copy Code
                              </>
                            )}
                          </button>

                          <SyntaxHighlighter
                            language="bash"
                              style={atomDark}
                            customStyle={{
                              margin: 0,
                              padding: "12px",
                              fontSize: "11px",
                              lineHeight: "20px",
                            }}
                            codeTagProps={{
                              style: {
                                fontFamily:
                                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                              },
                            }}
                            wrapLongLines
                          >
                            {mitigationScript}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <div className="mb-3 flex items-center gap-2 text-xs tracking-wide text-neutral-300">
                        <span className="size-1.5 rounded-full bg-neutral-500" />
                        <span className="uppercase">CISO Post-Mortem</span>
                      </div>

                      <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
                        <div className="space-y-1 text-[11px] text-neutral-300">
                          <div>
                            <span className="text-neutral-500">To:</span>{" "}
                            <span>Executive Board</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">From:</span>{" "}
                            <span>AEGIS Automated CISO</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Subject:</span>{" "}
                            <span>Incident Mitigated - {attackType}</span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-neutral-800 pt-4">
                          <p className="font-sans text-sm leading-6 text-gray-300">
                            {cisoReport}
                          </p>
                        </div>
                      </div>
                    </div>
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
