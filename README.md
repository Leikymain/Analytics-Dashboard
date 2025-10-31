# Analytics Dashboard AI (FastAPI + React)

Dashboard de análisis con IA: backend en FastAPI protegido con Bearer token y rate limiting por IP; frontend en React (Vite + TypeScript).

## Características

- Backend FastAPI con:
  - Autenticación Bearer (`HTTPBearer(auto_error=False)`) y dependencia `verify_token`.
  - Rate limiting por IP en memoria (ventana 60s) configurable por env (`RATE_LIMIT`).
  - CORS abierto (ajustable): `*` orígenes, métodos y headers.
  - Endpoints: `/health` (público), `/` (protegido), `/preview/csv` (protegido), `/analyze/csv` (protegido).
- Frontend React (Vite + TS) con subida de CSV, vista previa y ejecución de análisis con IA.
- Token Bearer configurable desde la UI (se almacena en `localStorage`).

## Requisitos

- Python 3.11+
- pnpm 10+
- Node 20+

## Variables de entorno

Backend (`.env` en la raíz o variables del sistema):

- `API_TOKEN` (obligatoria): token esperado para Authorization Bearer.
- `RATE_LIMIT` (opcional): solicitudes por minuto por IP. Por defecto `30`.
- `ANTHROPIC_API_KEY` (obligatoria para análisis IA): clave para modelo Claude.

Frontend (`frontend/.env`):

- `VITE_API_BASE_URL` (opcional): URL base del API. Ejemplo: `http://localhost:8002`.

Notas:

- El rate limit en memoria no es multi-proceso/cluster seguro; en producción usa Redis con contadores por IP y expiración.
- CORS está abierto para desarrollo; restringe dominios en producción.

## Instalación

Backend (virtualenv opcional):

```bash
python -m pip install -r requirements.txt
```

Frontend:

```bash
cd frontend
pnpm install
```

## Ejecución en desarrollo

Backend (puerto 8002):

```bash
set API_TOKEN=tu_token && set ANTHROPIC_API_KEY=tu_clave && uvicorn main:app --reload --host 0.0.0.0 --port 8002
```

Frontend (Vite):

```bash
cd frontend
pnpm dev
```

Abre la URL que muestre Vite (por defecto `http://localhost:5173`). En la UI pega tu `API_TOKEN` para acceder a endpoints protegidos.

## Endpoints del Backend

- `GET /health` (público): estado del servicio.
- `GET /` (protegido): metadatos de la API.
- `POST /preview/csv` (protegido): vista previa del CSV.
- `POST /analyze/csv` (protegido): análisis con IA del CSV.

Autenticación: incluir `Authorization: Bearer <API_TOKEN>` en los endpoints protegidos.

### Ejemplos con curl

Comprobar salud (público):

```bash
curl http://localhost:8002/health
```

Root protegido (requiere token):

```bash
curl -H "Authorization: Bearer $API_TOKEN" http://localhost:8002/
```

Preview CSV (requiere token):

```bash
curl -H "Authorization: Bearer $API_TOKEN" -F "file=@ruta/al/archivo.csv" http://localhost:8002/preview/csv
```

Analizar CSV (requiere token):

```bash
curl -H "Authorization: Bearer $API_TOKEN" -F "file=@ruta/al/archivo.csv" http://localhost:8002/analyze/csv
```

## Seguridad y Rate Limiting

- Bearer auth: si falta el header → 401 `Falta el header Authorization: Bearer <token>`.
- Token incorrecto → 401 `Token inválido o no autorizado`.
- Rate limit: `RATE_LIMIT` req/min por IP, ventana 60s. Al exceder → 429 `Demasiadas peticiones. Espera un minuto antes de volver a intentar.`
- `/health` siempre público (sin auth ni rate limit).

## Pruebas de humo

1. Sin header en endpoint protegido → 401 con mensaje exacto.
2. Token incorrecto → 401 con mensaje exacto.
3. Token correcto dentro del límite → 200.
4. Exceder `RATE_LIMIT` en 60s desde misma IP → 429 con mensaje exacto.
5. `GET /health` → 200 sin auth.

## Estructura

```
.
├─ main.py                 # FastAPI app con auth y rate limit
├─ requirements.txt        # Dependencias backend
├─ frontend/               # App React (Vite + TS)
│  ├─ src/App.tsx          # Dashboard UI (token, upload, preview, análisis)
│  └─ ...
```

## Notas de producción

- Sustituir rate limiting en memoria por Redis.
- Restringir CORS a dominios permitidos.
- Ejecutar con un proceso único o usar un store compartido para rate limit.
- Gestionar el `API_TOKEN` en un secreto seguro.
