import base64
import json
import os
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(
    title="Construction Intelligence API",
    description="Decision-support tools for construction planning and monitoring.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ValuationRequest(BaseModel):
    location: str = Field(min_length=2, max_length=120)
    area_sqft: float = Field(gt=0, le=10_000_000)
    property_type: str = "Residential"
    rate_per_sqft: float = Field(gt=0, le=1_000_000)

class PlanRequest(BaseModel):
    project_type: str = "Residential building"
    area_sqft: float = Field(gt=0, le=10_000_000)
    budget_inr: float = Field(gt=0, le=100_000_000_000)
    duration_weeks: int = Field(ge=1, le=520)
    notes: str = ""

class AssistantRequest(BaseModel):
    question: str = Field(min_length=3, max_length=3000)

class WeatherRequest(BaseModel):
    city: str = Field(min_length=2, max_length=120)

def ai_client():
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key)
    except Exception:
        return None

async def image_review(upload: UploadFile, mode: str):
    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Please upload an image file.")
    raw = await upload.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller.")
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    client = ai_client()
    if client is None:
        if mode == "safety":
            return {
                "mode": "demo",
                "title": "Demo safety review",
                "risk_level": "Unknown",
                "findings": ["AI provider is not configured, so no image analysis was performed."],
                "recommendations": ["Configure OPENAI_API_KEY, then upload the image again.", "Do not use this demo output to make site-safety decisions."]
            }
        return {
            "mode": "demo",
            "title": "Demo crack review",
            "severity": "Unknown",
            "findings": ["AI provider is not configured, so no image analysis was performed."],
            "recommendations": ["Configure OPENAI_API_KEY, then upload the image again.", "A qualified structural professional should inspect any suspected crack."]
        }

    mime = upload.content_type or "image/jpeg"
    encoded = base64.b64encode(raw).decode("ascii")
    if mode == "safety":
        prompt = (
            "Review this construction-site image for visible safety indicators. Return JSON only with keys "
            "risk_level (Low/Medium/High/Unknown), findings (array of strings), recommendations (array of strings), "
            "limitations (array of strings). Mention only what is visible; do not claim certainty when unclear. "
            "Look for visible PPE such as hard hats and high-visibility vests, fall hazards, and obvious unsafe conditions. "
            "This is advisory, not a formal compliance inspection."
        )
    else:
        prompt = (
            "Review this image for visible crack-like patterns in a building/concrete surface. Return JSON only with keys "
            "severity (Low/Medium/High/Unknown), findings (array of strings), recommendations (array of strings), "
            "limitations (array of strings). Do not diagnose structural safety from an image. State uncertainty and advise "
            "professional inspection for concerning cracks."
        )
    try:
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded}"}}
                ]
            }]
        )
        result = json.loads(response.choices[0].message.content or "{}")
        result["mode"] = "ai"
        result["title"] = "AI advisory review"
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis failed. Check API key/model configuration. ({type(exc).__name__})")

@app.get("/")
def root():
    return {"name": "Construction Intelligence API", "status": "ok", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok", "ai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip())}

@app.post("/api/safety")
async def safety_review(image: UploadFile = File(...)):
    return await image_review(image, "safety")

@app.post("/api/cracks")
async def crack_review(image: UploadFile = File(...)):
    return await image_review(image, "cracks")

@app.post("/api/valuation")
def valuation(data: ValuationRequest):
    total = round(data.area_sqft * data.rate_per_sqft)
    return {
        "estimated_value_inr": total,
        "formatted_value": f"₹{total:,.0f}",
        "calculation": f"{data.area_sqft:,.0f} sq ft × ₹{data.rate_per_sqft:,.0f}/sq ft",
        "note": "Indicative estimate only. Local market conditions, age, legal status, amenities and condition are not included."
    }

@app.post("/api/plan")
def project_plan(data: PlanRequest):
    budget = data.budget_inr
    phases = [
        ("Planning, permissions and site survey", 0.10, 0.15),
        ("Foundation and structure", 0.25, 0.35),
        ("Walls, roofing and enclosure", 0.20, 0.25),
        ("Electrical, plumbing and services", 0.15, 0.15),
        ("Finishes and quality checks", 0.20, 0.10),
        ("Contingency reserve", 0.10, 0.00),
    ]
    result = []
    start = 1
    for name, time_share, budget_share in phases:
        weeks = max(1, round(data.duration_weeks * time_share))
        result.append({
            "phase": name, "approx_start_week": start,
            "approx_end_week": min(data.duration_weeks, start + weeks - 1),
            "budget_estimate_inr": round(budget * budget_share)
        })
        start += weeks
    return {
        "project_type": data.project_type,
        "area_sqft": data.area_sqft,
        "duration_weeks": data.duration_weeks,
        "phases": result,
        "notes": data.notes,
        "disclaimer": "Illustrative baseline only. A qualified project manager/engineer must validate scope, sequencing, local codes and costs."
    }

@app.post("/api/assistant")
def assistant(data: AssistantRequest):
    client = ai_client()
    if client:
        try:
            response = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "You are a construction knowledge assistant. Give concise, practical, safety-conscious general information. For structural, legal, code-compliance, or site-specific decisions, advise consultation with a qualified professional. Do not invent local regulations."},
                    {"role": "user", "content": data.question}
                ]
            )
            return {"mode": "ai", "answer": response.choices[0].message.content or ""}
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Assistant request failed ({type(exc).__name__}).")
    return {
        "mode": "demo",
        "answer": "Demo mode: Configure OPENAI_API_KEY in backend/.env to enable AI answers. For now, identify the exact task, consult the approved project drawings/specifications, follow site safety procedures, and ask a qualified engineer for structural or code-related decisions."
    }

@app.post("/api/weather")
def weather(data: WeatherRequest):
    try:
        geo = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": data.city, "count": 1, "language": "en", "format": "json"},
            timeout=8
        )
        geo.raise_for_status()
        results = geo.json().get("results", [])
        if not results:
            raise HTTPException(status_code=404, detail="City not found. Try a nearby major city.")
        place = results[0]
        forecast = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": place["latitude"], "longitude": place["longitude"],
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
                "daily": "precipitation_probability_max,weather_code",
                "timezone": "auto", "forecast_days": 1
            }, timeout=8
        )
        forecast.raise_for_status()
        result = forecast.json()
        current = result.get("current", {})
        rain = current.get("precipitation", 0) or 0
        wind = current.get("wind_speed_10m", 0) or 0
        advice = []
        if rain > 0:
            advice.append("Rain is currently reported; review work-at-height, excavation, and concrete placement plans.")
        if wind >= 30:
            advice.append("Wind is elevated; review lifting operations, scaffolds and work-at-height precautions.")
        if not advice:
            advice.append("Check the site-specific forecast before concrete pours, lifting, excavation and work at height.")
        return {
            "city": place.get("name", data.city),
            "country": place.get("country", ""),
            "current": current,
            "daily": result.get("daily", {}),
            "advisory": advice,
            "source": "Open-Meteo",
            "note": "Weather data is general guidance. Follow official alerts and the site's safety plan."
        }
    except HTTPException:
        raise
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Weather service is unavailable. Please try again later.")
