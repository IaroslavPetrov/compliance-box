"""Персональные API-токены: выпуск, список, отзыв + авторизация по токену."""
import hashlib
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

# ⚠️ ВАЖНО: должно совпадать с SECRET_KEY / ALGORITHM в app/main.py
SECRET_KEY = "compliance-box-secret-key-change-in-production-2026"
ALGORITHM = "HS256"

TOKEN_PREFIX = "cbx_"

router = APIRouter(prefix="/api/v1/api-tokens", tags=["api-tokens"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class ApiTokenCreate(BaseModel):
    name: str


class ApiTokenCreatedResponse(BaseModel):
    id: int
    name: str
    token: str  # показывается ОДИН раз при выпуске!
    created_at: datetime


class ApiTokenResponse(BaseModel):
    id: int
    name: str
    token_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def authenticate_api_token(raw: str, db: Session):
    """Возвращает User по токену cbx_... или None."""
    tok = (
        db.query(models.ApiToken)
        .filter(
            models.ApiToken.token_hash == _hash(raw),
            models.ApiToken.revoked_at.is_(None),
        )
        .first()
    )
    if not tok:
        return None
    tok.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return db.query(models.User).filter(models.User.id == tok.user_id).first()


def require_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Авторизация для управления токенами: JWT или cbx_-токен."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token.startswith(TOKEN_PREFIX):
        user = authenticate_api_token(token, db)
        if user is None:
            raise credentials_exception
        return user
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/", response_model=ApiTokenCreatedResponse)
def create_api_token(
    body: ApiTokenCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    raw = TOKEN_PREFIX + secrets.token_urlsafe(32)
    tok = models.ApiToken(
        user_id=current_user.id,
        name=body.name,
        token_hash=_hash(raw),
        token_prefix=raw[:12],
    )
    db.add(tok)
    db.commit()
    db.refresh(tok)
    return ApiTokenCreatedResponse(id=tok.id, name=tok.name, token=raw, created_at=tok.created_at)


@router.get("/", response_model=List[ApiTokenResponse])
def list_api_tokens(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    toks = (
        db.query(models.ApiToken)
        .filter(models.ApiToken.user_id == current_user.id)
        .order_by(models.ApiToken.created_at.desc())
        .all()
    )
    return [
        ApiTokenResponse(
            id=t.id,
            name=t.name,
            token_prefix=t.token_prefix,
            created_at=t.created_at,
            last_used_at=t.last_used_at,
            revoked_at=t.revoked_at,
        )
        for t in toks
    ]


@router.delete("/{token_id}")
def revoke_api_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    tok = db.query(models.ApiToken).filter(
        models.ApiToken.id == token_id,
        models.ApiToken.user_id == current_user.id,
    ).first()
    if not tok:
        raise HTTPException(status_code=404, detail="Токен не найден")
    tok.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Токен отозван"}