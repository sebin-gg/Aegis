import google.generativeai as genai
import os

# Put your key here OR set env variable GEMINI_API_KEY
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

async def generate_ciso_report(threat_type: str) -> str:
    """
    Sends ONLY the sanitized threat type label to Gemini.
    No IPs, no raw logs, no user data ever leaves the local machine.
    """
    prompt = f"""You are a Chief Information Security Officer writing an urgent internal incident report email.

A {threat_type} attack has been detected and automatically mitigated by our edge AI system.

Write a professional, compliance-friendly executive email with:
- Subject line
- Brief summary (what happened, no technical jargon)
- Business impact assessment
- Actions already taken
- Next steps for the team
- A reassuring closing

Keep it under 200 words. No IP addresses. No raw data. Sound stressed but in control."""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"[Gemini Offline] Threat type '{threat_type}' detected and mitigated locally. CISO report generation failed: {str(e)}"