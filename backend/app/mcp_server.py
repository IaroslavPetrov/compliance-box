"""MCP-сервер ComplianceBox: read-only инструменты для AI-ассистентов."""
import json

from mcp.server.fastmcp import Context, FastMCP

from app import models
from app.api_tokens import authenticate_api_token
from app.database import SessionLocal

mcp = FastMCP("ComplianceBox", stateless_http=True)


def _user_from_ctx(ctx: Context):
    """Достаёт пользователя из заголовка Authorization: Bearer cbx_..."""
    request = getattr(ctx.request_context, "request", None)
    auth = ""
    if request is not None:
        auth = request.headers.get("authorization", "") or ""
    raw = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    if not raw.startswith("cbx_"):
        raise ValueError("Нужен заголовок Authorization: Bearer cbx_... (выпусти токен в ComplianceBox)")
    db = SessionLocal()
    try:
        user = authenticate_api_token(raw, db)
    finally:
        db.close()
    if user is None:
        raise ValueError("API-токен недействителен или отозван")
    return user


@mcp.tool()
def list_companies(ctx: Context) -> str:
    """Список компаний пользователя: id, название, ИНН, сайт."""
    _user_from_ctx(ctx)
    db = SessionLocal()
    try:
        tenants = db.query(models.Tenant).filter(models.Tenant.user_id == _uid(ctx)).all()
        return json.dumps(
            [{"id": t.id, "name": t.name, "inn": t.inn, "website": t.website} for t in tenants],
            ensure_ascii=False,
        )
    finally:
        db.close()


_uid_cache = {}


def _uid(ctx: Context) -> int:
    """Кэш id пользователя в рамках одного вызова инструмента."""
    user = _user_from_ctx(ctx)
    return user.id


@mcp.tool()
def get_pd_registry(ctx: Context, tenant_id: int) -> str:
    """Реестр субъектов ПДн компании: ФИО, категория, основание, состав данных."""
    uid = _uid(ctx)
    db = SessionLocal()
    try:
        rows = (
            db.query(models.PdSubject)
            .filter(models.PdSubject.tenant_id == tenant_id, models.PdSubject.user_id == uid)
            .order_by(models.PdSubject.created_at.desc())
            .all()
        )
        return json.dumps(
            [
                {
                    "id": s.id,
                    "full_name": s.full_name,
                    "category": s.category,
                    "legal_basis": s.legal_basis,
                    "data_types": s.data_types,
                }
                for s in rows
            ],
            ensure_ascii=False,
        )
    finally:
        db.close()


@mcp.tool()
def get_data_map(ctx: Context, tenant_id: int) -> str:
    """Карта обработки ПДн: информационные системы компании и число субъектов в них."""
    uid = _uid(ctx)
    db = SessionLocal()
    try:
        rows = (
            db.query(models.DataSystem)
            .filter(
                models.DataSystem.tenant_id == tenant_id,
                models.DataSystem.user_id == uid,
                models.DataSystem.is_active == True,
            )
            .all()
        )
        out = []
        for ds in rows:
            try:
                cats = json.loads(ds.categories) if ds.categories else []
            except Exception:
                cats = []
            out.append(
                {
                    "id": ds.id,
                    "name": ds.name,
                    "system_type": ds.system_type,
                    "categories": cats,
                    "data_location": ds.data_location,
                    "subjects_count": len(ds.pd_subjects) if ds.pd_subjects else 0,
                }
            )
        return json.dumps(out, ensure_ascii=False)
    finally:
        db.close()


@mcp.tool()
def get_tariff_limits(ctx: Context, tenant_id: int) -> str:
    """Лимиты тарифа компании: реестр, ИС, запросы субъектов (текущие/лимит)."""
    uid = _uid(ctx)
    db = SessionLocal()
    try:
        subjects = db.query(models.PdSubject).filter(models.PdSubject.tenant_id == tenant_id, models.PdSubject.user_id == uid).count()
        systems = db.query(models.DataSystem).filter(models.DataSystem.tenant_id == tenant_id, models.DataSystem.user_id == uid, models.DataSystem.is_active == True).count()
        requests = db.query(models.SubjectRequest).filter(models.SubjectRequest.tenant_id == tenant_id, models.SubjectRequest.user_id == uid).count()
        return json.dumps(
            {
                "tariff": "Free",
                "pd_subjects": {"current": subjects, "limit": 10},
                "data_systems": {"current": systems, "limit": 1},
                "subject_requests": {"current": requests, "limit": 1},
            },
            ensure_ascii=False,
        )
    finally:
        db.close()


@mcp.tool()
def list_subject_requests(ctx: Context, tenant_id: int) -> str:
    """Запросы субъектов ПДн: кто, тип запроса, дедлайн ответа, статус."""
    uid = _uid(ctx)
    db = SessionLocal()
    try:
        rows = (
            db.query(models.SubjectRequest)
            .filter(models.SubjectRequest.tenant_id == tenant_id, models.SubjectRequest.user_id == uid)
            .order_by(models.SubjectRequest.created_at.desc())
            .all()
        )
        return json.dumps(
            [
                {
                    "id": r.id,
                    "subject_name": r.subject_name,
                    "request_type": r.request_type,
                    "status": r.status,
                    "deadline": r.deadline.isoformat() if r.deadline else None,
                }
                for r in rows
            ],
            ensure_ascii=False,
        )
    finally:
        db.close()