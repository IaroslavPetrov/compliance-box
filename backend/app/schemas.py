from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class TenantCreate(BaseModel):
    name: str
    inn: str
    kpp: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: EmailStr

class TenantResponse(TenantCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True