from fastapi import FastAPI, Depends, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.database import engine, Base, get_db
from app import models
from app.schemas import (
    UserCreate, UserLogin, UserResponse, Token, TokenData,
    TenantCreate, TenantResponse, TenantUpdate,
    DocumentHistoryCreate, DocumentHistoryResponse,
    PdSubjectCreate, PdSubjectResponse, PdSubjectUpdate
)
from app.services.document_generator import document_generator

from jose import JWTError, jwt
from passlib.context import CryptContext

# ============================================================================
# JWT CONFIG
# ============================================================================
SECRET_KEY = "compliance-box-secret-key-change-in-production-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 дней = 10080 минут

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ============================================================================
# APP INIT
# ============================================================================
# Создаём все таблицы
Base.metadata.create_all(bind=engine)

# Принудительно создаём таблицу pd_subjects, если её нет
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS pd_subjects (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR NOT NULL,
            category VARCHAR NOT NULL,
            legal_basis VARCHAR NOT NULL,
            data_types TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            tenant_id INTEGER REFERENCES tenants(id),
            user_id INTEGER REFERENCES users(id)
        )
    """))
    conn.commit()

app = FastAPI(title="Compliance Box API")

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# AUTH HELPERS
# ============================================================================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

# ============================================================================
# AUTH ENDPOINTS
# ============================================================================
@app.post("/api/v1/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/v1/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Пользователь с таким email не найден",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("LOGIN ERROR TRACEBACK:\n", error_trace)
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@app.get("/api/v1/auth/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ============================================================================
# TENANT ENDPOINTS
# ============================================================================
@app.post("/api/v1/tenants/", response_model=TenantResponse)
def create_tenant(
    tenant: TenantCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.Tenant).filter(models.Tenant.inn == tenant.inn).first()
    if existing and existing.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Компания с таким ИНН уже зарегистрирована другим пользователем")
    
    new_tenant = models.Tenant(
        **tenant.model_dump(),
        user_id=current_user.id
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@app.get("/api/v1/tenants/", response_model=List[TenantResponse])
def read_tenants(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenants = db.query(models.Tenant).filter(
        models.Tenant.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return tenants

@app.get("/api/v1/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant = db.query(models.Tenant).filter(
        models.Tenant.id == tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    return tenant

@app.put("/api/v1/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    tenant: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_tenant = db.query(models.Tenant).filter(
        models.Tenant.id == tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    update_data = tenant.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_tenant, field, value)
    
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

@app.delete("/api/v1/tenants/{tenant_id}")
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_tenant = db.query(models.Tenant).filter(
        models.Tenant.id == tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    db.delete(db_tenant)
    db.commit()
    return {"message": "Компания удалена"}

# ============================================================================
# PD SUBJECTS REGISTRY (РЕЕСТР СУБЪЕКТОВ ПДн)
# ============================================================================
FREE_TIER_LIMIT = 10  # Заглушка лимита для бесплатного тарифа

@app.get("/api/v1/pd-subjects/", response_model=List[PdSubjectResponse])
def get_pd_subjects(
    tenant_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant = db.query(models.Tenant).filter(
        models.Tenant.id == tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена или доступ запрещен")

    subjects = db.query(models.PdSubject).filter(
        models.PdSubject.tenant_id == tenant_id,
        models.PdSubject.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return subjects

@app.post("/api/v1/pd-subjects/", response_model=PdSubjectResponse)
def create_pd_subject(
    tenant_id: int,
    subject: PdSubjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant = db.query(models.Tenant).filter(
        models.Tenant.id == tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена или доступ запрещен")

    current_count = db.query(models.PdSubject).filter(
        models.PdSubject.tenant_id == tenant_id,
        models.PdSubject.user_id == current_user.id
    ).count()

    if current_count >= FREE_TIER_LIMIT:
        raise HTTPException(
            status_code=403, 
            detail=f"Достигнут лимит записей реестра для бесплатного тарифа ({FREE_TIER_LIMIT}). Обновите тариф для снятия ограничений."
        )

    new_subject = models.PdSubject(
        **subject.model_dump(),
        tenant_id=tenant_id,
        user_id=current_user.id
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

@app.put("/api/v1/pd-subjects/{subject_id}", response_model=PdSubjectResponse)
def update_pd_subject(
    subject_id: int,
    subject: PdSubjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_subject = db.query(models.PdSubject).filter(
        models.PdSubject.id == subject_id,
        models.PdSubject.user_id == current_user.id
    ).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Запись не найдена или доступ запрещен")

    update_data = subject.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subject, field, value)

    db.commit()
    db.refresh(db_subject)
    return db_subject

@app.delete("/api/v1/pd-subjects/{subject_id}")
def delete_pd_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_subject = db.query(models.PdSubject).filter(
        models.PdSubject.id == subject_id,
        models.PdSubject.user_id == current_user.id
    ).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Запись не найдена или доступ запрещен")

    db.delete(db_subject)
    db.commit()
    return {"message": "Запись из реестра удалена"}

@app.get("/api/v1/pd-subjects/limits")
def get_pd_subjects_limits(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant = db.query(models.Tenant).filter(
        models.Tenant.id == tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")

    current_count = db.query(models.PdSubject).filter(
        models.PdSubject.tenant_id == tenant_id,
        models.PdSubject.user_id == current_user.id
    ).count()

    return {
        "current": current_count,
        "limit": FREE_TIER_LIMIT,
        "tariff": "Free",
        "is_limit_reached": current_count >= FREE_TIER_LIMIT
    }

# ============================================================================
# DOCUMENT HISTORY
# ============================================================================
@app.post("/api/v1/documents/history")
def add_document_history(
    history_data: DocumentHistoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant = db.query(models.Tenant).filter(
        models.Tenant.id == history_data.tenant_id,
        models.Tenant.user_id == current_user.id
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")

    history = models.DocumentHistory(
        user_id=current_user.id,
        tenant_id=history_data.tenant_id,
        document_type=history_data.document_type,
        file_format=history_data.file_format,
        filename=history_data.filename
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return {"message": "История сохранена"}

@app.get("/api/v1/documents/history", response_model=List[DocumentHistoryResponse])
def get_document_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    history = db.query(models.DocumentHistory).filter(
        models.DocumentHistory.user_id == current_user.id
    ).order_by(models.DocumentHistory.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for h in history:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == h.tenant_id).first()
        result.append(DocumentHistoryResponse(
            id=h.id,
            document_type=h.document_type,
            file_format=h.file_format,
            filename=h.filename,
            created_at=h.created_at,
            tenant_id=h.tenant_id,
            tenant_name=tenant.name if tenant else None
        ))
    return result

# ============================================================================
# DOCUMENT LIST
# ============================================================================
@app.get("/api/v1/documents/list")
def get_documents_list():
    return [
        {"id": "policy-152fz", "name": "1. Политика обработки персональных данных (152-ФЗ)"},
        {"id": "consent-152fz", "name": "2. Согласие субъекта на обработку ПДн (152-ФЗ)"},
        {"id": "nda-152fz", "name": "3. Обязательство о неразглашении ПДн (для сотрудников)"},
        {"id": "order-responsible-152fz", "name": "4. Приказ о назначении ответственного за обработку ПДн"},
        {"id": "threat-model-fstek", "name": "5. Модель угроз безопасности ПДн (ФСТЭК)"}
    ]

# ============================================================================
# PDF ENDPOINTS
# ============================================================================
@app.post("/api/v1/documents/policy-152fz")
def generate_policy_152fz(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_policy_152fz(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="policy-152fz", file_format="pdf", filename=f"policy_152fz_{tenant.inn}.pdf")
    db.add(history); db.commit()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=policy_152fz_{tenant.inn}.pdf"})

@app.post("/api/v1/documents/consent-152fz")
def generate_consent_152fz(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_consent_152fz(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="consent-152fz", file_format="pdf", filename=f"consent_152fz_{tenant.inn}.pdf")
    db.add(history); db.commit()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=consent_152fz_{tenant.inn}.pdf"})

@app.post("/api/v1/documents/nda-152fz")
def generate_nda_152fz(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_nda_152fz(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="nda-152fz", file_format="pdf", filename=f"nda_152fz_{tenant.inn}.pdf")
    db.add(history); db.commit()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=nda_152fz_{tenant.inn}.pdf"})

@app.post("/api/v1/documents/order-responsible-152fz")
def generate_order_responsible_152fz(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_order_responsible_152fz(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="order-responsible-152fz", file_format="pdf", filename=f"order_responsible_{tenant.inn}.pdf")
    db.add(history); db.commit()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=order_responsible_{tenant.inn}.pdf"})

@app.post("/api/v1/documents/threat-model-fstek")
def generate_threat_model_fstek(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_threat_model_fstek(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="threat-model-fstek", file_format="pdf", filename=f"threat_model_fstek_{tenant.inn}.pdf")
    db.add(history); db.commit()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=threat_model_fstek_{tenant.inn}.pdf"})

# ============================================================================
# WORD ENDPOINTS
# ============================================================================
@app.post("/api/v1/documents/policy-152fz/word")
def generate_policy_152fz_word(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    docx_bytes = bytes(document_generator.generate_policy_152fz_word(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="policy-152fz", file_format="word", filename=f"policy_152fz_{tenant.inn}.docx")
    db.add(history); db.commit()
    return Response(content=docx_bytes, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename=policy_152fz_{tenant.inn}.docx"})

@app.post("/api/v1/documents/consent-152fz/word")
def generate_consent_152fz_word(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    docx_bytes = bytes(document_generator.generate_consent_152fz_word(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="consent-152fz", file_format="word", filename=f"consent_152fz_{tenant.inn}.docx")
    db.add(history); db.commit()
    return Response(content=docx_bytes, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename=consent_152fz_{tenant.inn}.docx"})

@app.post("/api/v1/documents/nda-152fz/word")
def generate_nda_152fz_word(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    docx_bytes = bytes(document_generator.generate_nda_152fz_word(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="nda-152fz", file_format="word", filename=f"nda_152fz_{tenant.inn}.docx")
    db.add(history); db.commit()
    return Response(content=docx_bytes, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename=nda_152fz_{tenant.inn}.docx"})

@app.post("/api/v1/documents/order-responsible-152fz/word")
def generate_order_responsible_152fz_word(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    docx_bytes = bytes(document_generator.generate_order_responsible_152fz_word(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="order-responsible-152fz", file_format="word", filename=f"order_responsible_{tenant.inn}.docx")
    db.add(history); db.commit()
    return Response(content=docx_bytes, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename=order_responsible_{tenant.inn}.docx"})

@app.post("/api/v1/documents/threat-model-fstek/word")
def generate_threat_model_fstek_word(tenant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id, models.Tenant.user_id == current_user.id).first()
    if not tenant: raise HTTPException(status_code=404, detail="Компания не найдена")
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    docx_bytes = bytes(document_generator.generate_threat_model_fstek_word(company_data))
    history = models.DocumentHistory(user_id=current_user.id, tenant_id=tenant.id, document_type="threat-model-fstek", file_format="word", filename=f"threat_model_fstek_{tenant.inn}.docx")
    db.add(history); db.commit()
    return Response(content=docx_bytes, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename=threat_model_fstek_{tenant.inn}.docx"})

# ============================================================================
# 152-FZ COMPLIANCE CHECK (УЛУЧШЕННЫЙ ПАРСЕР)
# ============================================================================
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse

@app.get("/api/v1/compliance/check")
def check_website_compliance(
    website_url: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not website_url:
        raise HTTPException(status_code=400, detail="URL сайта не указан")
    
    if not website_url.startswith(('http://', 'https://')):
        website_url = 'https://' + website_url
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
        
        response = requests.get(website_url, headers=headers, timeout=10, allow_redirects=True)
        response.raise_for_status()
        
        final_url = response.url
        is_https = final_url.startswith('https://')
        
        html_content = response.text[:500000]
        soup = BeautifulSoup(html_content, 'html.parser')
        html_text = html_content.lower()
        
        checks = {
            "https_enabled": {"name": "Использование защищенного соединения (HTTPS)", "required": True, "found": is_https, "details": ["HTTPS активен" if is_https else "Сайт не использует HTTPS"]},
            "privacy_policy": {"name": "Политика обработки персональных данных", "required": True, "found": False, "details": []},
            "cookie_consent": {"name": "Уведомление о использовании Cookies", "required": True, "found": False, "details": []},
            "consent_forms": {"name": "Формы сбора данных с согласием", "required": True, "found": False, "details": []},
            "operator_details": {"name": "Реквизиты оператора (Наименование, ИНН/ОГРН)", "required": True, "found": False, "details": []},
            "contact_info": {"name": "Контактная информация для субъектов ПДн", "required": True, "found": False, "details": []},
            "processing_purposes": {"name": "Цели обработки персональных данных", "required": True, "found": False, "details": []},
            "retention_period": {"name": "Сроки хранения персональных данных", "required": True, "found": False, "details": []},
            "third_party_transfer": {"name": "Условия передачи данных третьим лицам", "required": False, "found": False, "details": []}
        }

        def find_policy_link(soup_obj, base_url):
            policy_keywords = ['политик', 'персональн', 'privacy', 'confidential', '152-фз', 'пдн']
            links = soup_obj.find_all('a', href=True)
            for link in links:
                link_text = link.get_text(strip=True).lower()
                link_href = link['href'].lower()
                if any(kw in link_text or kw in link_href for kw in policy_keywords):
                    if not link_href.startswith('#'):
                        return urljoin(base_url, link['href'])
            return None

        def analyze_policy_text(text, checks_dict):
            if re.search(r'(цель|цели).{0,30}(обработк|сбор|использован)', text, re.IGNORECASE):
                checks_dict["processing_purposes"]["found"] = True
                checks_dict["processing_purposes"]["details"].append("Найдено упоминание целей обработки")
            if re.search(r'(срок|период|хранени|уничтожен).{0,30}(данных|информации)', text, re.IGNORECASE):
                checks_dict["retention_period"]["found"] = True
                checks_dict["retention_period"]["details"].append("Найдено упоминание сроков хранения")
            if re.search(r'(инн|огрн|юридическ.*адрес|наименование)', text, re.IGNORECASE):
                checks_dict["operator_details"]["found"] = True
                checks_dict["operator_details"]["details"].append("Найдены реквизиты оператора")
            if re.search(r'(третьим лицам|передач|распространен|предоставлен)', text, re.IGNORECASE):
                checks_dict["third_party_transfer"]["found"] = True
                checks_dict["third_party_transfer"]["details"].append("Найдено упоминание передачи данных")

        if re.search(r'(cookie|куки|файл.*данных)', html_text):
            checks["cookie_consent"]["found"] = True
            checks["cookie_consent"]["details"].append("Найдено упоминание cookies")
        
        if re.search(r'(email|e-mail|телефон|контакт|обратн.*связь)', html_text):
            checks["contact_info"]["found"] = True
            checks["contact_info"]["details"].append("Найдены контактные данные")

        forms = soup.find_all('form')
        for form in forms:
            inputs = form.find_all('input')
            has_text_input = any(i.get('type') in ['text', 'email', 'tel', 'password'] for i in inputs)
            has_checkbox = any(i.get('type') == 'checkbox' for i in inputs)
            if has_text_input:
                if has_checkbox:
                    checks["consent_forms"]["found"] = True
                    checks["consent_forms"]["details"].append("Найдена форма с чекбоксом согласия")
                else:
                    form_text = form.get_text().lower()
                    if 'соглас' in form_text or 'политик' in form_text:
                        checks["consent_forms"]["found"] = True
                        checks["consent_forms"]["details"].append("Найдена форма с текстовым согласием")

        policy_url = find_policy_link(soup, final_url)
        if policy_url:
            checks["privacy_policy"]["found"] = True
            checks["privacy_policy"]["details"].append(f"Найдена ссылка на политику: {policy_url}")
            try:
                policy_response = requests.get(policy_url, headers=headers, timeout=10, allow_redirects=True)
                if policy_response.ok:
                    policy_soup = BeautifulSoup(policy_response.text[:500000], 'html.parser')
                    policy_text = policy_soup.get_text(separator=' ', strip=True).lower()
                    analyze_policy_text(policy_text, checks)
                else:
                    checks["privacy_policy"]["details"].append(f"Страница политики недоступна (код {policy_response.status_code})")
            except requests.exceptions.RequestException:
                checks["privacy_policy"]["details"].append("Не удалось загрузить страницу политики для глубокого анализа")
        else:
            if re.search(r'(политик.*конфиденциальност|политик.*обработк.*персональн.*данных)', html_text):
                checks["privacy_policy"]["found"] = True
                checks["privacy_policy"]["details"].append("Текст политики найден на главной странице")
                analyze_policy_text(html_text, checks)

        required_checks = {k: v for k, v in checks.items() if v["required"]}
        total_required = len(required_checks)
        passed_required = sum(1 for v in required_checks.values() if v["found"])
        compliance_percentage = round((passed_required / total_required) * 100) if total_required > 0 else 0
        
        return {
            "url": final_url,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "compliance_percentage": compliance_percentage,
            "total_required": total_required,
            "passed_required": passed_required,
            "checks": checks
        }
    except requests.exceptions.SSLError:
        raise HTTPException(status_code=400, detail="Ошибка SSL-сертификата сайта.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=400, detail="Не удалось установить соединение с сайтом.")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="Превышено время ожидания ответа от сайта.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при запросе к сайту: {str(e)}")
    except Exception as e:
        import traceback
        print("COMPLIANCE CHECK ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка при проверке: {str(e)}")