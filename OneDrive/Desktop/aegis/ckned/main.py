from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from log_processor import filter_suspicious_lines
from ollama_client import analyze_with_ollama
from gemini_client import generate_ciso_report
import json

app = FastAPI(title="Project Aegis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        "https://[::1]:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "online", "project": "Aegis"}

@app.post("/simulate-attack")
async def simulate_attack():
    # Step 1: Filter & classify logs
    log_data = filter_suspicious_lines("access.log")
    suspicious_lines = log_data["suspicious_lines"]
    pre_classified_threat = log_data["threat_type"]
    attacker_ips = log_data["attacker_ips"]

    if not suspicious_lines:
        raise HTTPException(status_code=404, detail="No suspicious lines found in log.")

    # Step 2: Send filtered lines to local Ollama
    ollama_raw = await analyze_with_ollama(suspicious_lines, fallback_threat_type=pre_classified_threat)

    # Step 3: Safely parse Ollama JSON response
    try:
        clean = ollama_raw.strip().removeprefix("```json").removesuffix("```").strip()
        ollama_data = json.loads(clean)
    except Exception:
        # Fallback: use our own classifier if Ollama returns bad JSON
        ollama_data = {
            "threat_type": pre_classified_threat,
            "bash_mitigation": ollama_raw
        }

    # Use Ollama's classification, fall back to our classifier
    threat_type = ollama_data.get("threat_type") or pre_classified_threat

    # Step 4: Send ONLY sanitized threat label to Gemini (no IPs, no raw logs)
    ciso_email = await generate_ciso_report(threat_type)

    # Step 5: Return full result to frontend
    return {
        "threat_type": threat_type,
        "bash_mitigation": ollama_data.get("bash_mitigation", "# No mitigation generated"),
        "ciso_email": ciso_email,
        "attacker_ips": attacker_ips,
        "suspicious_lines_count": log_data["suspicious_count"],
        "total_lines_scanned": log_data["total_lines"]
    }