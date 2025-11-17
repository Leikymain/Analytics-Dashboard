from fastapi import Header, HTTPException, Depends
import requests
import os

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL")

async def require_auth(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "")

    try:
        response = requests.post(
            f"{AUTH_SERVICE_URL}/auth/verify-token",
            json={"token": token},
            timeout=5
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AuthService unreachable: {e}")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return token


async def optional_auth(authorization: str = Header(None)) -> str | None:
    if not authorization:
        return None

    token = authorization.replace("Bearer ", "")

    try:
        response = requests.post(
            f"{AUTH_SERVICE_URL}/auth/verify-token",
            json={"token": token},
            timeout=5
        )
    except Exception:
        return None

    if response.status_code != 200:
        return None

    return token
