from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.services.document_generator import document_generator
from fastapi.responses import Response
from . import models, schemas
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ComplianceBox API",
    description="API для SaaS-платформы автоматизации 152-ФЗ и ФСТЭК",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://compliance-box-m89i.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "ComplianceBox API is running! 🚀"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/tenants/", response_model=schemas.TenantResponse)
def create_tenant(tenant: schemas.TenantCreate, db: Session = Depends(get_db)):
    db_tenant = db.query(models.Tenant).filter(models.Tenant.inn == tenant.inn).first()
    if db_tenant:
        raise HTTPException(status_code=400, detail="Компания с таким ИНН уже существует")
    
    new_tenant = models.Tenant(**tenant.dict())
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@app.get("/api/v1/tenants/", response_model=List[schemas.TenantResponse])
def read_tenants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tenants = db.query(models.Tenant).offset(skip).limit(limit).all()
    return 

@app.post("/api/v1/documents/policy-152fz")
async def generate_policy_152fz(tenant_id: int, db: Session = Depends(get_db)):
    """Генерация Политики обработки ПДн (152-ФЗ)"""
    from app.models import Tenant
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {
        "name": tenant.name,
        "inn": tenant.inn,
        "email": tenant.email,
        "address": getattr(tenant, 'address', 'Не указан')
    }
    
    pdf_bytes = document_generator.generate_policy_152fz(company_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=policy_152fz_{tenant.inn}.pdf"}
    )


@app.post("/api/v1/documents/notification-152fz")
async def generate_notification_152fz(tenant_id: int, db: Session = Depends(get_db)):
    """Генерация Уведомления об обработке ПДн (152-ФЗ)"""
    from app.models import Tenant
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {
        "name": tenant.name,
        "inn": tenant.inn,
        "email": tenant.email,
        "address": getattr(tenant, 'address', 'Не указан')
    }
    
    pdf_bytes = document_generator.generate_notification_152fz(company_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=notification_152fz_{tenant.inn}.pdf"}
    )


@app.post("/api/v1/documents/threat-model-fstek")
async def generate_threat_model(tenant_id: int, db: Session = Depends(get_db)):
    """Генерация Модели угроз (ФСТЭК)"""
    from app.models import Tenant
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {
        "name": tenant.name,
        "inn": tenant.inn,
        "email": tenant.email,
        "address": getattr(tenant, 'address', 'Не указан')
    }
    
    pdf_bytes = document_generator.generate_threat_model_fstek(company_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=threat_model_{tenant.inn}.pdf"}
    )


@app.get("/api/v1/documents/list")
async def get_documents_list():
    """Список доступных документов для генерации"""
    return {
        "documents": [
            {
                "id": "policy-152fz",
                "name": "Политика обработки персональных данных",
                "regulation": "152-ФЗ",
                "description": "Основной документ, описывающий принципы и цели обработки ПДн"
            },
            {
                "id": "notification-152fz",
                "name": "Уведомление об обработке ПДн",
                "regulation": "152-ФЗ",
                "description": "Уведомление в Роскомнадзор (если требуется)"
            },
            {
                "id": "threat-model-fstek",
                "name": "Модель угроз безопасности ПДн",
                "regulation": "ФСТЭК",
                "description": "Документ для аттестации ИСПДн"
            }
        ]
    }