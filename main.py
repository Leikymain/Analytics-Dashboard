from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import anthropic
import os
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
import io
import json

# Cargar .env desde la ruta del archivo, no del cwd
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=dotenv_path)

app = FastAPI(
    title="AI Analytics Dashboard API",
    description="Sube CSV y obtén insights automáticos con IA - By Jorge Lago",
    version="1.0.0"
)

# App y CORS (top-level)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = ["*"] if ALLOWED_ORIGINS == "*" else [o.strip() for o in ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variables de entorno requeridas para seguridad
# - API_TOKEN: Token esperado para autenticación Bearer
# - RATE_LIMIT: Límite de solicitudes por minuto (por IP) para endpoints protegidos

# Autenticación Bearer (HTTPBearer con auto_error=False para personalizar respuestas)
security = HTTPBearer(auto_error=False)
EXPECTED_TOKEN = os.getenv("API_TOKEN")
if EXPECTED_TOKEN:
    EXPECTED_TOKEN = EXPECTED_TOKEN.strip()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifica el token Bearer. Errores en español exactos según requerimiento."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Falta el header Authorization: Bearer <token>")
    token = credentials.credentials.strip()
    if EXPECTED_TOKEN is None or token != EXPECTED_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o no autorizado")

# Rate limiting por IP en memoria (ventana deslizante de 60s)
# Nota: Esta implementación en memoria NO es segura para multi-proceso/cluster ni persistente.
# Para producción, considera usar Redis (por ejemplo, un contador con expiración por IP y endpoint).
RATE_LIMIT = int(os.getenv("RATE_LIMIT", 30))  # solicitudes por minuto
RATE_WINDOW = 60  # segundos
request_timestamps: dict[str, list[float]] = {}

def check_rate_limit(client_ip: str):
    now = datetime.now().timestamp()
    timestamps = request_timestamps.get(client_ip, [])
    # filtrar fuera de ventana
    filtered = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(filtered) >= RATE_LIMIT:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Demasiadas peticiones. Espera un minuto antes de volver a intentar.")
    filtered.append(now)
    request_timestamps[client_ip] = filtered

# Clase del modelo Pydantic: VisualizationSuggestion y AnalysisResponse
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
    """Análisis básico del DataFrame"""
    
    analysis = {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": df.isnull().sum().to_dict(),
        "numeric_summary": {},
        "sample_data": df.head(10).to_dict('records')
    }
    
    # Estadísticas de columnas numéricas
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
    """Obtiene insights de IA basados en los datos"""
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key no configurada")
    
    client = anthropic.Anthropic(api_key=api_key)
    
    # Preparar contexto
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
  "insights": [
    "Insight 1 (hallazgo clave)",
    "Insight 2",
    "Insight 3"
  ],
  "recommendations": [
    "Recomendación accionable 1",
    "Recomendación accionable 2"
  ],
  "key_metrics": {{
    "metrica_1": valor,
    "metrica_2": valor
  }},
  "data_quality": {{
    "completitud": "percentage",
    "issues": ["issue1", "issue2"] o [],
    "calidad_general": "buena/media/baja"
  }},
  "visualizations_suggested": [
    {{"type": "bar_chart", "columns": ["col1", "col2"], "title": "Título sugerido"}},
    {{"type": "line_chart", "columns": ["fecha", "valor"], "title": "Título"}}
  ]
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
        
        # Limpiar markdown si existe
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        insights_data = json.loads(response_text.strip())
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        
        return insights_data, tokens_used
        
    except json.JSONDecodeError as e:
        return {
            "summary": "Error al parsear respuesta de IA",
            "insights": ["No se pudieron generar insights automáticos"],
            "recommendations": [],
            "key_metrics": {},
            "data_quality": {"calidad_general": "desconocida"},
            "visualizations_suggested": []
        }, 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en IA: {str(e)}")

@app.get("/", dependencies=[Depends(verify_token)])
def root(req: Request):
    # Rate limit por IP para endpoint protegido
    check_rate_limit(req.client.host)
    return {
        "message": "AI Analytics Dashboard API - Activa",
        "docs": "/docs",
        "version": "1.0.0",
        "developer": "Jorge Lago Campos",
        "features": ["CSV upload", "Auto insights", "Data viz suggestions"]
    }

@app.post("/analyze/csv", response_model=AnalysisResponse, dependencies=[Depends(verify_token)])
async def analyze_csv(
    file: UploadFile = File(...),
    question: Optional[str] = None,
    req: Request = None
):
    """
    Sube un CSV y obtén insights automáticos con IA.
    
    - **file**: Archivo CSV
    - **question**: (Opcional) Pregunta específica sobre los datos
    """
    # Rate limit por IP para endpoint protegido
    check_rate_limit(req.client.host)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Solo archivos CSV")
    
    try:
        # Leer CSV
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV vacío")
        
        if len(df) > 10000:
            # Limitar tamaño para demo
            df = df.head(10000)
        
        # Análisis básico
        df_analysis = analyze_dataframe(df)
        
        # Obtener insights de IA
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

@app.post("/preview/csv", response_model=DataSample, dependencies=[Depends(verify_token)])
async def preview_csv(file: UploadFile = File(...), req: Request = None):
    """
    Vista previa de CSV sin análisis completo.
    Útil para verificar que el archivo es correcto antes de analizar.
    """
    # Rate limit por IP para endpoint protegido
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

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Arranque local/contenerizado con puerto de entorno (Railway)
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)