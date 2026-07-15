from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import get_settings
import datetime

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


class TokenRequest(BaseModel):
    username: str
    password: str


@router.post('/token')
def token(req: TokenRequest):
    # very small prototype: validate against configured admin credentials
    if req.username != settings.admin_user or req.password != settings.admin_password:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    import jwt
    now = datetime.datetime.utcnow()
    payload = {
        "sub": req.username,
        "role": "admin",
        "iat": now,
        "exp": now + datetime.timedelta(seconds=settings.jwt_exp_seconds),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algo)
    return {"access_token": token, "token_type": "bearer", "expires_in": settings.jwt_exp_seconds}
