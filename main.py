from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import anthropic
import os
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
import io
import json
import re
from auth_middleware import require_auth

load_dotenv()

app = FastAPI(
    title="AI Analytics Dashboard API (Demo)",
    description="Sube CSV y obtén insights automáticos con IA - By Jorge Lago",
    version="1.0.0"
)

# Configurar CORS
allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Rate limiting
RATE_LIMIT = int(os.getenv("RATE_LIMIT", 30))
RATE_WINDOW = 60
request_timestamps: dict[str, list[float]] = {}

def check_rate_limit(client_ip: str):
    from time import time
    now = time()
    timestamps = request_timestamps.get(client_ip, [])
    filtered = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(filtered) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas peticiones. Espera un minuto antes de volver a intentar."
        )
    filtered.append(now)
    request_timestamps[client_ip] = filtered

# Modelos Pydantic
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

# Función para análisis básico
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

# Función para obtener insights de IA (ahora enviando hasta 100 filas completas)
def get_ai_insights(df_analysis: Dict[str, Any], df: pd.DataFrame, user_question: Optional[str] = None) -> tuple[Dict[str, Any], int]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key no configurada")

    client = anthropic.Anthropic(api_key=api_key)

    # Tomar hasta 100 filas completas
    snippet_rows = df.head(100).to_dict(orient='records')

    context = {
        "summary_stats": df_analysis,
        "sample_rows": snippet_rows
    }

    prompt = f"""
Eres un analista de datos experto. Analiza estos datos y devuelve SOLO un JSON válido con esta estructura:

{{
  "summary": "Resumen ejecutivo en 2-3 frases",
  "insights": ["Insight 1", "Insight 2"],
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "key_metrics": {{}},
  "data_quality": {{}},
  "visualizations_suggested": []
}}

Datos a analizar:
{json.dumps(context)}

{f"Pregunta específica del usuario: {user_question}" if user_question else ""}
"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()
        print("DEBUG: Claude response text:", response_text[:1000])

        # Extraer JSON con regex
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="No se pudo extraer JSON de la respuesta de IA")
        json_text = match.group(0)
        insights_data = json.loads(json_text)

        # Convertir visualizaciones en objetos VisualizationSuggestion
        vis_list = []
        for v in insights_data.get("visualizations_suggested", []):
            if isinstance(v, dict):
                vis_list.append(VisualizationSuggestion(**v))
            elif isinstance(v, str):
                # Split tipo y título si hay ":"
                if ":" in v:
                    type_, title = v.split(":", 1)
                    vis_list.append(VisualizationSuggestion(type=type_.strip(), columns=[], title=title.strip()))
                else:
                    vis_list.append(VisualizationSuggestion(type="chart", columns=[], title=v.strip()))
        insights_data["visualizations_suggested"] = vis_list

        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        return insights_data, tokens_used

    except json.JSONDecodeError as e:
        print("ERROR JSONDecodeError:", e)
        print("Response text was:", response_text)
        return {
            "summary": "Error al parsear respuesta de IA",
            "insights": ["No se pudieron generar insights automáticos"],
            "recommendations": [],
            "key_metrics": {},
            "data_quality": {"calidad_general": "desconocida"},
            "visualizations_suggested": []
        }, 0
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno en el módulo de IA: {e}")

# Endpoints
@app.get("/")
def root(req: Request):
    check_rate_limit(req.client.host)
    return {"message": "Demo AI Analytics Dashboard API activo", "version": "1.0.0"}

@app.post("/preview/csv", response_model=DataSample)
async def preview_csv(file: UploadFile = File(...), req: Request = None, token: str = Depends(require_auth)):
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
async def analyze_csv(file: UploadFile = File(...), question: Optional[str] = None, req: Request = None, token: str = Depends(require_auth)):
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
        ai_insights, tokens_used = get_ai_insights(df_analysis, df, question)

        if not isinstance(ai_insights, dict):
            raise HTTPException(status_code=500, detail="La respuesta de IA no es un JSON válido")

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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
