from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============================================================================
# USER SCHEMAS
# ============================================================================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ============================================================================
# TENANT SCHEMAS
# ============================================================================
class TenantCreate(BaseModel):
    name: str
    inn: str
    email: Optional[str] = None
    kpp: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    director_name: Optional[str] = None


class TenantResponse(BaseModel):
    id: int
    name: str
    inn: str
    email: Optional[str] = None
    kpp: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    director_name: Optional[str] = None
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    inn: Optional[str] = None
    email: Optional[str] = None
    kpp: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    director_name: Optional[str] = None


# ============================================================================
# DOCUMENT HISTORY SCHEMAS
# ============================================================================
class DocumentHistoryCreate(BaseModel):
    document_type: str
    file_format: str
    filename: str
    tenant_id: int


class DocumentHistoryResponse(BaseModel):
    id: int
    document_type: str
    file_format: str
    filename: str
    created_at: datetime
    tenant_id: int
    tenant_name: Optional[str] = None

    class Config:
        from_attributes = True