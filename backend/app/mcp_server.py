"""MCP-сервер ComplianceBox: собственный Streamable HTTP (JSON-RPC) эндпоинт /mcp.

Не зависит от SDK `mcp`: реализует минимум протокола MCP поверх FastAPI.
Авторизация: заголовок Authorization: Bearer cbx_...
"""
import json
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from app import models
from app.api_tokens import authenticate_api_token
from app.database import SessionLocal

PROTOCOL_VERSION = "2025-03-26"

router = APIRouter()


def _get_user(request: Request):
    """Достаёт пользователя из заголовка Authorization: Bearer cbx_..."""
    auth = request.headers.get("authorization", "") or ""
    raw = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    if not raw.startswith("cbx_"):
        return None
    db = SessionLocal()
    try:
        return authenticate_api_token(raw, db)
    finally:
        db.close()


def _db():
    return SessionLocal()


# ============================================================================
# ИНСТРУМЕНТЫ (read-only)
# ============================================================================
def tool_list_companies(user_id: int, params: dict) -> Any:
    db = _db()
    try:
        tenants = db.query(models.Tenant).filter(models.Tenant.user_id == user_id).all()
        return [{"id": t.id, "name": t.name, "inn": t.inn, "website": t.website} for t in tenants]
    finally:
        db.close()


def tool_get_pd_registry(user_id: int, params: dict) -> Any:
    tenant_id = int(params.get("tenant_id"))
    db = _db()
    try:
        rows = (
            db.query(models.PdSubject)
            .filter(models.PdSubject.tenant_id == tenant_id, models.PdSubject.user_id == user_id)
            .order_by(models.PdSubject.created_at.desc())
            .all()
        )
        return [
            {
                "id": s.id,
                "full_name": s.full_name,
                "category": s.category,
                "legal_basis": s.legal_basis,
                "data_types": s.data_types,
            }
            for s in rows
        ]
    finally:
        db.close()


def tool_get_data_map(user_id: int, params: dict) -> Any:
    tenant_id = int(params.get("tenant_id"))
    db = _db()
    try:
        rows = (
            db.query(models.DataSystem)
            .filter(
                models.DataSystem.tenant_id == tenant_id,
                models.DataSystem.user_id == user_id,
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
        return out
    finally:
        db.close()


def tool_get_tariff_limits(user_id: int, params: dict) -> Any:
    tenant_id = int(params.get("tenant_id"))
    db = _db()
    try:
        subjects = db.query(models.PdSubject).filter(models.PdSubject.tenant_id == tenant_id, models.PdSubject.user_id == user_id).count()
        systems = db.query(models.DataSystem).filter(models.DataSystem.tenant_id == tenant_id, models.DataSystem.user_id == user_id, models.DataSystem.is_active == True).count()
        reqs = db.query(models.SubjectRequest).filter(models.SubjectRequest.tenant_id == tenant_id, models.SubjectRequest.user_id == user_id).count()
        return {
            "tariff": "Free",
            "pd_subjects": {"current": subjects, "limit": 10},
            "data_systems": {"current": systems, "limit": 1},
            "subject_requests": {"current": reqs, "limit": 1},
        }
    finally:
        db.close()


def tool_list_subject_requests(user_id: int, params: dict) -> Any:
    tenant_id = int(params.get("tenant_id"))
    db = _db()
    try:
        rows = (
            db.query(models.SubjectRequest)
            .filter(models.SubjectRequest.tenant_id == tenant_id, models.SubjectRequest.user_id == user_id)
            .order_by(models.SubjectRequest.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "subject_name": r.subject_name,
                "request_type": r.request_type,
                "status": r.status,
                "deadline": r.deadline.isoformat() if r.deadline else None,
            }
            for r in rows
        ]
    finally:
        db.close()


TOOLS = {
    "list_companies": {
        "handler": tool_list_companies,
        "description": "Список компаний пользователя: id, название, ИНН, сайт.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    "get_pd_registry": {
        "handler": tool_get_pd_registry,
        "description": "Реестр субъектов ПДн компании: ФИО, категория, основание, состав данных.",
        "inputSchema": {
            "type": "object",
            "properties": {"tenant_id": {"type": "integer", "description": "ID компании"}},
            "required": ["tenant_id"],
        },
    },
    "get_data_map": {
        "handler": tool_get_data_map,
        "description": "Карта обработки ПДн: информационные системы компании и число субъектов в них.",
        "inputSchema": {
            "type": "object",
            "properties": {"tenant_id": {"type": "integer", "description": "ID компании"}},
            "required": ["tenant_id"],
        },
    },
    "get_tariff_limits": {
        "handler": tool_get_tariff_limits,
        "description": "Лимиты тарифа компании: реестр, ИС, запросы субъектов (текущие/лимит).",
        "inputSchema": {
            "type": "object",
            "properties": {"tenant_id": {"type": "integer", "description": "ID компании"}},
            "required": ["tenant_id"],
        },
    },
    "list_subject_requests": {
        "handler": tool_list_subject_requests,
        "description": "Запросы субъектов ПДн: кто, тип запроса, дедлайн ответа, статус.",
        "inputSchema": {
            "type": "object",
            "properties": {"tenant_id": {"type": "integer", "description": "ID компании"}},
            "required": ["tenant_id"],
        },
    },
}


# ============================================================================
# MCP ENDPOINT (Streamable HTTP, stateless)
# ============================================================================
@router.post("/mcp")
async def mcp_endpoint(request: Request):
    user = _get_user(request)
    if user is None:
        return JSONResponse(
            status_code=401,
            content={
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32001, "message": "Unauthorized: нужен заголовок Authorization: Bearer cbx_..."},
            },
        )

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}},
        )

    method = body.get("method")
    msg_id = body.get("id")
    params = body.get("params") or {}

    # Уведомления (без id) — принимаем без тела
    if msg_id is None:
        return Response(status_code=202)

    if method == "initialize":
        return JSONResponse(
            content={
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": params.get("protocolVersion") or PROTOCOL_VERSION,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "ComplianceBox", "version": "1.0.0"},
                },
            }
        )

    if method == "ping":
        return JSONResponse(content={"jsonrpc": "2.0", "id": msg_id, "result": {}})

    if method == "tools/list":
        tools = [
            {"name": name, "description": spec["description"], "inputSchema": spec["inputSchema"]}
            for name, spec in TOOLS.items()
        ]
        return JSONResponse(content={"jsonrpc": "2.0", "id": msg_id, "result": {"tools": tools}})

    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name not in TOOLS:
            return JSONResponse(
                content={"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32602, "message": f"Unknown tool: {name}"}}
            )
        try:
            data = TOOLS[name]["handler"](user.id, args)
            text = json.dumps(data, ensure_ascii=False, default=str)
            result = {"content": [{"type": "text", "text": text}], "isError": False}
        except Exception as e:  # noqa: BLE001
            result = {"content": [{"type": "text", "text": f"Ошибка инструмента: {e}"}], "isError": True}
        return JSONResponse(content={"jsonrpc": "2.0", "id": msg_id, "result": result})

    return JSONResponse(
        content={"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}
    )