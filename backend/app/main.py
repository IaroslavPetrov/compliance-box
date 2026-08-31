from fastapi import FastAPI, Depends, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.database import engine, Base, get_db
from app import models
from app.schemas import (
    UserCreate, UserLogin, UserResponse, Token, TokenData,
    TenantCreate, TenantResponse, TenantUpdate,
    DocumentHistoryCreate, DocumentHistoryResponse
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
Base.metadata.create_all(bind=engine)

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
            print(f"DEBUG: Token has no sub. Payload: {payload}")
            raise credentials_exception
        print(f"DEBUG: Token decoded successfully. Looking for user_id: {user_id}")
    except JWTError as e:
        print(f"DEBUG: JWTError: {e}")
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        print(f"DEBUG: User with id {user_id} NOT FOUND in database!")
        all_users = db.query(models.User).all()
        print(f"DEBUG: Total users in DB: {len(all_users)}")
        for u in all_users:
            print(f"DEBUG: Found user - ID: {u.id}, Email: {u.email}")
        raise credentials_exception
    
    print(f"DEBUG: User found: {user.email}")
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