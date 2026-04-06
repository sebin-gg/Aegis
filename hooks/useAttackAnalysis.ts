import { useEffect, useMemo, useRef, useState } from "react";

export type AttackAnalysisStatus = "idle" | "analyzing" | "mitigated";

export type ThreatData = {
  attackType: string;
  sourceIp: string;
  portLabel: string;
  detectedAtIso: string;
  threatId: string;
  confidence: string;
  targetNode: string;
  mitigationScript: string;
  cisoReport: string;
};

export function useAttackAnalysis(): {
  status: AttackAnalysisStatus;
  threatData: ThreatData | null;
  error: string | null;
  trigger: () => void;
  reset: () => void;
} {
  const [status, setStatus] = useState<AttackAnalysisStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [threatData, setThreatData] = useState<ThreatData | null>(null);

  const analyzeTimerRef = useRef<number | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const mock = useMemo(
    () => ({
      attackType: "Distributed SSH Brute Force",
      sourceIp: "192.168.1.100",
      portLabel: "22 (SSH)",
      threatId: "AEG-20491",
      confidence: "99.9%",
      targetNode: "EDGE-NODE-ALPHA-01",
      mitigationScript: "sudo iptables -A INPUT -s 192.168.1.100 -j DROP",
      cisoReport: [
        "At 23:40, the AEGIS edge system detected and automatically mitigated a distributed brute-force attack targeting our primary edge node.",
        "Zero data was exfiltrated.",
        "The offending IPs have been blacklisted at the firewall level.",
        "No manual intervention is required.",
      ].join(" "),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current) window.clearTimeout(analyzeTimerRef.current);
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, []);

  function reset() {
    if (analyzeTimerRef.current) window.clearTimeout(analyzeTimerRef.current);
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    analyzeTimerRef.current = null;
    fetchAbortRef.current = null;
    setStatus("idle");
    setThreatData(null);
    setError(null);
  }

  function trigger() {
    if (status !== "idle") return;

    setStatus("analyzing");
    setError(null);
    setThreatData(null);

    // Fire-and-forget request: failures surface as a dismissible banner in the UI.
    // The UX state machine continues regardless of backend reachability.
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 1200);

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiBase}/api/analyze`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`bad_status_${res.status}`);
      })
      .catch(() => {
        setError("Backend Unreachable — Check Connection");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (fetchAbortRef.current === controller) fetchAbortRef.current = null;
      });

    analyzeTimerRef.current = window.setTimeout(() => {
      setStatus("mitigated");
      setThreatData({
        ...mock,
        detectedAtIso: new Date().toISOString(),
      });
    }, 2000);
  }

  return { status, threatData, error, trigger, reset };
}

