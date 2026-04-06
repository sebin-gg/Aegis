import httpx
import json
from log_processor import classify_threat

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:3b"

def _fallback_mitigation(threat_type: str) -> str:
    threat_type = threat_type or "Unknown"
    mitigations = {
        "Brute Force": "# Ollama offline - fallback\niptables -A INPUT -p tcp --dport 22 -m connlimit --connlimit-above 10 --connlimit-mask 32 -j DROP",
        "DDoS": "# Ollama offline - fallback\niptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT\niptables -A INPUT -p tcp --dport 80 -j DROP",
        "SQL Injection": "# Ollama offline - fallback\niptables -A INPUT -p tcp --dport 3306 -j DROP",
        "XSS": "# Ollama offline - fallback\niptables -A INPUT -p tcp --dport 80 -m string --algo bm --string \"<script>\" -j DROP",
        "Unknown": "# Ollama offline - fallback\niptables -A INPUT -j DROP",
    }
    return mitigations.get(threat_type, mitigations["Unknown"])

async def analyze_with_ollama(log_lines: list[str], fallback_threat_type: str = "Unknown") -> str:
    """
    Sends filtered log lines to local Ollama.
    Returns raw response string (JSON expected).
    """
    logs_block = "\n".join(log_lines)

    prompt = f"""You are a cybersecurity threat analysis engine.
Analyze the following security log lines and respond ONLY with a valid JSON object.
Do NOT include any explanation, markdown, or extra text — just the raw JSON.

Logs:
{logs_block}

Respond in exactly this JSON format:
{{
  "threat_type": "<one of: DDoS, SQL Injection, Brute Force, XSS, Unknown>",
  "bash_mitigation": "<complete iptables or bash script to mitigate this threat>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,   # Low temp = more deterministic JSON
                        "num_predict": 300
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    except httpx.ConnectError:
        # Fallback if Ollama isn't running yet
        actual_threat = fallback_threat_type or classify_threat(log_lines)
        return json.dumps({
            "threat_type": actual_threat,
            "bash_mitigation": _fallback_mitigation(actual_threat),
        })
    except Exception as e:
        actual_threat = fallback_threat_type or classify_threat(log_lines)
        return json.dumps({
            "threat_type": actual_threat,
            "bash_mitigation": _fallback_mitigation(actual_threat),
            "error": str(e),
        })