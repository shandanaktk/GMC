from __future__ import annotations

import hashlib
import html
import json
import secrets
from datetime import datetime, timezone
from urllib.parse import quote

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .audit_service import run_audit_job
from .config import get_settings
from .database import get_db, initialize_database
from .google_client import GoogleApiError, GoogleClient
from .models import Audit, ClientReport, MerchantAccount, SpecialistRequest, User, UserSession, utcnow
from .reporting import audit_pdf, products_csv, send_resend_email
from .security import create_session, delete_session, get_session, read_oauth_state, sign_oauth_state


settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Requested-With"],
)


@app.middleware("http")
async def csrf_header_check(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path.startswith("/api/"):
        if request.headers.get("X-Requested-With") != "MerchantAudit":
            return Response(content='{"detail":"Missing CSRF request header"}', status_code=403, media_type="application/json")
    return await call_next(request)


class SpecialistInput(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    need: str = Field(min_length=2, max_length=255)
    note: str = Field(default="", max_length=4000)


class ClientReportInput(BaseModel):
    website: str = Field(default="", max_length=2048)
    merchantId: str = Field(pattern=r"^\d{4,20}$")
    market: str = Field(min_length=2, max_length=128)
    clientEmail: EmailStr


class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[dict] = Field(default_factory=list, max_length=12)


@app.on_event("startup")
def startup() -> None:
    initialize_database()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "environment": settings.app_env}


def current_session(request: Request, db: Session = Depends(get_db)) -> UserSession:
    session = get_session(db, request.cookies.get(settings.session_cookie_name))
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return session


def current_user(session: UserSession = Depends(current_session), db: Session = Depends(get_db)) -> User:
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return user


def selected_account(db: Session, user_id: str) -> MerchantAccount:
    account = db.scalar(
        select(MerchantAccount)
        .where(MerchantAccount.user_id == user_id, MerchantAccount.is_selected.is_(True))
        .order_by(MerchantAccount.connected_at.asc())
    )
    if account is None:
        account = db.scalar(select(MerchantAccount).where(MerchantAccount.user_id == user_id).order_by(MerchantAccount.connected_at.asc()))
    if account is None:
        raise HTTPException(status_code=409, detail="No Merchant Center account is connected")
    return account


def latest_completed_audit(db: Session, account_id: str) -> Audit:
    audit = db.scalar(
        select(Audit)
        .where(Audit.merchant_account_id == account_id, Audit.status == "completed")
        .order_by(Audit.completed_at.desc())
    )
    if audit is None or not audit.payload:
        raise HTTPException(status_code=409, detail="No completed audit is available")
    return audit


@app.get("/api/auth/google/start")
def google_start(return_to: str = "/dashboard") -> RedirectResponse:
    if not return_to.startswith("/") or return_to.startswith("//"):
        return_to = "/dashboard"
    state_value = sign_oauth_state({"nonce": secrets.token_urlsafe(24), "return_to": return_to})
    try:
        url = GoogleClient().authorization_url(state_value)
    except GoogleApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    response = RedirectResponse(url, status_code=302)
    response.set_cookie(
        "merchant_audit_oauth_state",
        hashlib.sha256(state_value.encode()).hexdigest(),
        max_age=600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/auth/google",
    )
    return response


@app.get("/api/auth/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return RedirectResponse(f"{settings.frontend_url}/?auth_error={quote(error)}", status_code=302)
    if not code or not state:
        return RedirectResponse(f"{settings.frontend_url}/?auth_error=missing_oauth_response", status_code=302)
    try:
        expected_state_hash = request.cookies.get("merchant_audit_oauth_state", "")
        received_state_hash = hashlib.sha256(state.encode()).hexdigest()
        if not expected_state_hash or not secrets.compare_digest(expected_state_hash, received_state_hash):
            raise ValueError("OAuth state is not bound to this browser")
        state_data = read_oauth_state(state)
        client = GoogleClient()
        tokens = client.exchange_code(code)
        profile = client.user_info(tokens["access_token"])
        if not profile.get("sub") or not profile.get("email"):
            raise GoogleApiError("Google profile did not include a stable ID and email", 400)

        user = db.scalar(select(User).where(User.google_subject == profile["sub"]))
        if user is None:
            user = User(
                google_subject=profile["sub"],
                email=profile["email"],
                name=profile.get("name") or profile["email"].split("@", 1)[0],
                picture_url=profile.get("picture"),
            )
            db.add(user)
            db.flush()
        else:
            user.email = profile["email"]
            user.name = profile.get("name") or user.name
            user.picture_url = profile.get("picture") or user.picture_url
        client.save_credential(db, user.id, tokens)
        db.flush()

        if settings.google_register_project_on_login:
            client.register_project(
                tokens["access_token"],
                settings.google_developer_merchant_id,
                settings.google_developer_email,
            )

        remote_accounts = client.list_accounts(tokens["access_token"])
        if not remote_accounts:
            raise GoogleApiError("This Google user has no accessible Merchant Center accounts", 403)
        existing = {
            item.merchant_id: item
            for item in db.scalars(select(MerchantAccount).where(MerchantAccount.user_id == user.id)).all()
        }
        selected_exists = any(item.is_selected for item in existing.values())
        for index, remote in enumerate(remote_accounts):
            merchant_id = str(remote.get("accountId") or remote.get("name", "").rsplit("/", 1)[-1])
            if not merchant_id:
                continue
            account = existing.get(merchant_id)
            homepage_url = remote.get("homePageUri")
            time_zone = remote.get("timeZone") or {}
            if account is None:
                account = MerchantAccount(
                    user_id=user.id,
                    merchant_id=merchant_id,
                    name=remote.get("accountName") or f"Merchant {merchant_id}",
                    website_url=homepage_url,
                    language_code=remote.get("languageCode"),
                    time_zone=time_zone.get("id") if isinstance(time_zone, dict) else str(time_zone),
                    is_test=bool(remote.get("testAccount")),
                    is_selected=not selected_exists and index == 0,
                )
                db.add(account)
            else:
                account.name = remote.get("accountName") or account.name
                account.website_url = homepage_url or account.website_url
                account.language_code = remote.get("languageCode") or account.language_code
                account.time_zone = time_zone.get("id") if isinstance(time_zone, dict) else account.time_zone
                account.is_test = bool(remote.get("testAccount"))
        db.commit()
        raw_session, _ = create_session(db, user.id)
        return_to = state_data.get("return_to", "/dashboard")
        response = RedirectResponse(f"{settings.frontend_url}{return_to}?auth=success", status_code=302)
        response.delete_cookie("merchant_audit_oauth_state", path="/api/auth/google")
        response.set_cookie(
            settings.session_cookie_name,
            raw_session,
            max_age=settings.session_days * 86400,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
            path="/",
        )
        return response
    except (GoogleApiError, ValueError, httpx.HTTPError) as exc:
        db.rollback()
        return RedirectResponse(f"{settings.frontend_url}/?auth_error={quote(str(exc))}", status_code=302)


@app.get("/api/auth/session")
def auth_session(user: User = Depends(current_user)) -> dict:
    return {"authenticated": True, "user": _serialize_user(user)}


@app.post("/api/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    delete_session(db, request.cookies.get(settings.session_cookie_name))
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
    response.status_code = 204
    return response


@app.get("/api/accounts")
def list_accounts(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    accounts = db.scalars(select(MerchantAccount).where(MerchantAccount.user_id == user.id).order_by(MerchantAccount.name)).all()
    return [_serialize_account_option(item) for item in accounts]


@app.put("/api/accounts/{merchant_id}/select")
def switch_account(merchant_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    account = db.scalar(
        select(MerchantAccount).where(MerchantAccount.user_id == user.id, MerchantAccount.merchant_id == merchant_id)
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Merchant Center account not found")
    db.execute(update(MerchantAccount).where(MerchantAccount.user_id == user.id).values(is_selected=False))
    account.is_selected = True
    db.commit()
    return _serialize_account_option(account)


@app.get("/api/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    account = selected_account(db, user.id)
    audit = db.scalar(
        select(Audit)
        .where(Audit.merchant_account_id == account.id, Audit.status == "completed")
        .order_by(Audit.completed_at.desc())
    )
    if audit is None:
        running = db.scalar(
            select(Audit).where(Audit.merchant_account_id == account.id, Audit.status.in_(("queued", "running"))).order_by(Audit.created_at.desc())
        )
        if running is None:
            running = Audit(merchant_account_id=account.id, status="queued", progress=0, progress_label="Preparing audit")
            db.add(running)
            db.commit()
        run_audit_job(running.id)
        db.expire_all()
        audit = db.get(Audit, running.id)
        if audit is None or audit.status != "completed":
            message = audit.error_message if audit else "Audit did not complete"
            raise HTTPException(status_code=502, detail=message)
    return _dashboard_payload(db, user, account, audit)


@app.post("/api/audits", status_code=202)
def start_audit(
    background_tasks: BackgroundTasks,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    account = selected_account(db, user.id)
    running = db.scalar(
        select(Audit).where(Audit.merchant_account_id == account.id, Audit.status.in_(("queued", "running"))).order_by(Audit.created_at.desc())
    )
    if running:
        background_tasks.add_task(run_audit_job, running.id)
        return _audit_status(running)
    audit = Audit(merchant_account_id=account.id, status="queued", progress=1, progress_label="Preparing secure connection")
    db.add(audit)
    db.commit()
    background_tasks.add_task(run_audit_job, audit.id)
    return _audit_status(audit)


@app.get("/api/audits/{audit_id}")
def audit_status(audit_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    audit = db.scalar(
        select(Audit)
        .join(MerchantAccount)
        .where(Audit.id == audit_id, MerchantAccount.user_id == user.id)
    )
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return _audit_status(audit)


@app.post("/api/specialist-requests", status_code=201)
def specialist_request(body: SpecialistInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    account = selected_account(db, user.id)
    reference = f"REQ-{secrets.token_hex(4).upper()}"
    request_record = SpecialistRequest(
        reference=reference,
        user_id=user.id,
        merchant_account_id=account.id,
        contact_name=body.name,
        contact_email=str(body.email),
        need=body.need,
        note=body.note,
    )
    db.add(request_record)
    db.commit()
    delivered = False
    if settings.resend_api_key and settings.resend_to_email:
        try:
            send_resend_email(
                settings.resend_to_email,
                f"MerchantAudit specialist request {reference}",
                f"<h2>New specialist request</h2><p><b>Merchant:</b> {html.escape(account.name)} ({html.escape(account.merchant_id)})</p><p><b>Contact:</b> {html.escape(body.name)} &lt;{html.escape(str(body.email))}&gt;</p><p><b>Need:</b> {html.escape(body.need)}</p><p>{html.escape(body.note)}</p>",
            )
            request_record.delivery_status = "emailed"
            db.commit()
            delivered = True
        except RuntimeError:
            request_record.delivery_status = "email_failed"
            db.commit()
    return {"success": True, "reference": reference, "emailDelivered": delivered}


@app.get("/api/exports/products.csv")
def export_products(user: User = Depends(current_user), db: Session = Depends(get_db)) -> StreamingResponse:
    account = selected_account(db, user.id)
    audit = latest_completed_audit(db, account.id)
    content = products_csv(audit.payload or {})
    filename = f"merchant-audit-{account.merchant_id}-products.csv"
    return StreamingResponse(iter([content]), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/reports/current.pdf")
def current_report(user: User = Depends(current_user), db: Session = Depends(get_db)) -> StreamingResponse:
    account = selected_account(db, user.id)
    audit = latest_completed_audit(db, account.id)
    content = audit_pdf(audit.payload or {})
    filename = f"merchant-audit-{account.merchant_id}.pdf"
    return StreamingResponse(iter([content]), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.post("/api/client-reports/send", status_code=201)
def send_client_report(body: ClientReportInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if not settings.resend_api_key:
        raise HTTPException(status_code=503, detail="Client report email is unavailable until RESEND_API_KEY is configured")
    account = db.scalar(
        select(MerchantAccount).where(MerchantAccount.user_id == user.id, MerchantAccount.merchant_id == body.merchantId)
    )
    if account is None:
        raise HTTPException(status_code=403, detail="Authorize this client Merchant Center account with Google before sending its report")
    audit = latest_completed_audit(db, account.id)
    report = ClientReport(
        user_id=user.id,
        merchant_account_id=account.id,
        audit_id=audit.id,
        recipient_email=str(body.clientEmail),
        client_website=str(body.website),
        target_market=body.market,
    )
    db.add(report)
    db.commit()
    try:
        pdf = audit_pdf(audit.payload or {})
        provider_id = send_resend_email(
            str(body.clientEmail),
            f"Google Merchant Center audit — {account.name}",
            f"<p>Hello,</p><p>Your Google Merchant Center audit for <b>{html.escape(account.name)}</b> is attached.</p><p>The report is based on current read-only Merchant API diagnostics and the connected store website.</p>",
            pdf,
        )
        report.delivery_status = "sent"
        report.provider_message_id = provider_id
        db.commit()
    except RuntimeError as exc:
        report.delivery_status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"success": True, "reportId": report.id, "providerMessageId": report.provider_message_id}


@app.post("/api/support/chat")
def support_chat(body: ChatInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="Audit support chat is unavailable until OPENAI_API_KEY is configured")
    account = selected_account(db, user.id)
    audit = latest_completed_audit(db, account.id)
    payload = audit.payload or {}
    context = {
        "account": payload.get("account"),
        "summary": payload.get("summary"),
        "priorityIssues": payload.get("priorityIssues", [])[:15],
        "accountIssues": payload.get("accountIssues", [])[:15],
        "approvalChecks": payload.get("approvalChecks", []),
    }
    history = [
        {"role": item.get("role"), "content": str(item.get("text", ""))[:2000]}
        for item in body.history[-10:]
        if item.get("role") in {"user", "assistant"}
    ]
    input_items = history + [{"role": "user", "content": body.message}]
    response = httpx.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
        json={
            "model": settings.openai_model,
            "store": False,
            "max_output_tokens": 450,
            "safety_identifier": hashlib.sha256(user.id.encode()).hexdigest()[:32],
            "instructions": "You are MerchantAudit's GMC support assistant. Answer only from the live audit context supplied below. Be concise, explain priorities clearly, never claim to have edited Merchant Center, and recommend a human specialist when the audit data is insufficient.\n\nLIVE AUDIT CONTEXT:\n" + json.dumps(context, ensure_ascii=False),
            "input": input_items,
        },
        timeout=60,
    )
    if response.is_error:
        try:
            message = response.json().get("error", {}).get("message")
        except ValueError:
            message = response.reason_phrase
        raise HTTPException(status_code=502, detail=f"OpenAI response failed: {message}")
    data = response.json()
    text_parts = [
        content.get("text", "")
        for item in data.get("output", [])
        if item.get("type") == "message"
        for content in item.get("content", [])
        if content.get("type") == "output_text"
    ]
    reply = "".join(text_parts).strip()
    if not reply:
        raise HTTPException(status_code=502, detail="OpenAI returned no support message")
    return {"reply": reply}


def _serialize_user(user: User) -> dict:
    initials = "".join(part[0] for part in user.name.split()[:2]).upper() or user.email[:1].upper()
    return {"id": user.id, "name": user.name, "email": user.email, "initials": initials, "picture": user.picture_url}


def _serialize_account_option(account: MerchantAccount) -> dict:
    return {
        "merchantId": account.merchant_id,
        "id": f"MC-{account.merchant_id}",
        "name": account.name,
        "website": account.website_url or "",
        "selected": account.is_selected,
        "testAccount": account.is_test,
    }


def _dashboard_payload(db: Session, user: User, account: MerchantAccount, audit: Audit) -> dict:
    payload = dict(audit.payload or {})
    completed = audit.completed_at or audit.created_at
    payload["account"] = {**payload.get("account", {}), "lastAudit": _relative(completed)}
    payload["user"] = _serialize_user(user)
    accounts = db.scalars(select(MerchantAccount).where(MerchantAccount.user_id == user.id).order_by(MerchantAccount.name)).all()
    payload["accounts"] = [_serialize_account_option(item) for item in accounts]
    history = db.scalars(
        select(Audit)
        .where(Audit.merchant_account_id == account.id, Audit.status == "completed")
        .order_by(Audit.completed_at.desc())
        .limit(90)
    ).all()
    payload["healthTrend"] = [
        {"date": (item.completed_at or item.created_at).strftime("%b %d"), "timestamp": (item.completed_at or item.created_at).isoformat(), "score": item.health_score}
        for item in reversed(history)
    ]
    summary = payload.get("summary", {})
    notifications = [
        {
            "id": f"audit-{audit.id}",
            "title": "Audit completed",
            "body": f"{summary.get('productsChecked', 0):,} products were checked successfully.",
            "time": _relative(completed),
            "unread": False,
        }
    ]
    delta = int(summary.get("healthScore", 0)) - int(summary.get("previousScore", summary.get("healthScore", 0)))
    if delta:
        notifications.insert(0, {"id": f"score-{audit.id}", "title": "Catalog health changed", "body": f"Your score {'increased' if delta > 0 else 'decreased'} by {abs(delta)} points since the previous audit.", "time": _relative(completed), "unread": True})
    if summary.get("critical", 0):
        notifications.insert(0, {"id": f"critical-{audit.id}", "title": f"{summary['critical']:,} disapproved products", "body": "Open Product issues to review Google's current diagnostics.", "time": _relative(completed), "unread": True})
    payload["notifications"] = notifications
    return payload


def _audit_status(audit: Audit) -> dict:
    return {
        "id": audit.id,
        "status": audit.status,
        "progress": audit.progress,
        "label": audit.progress_label,
        "error": audit.error_message,
    }


def _relative(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    seconds = max(0, int((datetime.now(timezone.utc) - value).total_seconds()))
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"

