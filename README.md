# AI-Powered Multimodal Construction Intelligence Platform

A runnable starter full-stack project using React + Vite and Python FastAPI.

## Features
- Construction safety photo review (multimodal AI when an API key is configured; otherwise clearly labeled demo response)
- Crack photo review (multimodal AI when configured; not a structural diagnosis)
- Real-estate price estimate (transparent user-entered rate calculation)
- Construction project plan (simple schedule and budget estimate)
- Daily construction knowledge assistant (AI when configured; otherwise demo guidance)
- Weather advisory using Open-Meteo (internet required)

## Requirements
- Python 3.10+
- Node.js 18+
- Optional: OpenAI API key for real multimodal AI analysis

## Run backend (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```
Backend docs: http://127.0.0.1:8000/docs

On macOS/Linux, activate with `source .venv/bin/activate`.

## Run frontend (second terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Enable AI
Add your key and model to `backend/.env`:
```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```
Restart FastAPI. Never put API keys in frontend code or commit `.env`.

## Important
- Without an API key, image reviews and assistant answers return demo output; they are not actual AI detections.
- Construction image analysis can miss hazards/cracks. Have a qualified professional verify findings.
- Real estate values are estimates and depend on the rate per square foot you enter.
- Weather lookup requires internet and uses Open-Meteo's geocoding/forecast API.
