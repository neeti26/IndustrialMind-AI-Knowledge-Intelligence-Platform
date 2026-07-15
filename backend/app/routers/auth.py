from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import get_settings
from app.services import user_service
import datetime
import jwt

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# Initialize default users on startup
user_service.init_default_users()


class TokenRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str
    role: str
    email: str


@router.post('/token')
def token(req: TokenRequest):
    """Authenticate user and return JWT token."""
    user = user_service.authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    now = datetime.datetime.utcnow()
    payload = {
        "sub": req.username,
        "role": user.role,
        "iat": now,
        "exp": now + datetime.timedelta(seconds=settings.jwt_exp_seconds),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algo)
    return {"access_token": token, "token_type": "bearer", "expires_in": settings.jwt_exp_seconds}


@router.get('/me', response_model=UserResponse)
def get_me(request):
    """Get current authenticated user info."""
    if not hasattr(request.state, 'user'):
        raise HTTPException(status_code=401, detail='Not authenticated')
    user = user_service.get_user(request.state.user)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return UserResponse(username=user.username, role=user.role, email=user.email)


@router.get('/users', response_model=list)
def list_users(request):
    """List all users (admin only)."""
    if not hasattr(request.state, 'role') or request.state.role != 'admin':
        raise HTTPException(status_code=403, detail='Forbidden')
    return user_service.list_users()
