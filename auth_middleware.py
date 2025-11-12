from fastapi import Header, HTTPException, status
import httpx
import os
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

@lru_cache()
def get_auth_service_url() -> str:
    """Obtiene URL del AuthService desde variable de entorno"""
    url = os.getenv("AUTH_SERVICE_URL", "http://localhost:8000")
    logger.info(f"AuthService URL: {url}")
    return url

async def require_auth(authorization: str = Header(None)) -> str:
    """
    Dependency que verifica el token de autorización.
    
    Uso en tus endpoints:
        @app.post("/chat")
        async def chat(
            request: ChatRequest,
            token: str = Depends(require_auth)  # <-- Añade esto
        ):
            # Tu código aquí
            ...
    
    El cliente debe enviar:
        Authorization: Bearer <token>
    """
    
    # Verificar que existe el header
    if not authorization:
        logger.warning("Request sin header Authorization")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Token requerido",
                "message": "Debes incluir el header: Authorization: Bearer <token>",
                "get_token": "https://automapymes.com/acceso"
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Verificar formato Bearer
    if not authorization.startswith("Bearer "):
        logger.warning(f"Formato de autorización incorrecto: {authorization[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Formato inválido",
                "message": "El header debe ser: Authorization: Bearer <token>"
            }
        )
    
    # Extraer token
    token = authorization.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vacío"
        )
    
    # Verificar token con AuthService
    auth_service_url = get_auth_service_url()
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{auth_service_url}/auth/verify-token",
                json={"token": token}
            )
            
            # Si AuthService responde error HTTP
            if response.status_code != 200:
                error_detail = response.json().get("detail", "Token verification failed")
                logger.warning(f"Token rechazado por AuthService: {error_detail}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Token inválido",
                        "message": error_detail,
                        "get_new_token": "https://automapymes.com/acceso"
                    }
                )
            
            # Parsear respuesta
            data = response.json()
            
            if not data.get("valid", False):
                detail = data.get("detail", "Token inválido")
                logger.warning(f"Token inválido: {detail}")
                
                # Mensajes específicos según el error
                if "expired" in detail.lower():
                    message = "Tu token ha expirado. Solicita uno nuevo (válido 3 días)."
                elif "no requests" in detail.lower():
                    message = "Has agotado tus 60 requests gratuitos. Solicita un nuevo token."
                else:
                    message = detail
                
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Token inválido",
                        "message": message,
                        "get_new_token": "https://automapymes.com/acceso"
                    }
                )
            
            # Token válido
            logger.info(f"Token verificado exitosamente: {token[:10]}...")
            return token
            
    except httpx.TimeoutException:
        logger.error("Timeout al conectar con AuthService")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Servicio de autenticación no disponible",
                "message": "El servicio de autenticación está temporalmente fuera de línea. Intenta de nuevo en unos minutos."
            }
        )
    
    except httpx.RequestError as e:
        logger.error(f"Error de red al conectar con AuthService: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Error de conexión",
                "message": "No se pudo conectar con el servicio de autenticación."
            }
        )
    
    except HTTPException:
        # Re-lanzar HTTPExceptions que ya creamos
        raise
    
    except Exception as e:
        logger.error(f"Error inesperado en auth middleware: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Error interno",
                "message": "Ocurrió un error al verificar tu token."
            }
        )

async def optional_auth(authorization: str = Header(None)) -> str | None:
    """
    Dependency opcional de autenticación.
    Si hay token, lo verifica. Si no hay, devuelve None.
    
    Útil para endpoints que funcionan con o sin autenticación,
    pero ofrecen más features con token.
    """
    if not authorization:
        return None
    
    try:
        return await require_auth(authorization)
    except HTTPException:
        return None