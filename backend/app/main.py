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
# 152-FZ COMPLIANCE CHECK
# ============================================================================
import requests
from bs4 import BeautifulSoup
import re

@app.get("/api/v1/compliance/check")
def check_website_compliance(
    website_url: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Проверяет сайт на соответствие 152-ФЗ
    """
    if not website_url:
        raise HTTPException(status_code=400, detail="URL сайта не указан")
    
    # Добавляем https:// если нет
    if not website_url.startswith(('http://', 'https://')):
        website_url = 'https://' + website_url
    
    try:
        # Делаем запрос к сайту
        headers = {
            'User-Agent': 'Mozilla/5.0 (ComplianceBox/1.0; 152-FZ Checker)'
        }
        response = requests.get(website_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        html_text = response.text.lower()
        
        # Список проверок
        checks = {
            "privacy_policy": {
                "name": "Политика конфиденциальности / Политика обработки ПДн",
                "required": True,
                "found": False,
                "details": []
            },
            "cookie_consent": {
                "name": "Согласие на использование cookies",
                "required": True,
                "found": False,
                "details": []
            },
            "personal_data_consent": {
                "name": "Форма согласия на обработку персональных данных",
                "required": True,
                "found": False,
                "details": []
            },
            "operator_info": {
                "name": "Информация об операторе персональных данных",
                "required": True,
                "found": False,
                "details": []
            },
            "contact_info": {
                "name": "Контактная информация",
                "required": True,
                "found": False,
                "details": []
            },
            "data_processing_purpose": {
                "name": "Цели обработки персональных данных",
                "required": False,
                "found": False,
                "details": []
            },
            "data_retention": {
                "name": "Сроки хранения персональных данных",
                "required": False,
                "found": False,
                "details": []
            },
            "third_party_disclosure": {
                "name": "Информация о передаче данных третьим лицам",
                "required": False,
                "found": False,
                "details": []
            }
        }
        
        # Проверка 1: Политика конфиденциальности
        privacy_keywords = [
            'политика конфиденциальности',
            'политика обработки персональных данных',
            'privacy policy',
            'персональные данные',
            '152-фз'
        ]
        for keyword in privacy_keywords:
            if keyword in html_text:
                checks["privacy_policy"]["found"] = True
                checks["privacy_policy"]["details"].append(f"Найдено упоминание: {keyword}")
        
        # Ищем ссылки на политику
        links = soup.find_all('a', href=True)
        for link in links:
            link_text = link.get_text().lower()
            link_href = link['href'].lower()
            if any(kw in link_text or kw in link_href for kw in privacy_keywords):
                checks["privacy_policy"]["details"].append(f"Ссылка: {link['href']}")
        
        # Проверка 2: Cookie consent
        cookie_keywords = [
            'cookie',
            'куки',
            'использование файлов cookie',
            'согласие на обработку cookie',
            'мы используем cookie'
        ]
        for keyword in cookie_keywords:
            if keyword in html_text:
                checks["cookie_consent"]["found"] = True
                checks["cookie_consent"]["details"].append(f"Найдено: {keyword}")
        
        # Проверка 3: Согласие на обработку ПДн
        consent_keywords = [
            'согласие на обработку персональных данных',
            'даю согласие',
            'нажимая кнопку',
            'отправляя форму',
            'я согласен',
            'checkbox'
        ]
        for keyword in consent_keywords:
            if keyword in html_text:
                checks["personal_data_consent"]["found"] = True
                checks["personal_data_consent"]["details"].append(f"Найдено: {keyword}")
        
        # Ищем чекбоксы в формах
        checkboxes = soup.find_all('input', type='checkbox')
        if checkboxes:
            checks["personal_data_consent"]["found"] = True
            checks["personal_data_consent"]["details"].append(f"Найдено чекбоксов: {len(checkboxes)}")
        
        # Проверка 4: Информация об операторе
        operator_keywords = [
            'оператор персональных данных',
            'инн',
            'огрн',
            'юридический адрес',
            'наименование организации'
        ]
        for keyword in operator_keywords:
            if keyword in html_text:
                checks["operator_info"]["found"] = True
                checks["operator_info"]["details"].append(f"Найдено: {keyword}")
        
        # Проверка 5: Контактная информация
        contact_keywords = [
            'контакты',
            'email',
            'телефон',
            'адрес',
            'обратная связь'
        ]
        for keyword in contact_keywords:
            if keyword in html_text:
                checks["contact_info"]["found"] = True
                checks["contact_info"]["details"].append(f"Найдено: {keyword}")
        
        # Проверка 6: Цели обработки
        purpose_keywords = [
            'цель обработки',
            'для чего собираем',
            'используем для',
            'цели сбора'
        ]
        for keyword in purpose_keywords:
            if keyword in html_text:
                checks["data_processing_purpose"]["found"] = True
                checks["data_processing_purpose"]["details"].append(f"Найдено: {keyword}")
        
        # Проверка 7: Сроки хранения
        retention_keywords = [
            'срок хранения',
            'хранятся в течение',
            'период хранения',
            'уничтожение данных'
        ]
        for keyword in retention_keywords:
            if keyword in html_text:
                checks["data_retention"]["found"] = True
                checks["data_retention"]["details"].append(f"Найдено: {keyword}")
        
        # Проверка 8: Передача третьим лицам
        third_party_keywords = [
            'передача третьим лицам',
            'распространение',
            'предоставление данным',
            'совместное использование'
        ]
        for keyword in third_party_keywords:
            if keyword in html_text:
                checks["third_party_disclosure"]["found"] = True
                checks["third_party_disclosure"]["details"].append(f"Найдено: {keyword}")
        
        # Подсчитываем результаты
        total_checks = len([c for c in checks.values() if c["required"]])
        passed_checks = len([c for c in checks.values() if c["required"] and c["found"]])
        compliance_percentage = round((passed_checks / total_checks) * 100) if total_checks > 0 else 0
        
        return {
            "url": website_url,
            "checked_at": datetime.now().isoformat(),
            "compliance_percentage": compliance_percentage,
            "total_required": total_checks,
            "passed_required": passed_checks,
            "checks": checks
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Не удалось получить доступ к сайту: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при проверке: {str(e)}")