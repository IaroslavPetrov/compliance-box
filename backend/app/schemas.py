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
    website: Optional[str] = None

class TenantResponse(BaseModel):
    id: int
    name: str
    inn: str
    email: Optional[str] = None
    kpp: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    director_name: Optional[str] = None
    website: Optional[str] = None
    created_at: datetime
    pd_subjects_count: Optional[int] = 0

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
    website: Optional[str] = None

# ============================================================================
# DOCUMENT HISTORY SCHEMAS
# ============================================================================
class DocumentHistoryCreate(BaseModel):
    tenant_id: int
    document_type: str
    file_format: str
    filename: str

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

# ============================================================================
# PD SUBJECT SCHEMAS (РЕЕСТР СУБЪЕКТОВ ПДн)
# ============================================================================
class PdSubjectCreate(BaseModel):
    full_name: str
    category: str
    legal_basis: str
    data_types: Optional[str] = None

class PdSubjectResponse(BaseModel):
    id: int
    full_name: str
    category: str
    legal_basis: str
    data_types: Optional[str] = None
    created_at: datetime
    tenant_id: int
    user_id: int
    data_system_ids: List[int] = []  # IDs связанных ИС

    class Config:
        from_attributes = True

class PdSubjectUpdate(BaseModel):
    full_name: Optional[str] = None
    category: Optional[str] = None
    legal_basis: Optional[str] = None
    data_types: Optional[str] = None

# ============================================================================
# DATA SYSTEM SCHEMAS (КАРТА ОБРАБОТКИ ПДн)
# ============================================================================
class DataSystemCreate(BaseModel):
    name: str
    system_type: str  # 'local' | 'cloud_saas' | 'file' | 'physical'
    categories: List[str] = []  # ['employees', 'clients', ...]
    data_location: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_position: Optional[str] = None
    description: Optional[str] = None

class DataSystemUpdate(BaseModel):
    name: Optional[str] = None
    system_type: Optional[str] = None
    categories: Optional[List[str]] = None
    data_location: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_position: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DataSystemResponse(BaseModel):
    id: int
    name: str
    system_type: str
    categories: List[str] = []
    data_location: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_position: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    tenant_id: int
    user_id: int
    pd_subjects_count: int = 0  # Количество привязанных субъектов

    class Config:
        from_attributes = True

class DataSystemLimitsResponse(BaseModel):
    current: int
    limit: int
    tariff: str
    is_limit_reached: bool