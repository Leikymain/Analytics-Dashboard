from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, status, Header
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import anthropic
import os
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
import io
import json

load_dotenv()

app = FastAPI(
    title="AI Analytics Dashboard API (Demo)",
    description="Sube CSV y obtén insights automáticos con IA - By Jorge Lago",
    version="1.0.0"
)

# Rate limiting por IP en memoria
RATE_LIMIT = int(os.getenv("RATE_LIMIT", 30))  # solicitudes por minuto
RATE_WINDOW = 60  # segundos
request_timestamps: dict[str, list[float]] = {}

def check_rate_limit(client_ip: str):
    from time import time
    now = time()
    timestamps = request_timestamps.get(client_ip, [])
    filtered = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(filtered) >= RATE_LIMIT:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Demasiadas peticiones. Espera un minuto antes de volver a intentar.")
    filtered.append(now)
    request_timestamps[client_ip] = filtered

# Demo Token validation
def require_demo_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    demo_tokens = [t.strip() for t in os.getenv("DEMO_TOKENS", "").split(",") if t.strip()]
    if token not in demo_tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    return token

# Pydantic models
class VisualizationSuggestion(BaseModel):
    type: str
    columns: List[str]
    title: str

class AnalysisResponse(BaseModel):
    summary: str
    insights: List[str]
    recommendations: List[str]
    key_metrics: Dict[str, Any]
    data_quality: Dict[str, Any]
    visualizations_suggested: List[VisualizationSuggestion]
    tokens_used: int
    timestamp: str

class DataSample(BaseModel):
    columns: List[str]
    sample_rows: List[Dict[str, Any]]
    total_rows: int
    data_types: Dict[str, str]

def analyze_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    analysis = {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": df.isnull().sum().to_dict(),
        "numeric_summary": {},
        "sample_data": df.head(10).to_dict('records')
    }
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    for col in numeric_cols:
        analysis["numeric_summary"][col] = {
            "mean": float(df[col].mean()),
            "median": float(df[col].median()),
            "std": float(df[col].std()),
            "min": float(df[col].min()),
            "max": float(df[col].max())
        }
    return analysis

def get_ai_insights(df_analysis: Dict[str, Any], user_question: Optional[str] = None) -> tuple[Dict[str, Any], int]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key no configurada")
    
    client = anthropic.Anthropic(api_key=api_key)
    context = f"""
Análisis de datos:
- Total de filas: {df_analysis['shape']['rows']}
- Total de columnas: {df_analysis['shape']['columns']}
- Columnas: {', '.join(df_analysis['columns'])}
- Valores faltantes: {df_analysis['missing_values']}

Resumen estadístico de columnas numéricas:
{json.dumps(df_analysis['numeric_summary'], indent=2)}

Muestra de datos (primeras 10 filas):
{json.dumps(df_analysis['sample_data'][:5], indent=2)}
"""
    prompt = f"""Eres un analista de datos experto. Analiza estos datos y proporciona:

{context}

Devuelve un JSON con esta estructura:
{{
  "summary": "Resumen ejecutivo en 2-3 frases",
  "insights": ["Insight 1", "Insight 2"],
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "key_metrics": {{}},
  "data_quality": {{}},
  "visualizations_suggested": []
}}

{f"Pregunta específica del usuario: {user_question}" if user_question else ""}

Devuelve SOLO el JSON sin markdown ni explicaciones adicionales."""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = response.content[0].text.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        insights_data = json.loads(response_text.strip())
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        return insights_data, tokens_used
    except json.JSONDecodeError:
        return {
            "summary": "Error al parsear respuesta de IA",
            "insights": ["No se pudieron generar insights automáticos"],
            "recommendations": [],
            "key_metrics": {},
            "data_quality": {"calidad_general": "desconocida"},
            "visualizations_suggested": []
        }, 0
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno en el módulo de IA")

# Endpoints
@app.get("/")
def root(req: Request):
    check_rate_limit(req.client.host)
    return {"message": "Demo AI Analytics Dashboard API activo", "version": "1.0.0"}

@app.get("/config/token-status")
def token_status():
    return {"token_configured": bool(os.getenv("DEMO_TOKENS", ""))}

@app.post("/preview/csv", response_model=DataSample)
async def preview_csv(file: UploadFile = File(...), req: Request = None, token: str = Depends(require_demo_token)):
    check_rate_limit(req.client.host)
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Solo archivos CSV")
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        return DataSample(
            columns=list(df.columns),
            sample_rows=df.head(10).to_dict('records'),
            total_rows=len(df),
            data_types={col: str(dtype) for col, dtype in df.dtypes.items()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/analyze/csv", response_model=AnalysisResponse)
async def analyze_csv(file: UploadFile = File(...), question: Optional[str] = None, req: Request = None, token: str = Depends(require_demo_token)):
    check_rate_limit(req.client.host)
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Solo archivos CSV")
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV vacío")
        if len(df) > 10000:
            df = df.head(10000)
        df_analysis = analyze_dataframe(df)
        ai_insights, tokens_used = get_ai_insights(df_analysis, question)
        return AnalysisResponse(
            summary=ai_insights.get("summary", ""),
            insights=ai_insights.get("insights", []),
            recommendations=ai_insights.get("recommendations", []),
            key_metrics=ai_insights.get("key_metrics", {}),
            data_quality=ai_insights.get("data_quality", {}),
            visualizations_suggested=ai_insights.get("visualizations_suggested", []),
            tokens_used=tokens_used,
            timestamp=datetime.now().isoformat()
        )
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV vacío o mal formado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
