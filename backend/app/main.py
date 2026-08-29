from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.database import engine, Base, get_db
from app import models
from app.schemas import TenantCreate, TenantResponse
from app.services.document_generator import document_generator

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Compliance Box API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/tenants/", response_model=TenantResponse)
def create_tenant(tenant: TenantCreate, db: Session = Depends(get_db)):
    db_tenant = db.query(models.Tenant).filter(models.Tenant.inn == tenant.inn).first()
    if db_tenant:
        raise HTTPException(status_code=400, detail="Компания с таким ИНН уже существует")
    
    new_tenant = models.Tenant(**tenant.model_dump())
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@app.get("/api/v1/tenants/", response_model=List[TenantResponse])
def read_tenants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tenants = db.query(models.Tenant).offset(skip).limit(limit).all()
    return tenants

@app.get("/api/v1/documents/list")
def get_documents_list():
    return [
        {"id": "policy-152fz", "name": "1. Политика обработки персональных данных (152-ФЗ)"},
        {"id": "consent-152fz", "name": "2. Согласие субъекта на обработку ПДн (152-ФЗ)"},
        {"id": "nda-152fz", "name": "3. Обязательство о неразглашении ПДн (для сотрудников)"},
        {"id": "order-responsible-152fz", "name": "4. Приказ о назначении ответственного за обработку ПДн"},
        {"id": "threat-model-fstek", "name": "5. Модель угроз безопасности ПДн (ФСТЭК)"}
    ]

@app.post("/api/v1/documents/policy-152fz")
def generate_policy_152fz(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_policy_152fz(company_data))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=policy_152fz_{tenant.inn}.pdf"}
    )

@app.post("/api/v1/documents/consent-152fz")
def generate_consent_152fz(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_consent_152fz(company_data))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=consent_152fz_{tenant.inn}.pdf"}
    )

@app.post("/api/v1/documents/nda-152fz")
def generate_nda_152fz(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_nda_152fz(company_data))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=nda_152fz_{tenant.inn}.pdf"}
    )

@app.post("/api/v1/documents/order-responsible-152fz")
def generate_order_responsible_152fz(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_order_responsible_152fz(company_data))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=order_responsible_{tenant.inn}.pdf"}
    )

@app.post("/api/v1/documents/threat-model-fstek")
def generate_threat_model_fstek(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    company_data = {"name": tenant.name, "inn": tenant.inn, "email": tenant.email}
    pdf_bytes = bytes(document_generator.generate_threat_model_fstek(company_data))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=threat_model_fstek_{tenant.inn}.pdf"}
    )