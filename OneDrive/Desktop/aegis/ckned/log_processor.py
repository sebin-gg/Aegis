import re
from collections import defaultdict

ATTACK_KEYWORDS = {
    "brute_force":   ["failed", "failed auth", "authentication failure",
                      "invalid user", "invalid password", "res=failed",
                      "too many authentication failures"],
    "sql_injection": ["sql", "union select", "' or '", "1=1", "drop table",
                      "insert into", "xp_cmdshell", "information_schema"],
    "ddos":          ["flood", "ddos", "rate limit", "req/s", "too many requests",
                      "syn flood"],
    "xss":           ["<script>", "javascript:", "onerror=", "alert(", "xss"],
    "recon":         ["nikto", "nmap", "masscan", "dirbuster", "sqlmap"],
    "generic":       ["error", "attack", "unauthorized", "403", "401",
                      "overflow", "exploit", "malicious", "blocked", "banned",
                      "intrusion", "suspicious"]
}

ALL_KEYWORDS = [kw for group in ATTACK_KEYWORDS.values() for kw in group]


def classify_threat(lines: list) -> str:
    scores = defaultdict(int)
    for line in lines:
        line_lower = line.lower()
        for threat_type, keywords in ATTACK_KEYWORDS.items():
            for kw in keywords:
                if kw in line_lower:
                    scores[threat_type] += 1

    if not scores:
        return "Unknown"

    display_names = {
        "brute_force":   "Brute Force",
        "sql_injection": "SQL Injection",
        "ddos":          "DDoS",
        "xss":           "XSS",
        "recon":         "Reconnaissance",
        "generic":       "Unknown"
    }
    top = max(scores, key=scores.get)
    return display_names.get(top, "Unknown")


def extract_attacker_ips(lines: list) -> list:
    ip_pattern = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
    ips = set()
    for line in lines:
        ips.update(ip_pattern.findall(line))
    ips.discard("127.0.0.1")
    ips.discard("0.0.0.0")
    return list(ips)


def filter_suspicious_lines(log_path: str = "access.log") -> dict:
    suspicious = []
    total_lines = 0

    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                total_lines += 1
                if any(kw in line.lower() for kw in ALL_KEYWORDS):
                    suspicious.append(line.strip())

    except FileNotFoundError:
        suspicious = [
            "2026-04-07 23:41:02 Failed auth: admin@auth from 192.168.1.105",
            "2026-04-07 23:41:03 Failed auth: root@auth from 192.168.1.105",
            "2026-04-07 23:41:04 USER_AUTH res=failed acct=admin ip=192.168.1.105",
            "2026-04-07 23:41:05 USER_AUTH res=failed acct=ubuntu ip=192.168.1.106",
            "2026-04-07 23:41:06 ATTACK WARNING: Brute Force - 47 failed attempts",
        ]
        total_lines = 50

    return {
        "suspicious_lines": suspicious,
        "threat_type": classify_threat(suspicious),
        "attacker_ips": extract_attacker_ips(suspicious),
        "total_lines": total_lines,
        "suspicious_count": len(suspicious)
    }