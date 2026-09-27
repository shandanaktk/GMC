from __future__ import annotations

import hashlib
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import select

from .database import SessionLocal
from .google_client import GoogleClient
from .models import Audit, MerchantAccount, utcnow
from .website_audit import audit_website


COUNTRY_NAMES = {
    "AU": "Australia",
    "CA": "Canada",
    "DE": "Germany",
    "FR": "France",
    "GB": "United Kingdom",
    "IN": "India",
    "PK": "Pakistan",
    "US": "United States",
}

ISSUE_GUIDANCE = {
    "gtin": "Submit the manufacturer-assigned GTIN from the product or packaging. Never invent or reuse an identifier.",
    "price": "Keep the feed, landing page, structured data, and checkout price identical, including currency and variants.",
    "availability": "Synchronize availability between the feed, visible landing page, structured data, and checkout.",
    "image": "Provide a crawlable, high-quality primary image without promotional text, borders, or placeholders.",
    "brand": "Submit the exact manufacturer brand shown on the product and landing page.",
    "mpn": "Submit the manufacturer part number when no GTIN exists and keep it consistent with the product page.",
    "landing": "Make the submitted landing page publicly crawlable, stable, and specific to the exact product variant.",
    "shipping": "Complete shipping rates and transit times for every targeted country.",
    "default": "Review Google's diagnostic detail, correct the source product data or website, then resync and allow time for review.",
}


def _set_progress(db, audit: Audit, percent: int, label: str) -> None:
    audit.progress = percent
    audit.progress_label = label
    db.commit()


def _issue_id(code: str) -> str:
    return "ISS-" + hashlib.sha1(code.encode("utf-8")).hexdigest()[:10].upper()


def _guidance(code: str, title: str) -> str:
    value = f"{code} {title}".lower()
    return next((text for key, text in ISSUE_GUIDANCE.items() if key != "default" and key in value), ISSUE_GUIDANCE["default"])


def _relative_time(value: str | None) -> str:
    if not value:
        return "Unknown"
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - timestamp
    except ValueError:
        return value
    seconds = max(0, int(delta.total_seconds()))
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


def _price(value: dict | None) -> tuple[str, str]:
    if not value:
        return "—", ""
    currency = value.get("currencyCode", "")
    try:
        amount = Decimal(str(value.get("amountMicros", "0"))) / Decimal("1000000")
    except InvalidOperation:
        return "—", currency
    symbols = {"USD": "$", "GBP": "£", "EUR": "€", "AUD": "A$", "CAD": "C$"}
    return f"{symbols.get(currency, currency + ' ')}{amount:,.2f}", currency


def _product_status(product: dict) -> tuple[str, str, list[dict]]:
    status = product.get("productStatus") or {}
    issues = sorted(
        status.get("itemLevelIssues") or [],
        key=lambda item: str(item.get("severity", "")).upper() != "DISAPPROVED",
    )
    destinations = status.get("destinationStatuses") or []
    severities = {str(item.get("severity", "")).upper() for item in issues}
    if any(item.get("disapprovedCountries") for item in destinations) or "DISAPPROVED" in severities:
        return "Disapproved", "critical", issues
    if any(item.get("pendingCountries") for item in destinations) or "PENDING" in severities:
        return "Pending", "pending", issues
    if issues:
        return "Warning", "warning", issues
    if not destinations:
        return "Pending", "pending", issues
    return "Approved", "healthy", issues


def _category(attributes: dict) -> str:
    product_types = attributes.get("productTypes") or []
    if product_types:
        return str(product_types[0]).split(" > ")[0][:80]
    return str(attributes.get("googleProductCategory") or "Uncategorized").split(" > ")[0][:80]


def process_products(raw_products: list[dict]) -> tuple[list[dict], list[dict], dict]:
    products: list[dict] = []
    groups: dict[str, dict] = {}
    counts = Counter()
    countries = Counter()
    currencies = Counter()

    for raw in raw_products:
        attributes = raw.get("productAttributes") or {}
        status, severity, issues = _product_status(raw)
        counts[status] += 1
        price, currency = _price(attributes.get("price"))
        if currency:
            currencies[currency] += 1
        for destination in (raw.get("productStatus") or {}).get("destinationStatuses") or []:
            for country in (
                (destination.get("approvedCountries") or [])
                + (destination.get("pendingCountries") or [])
                + (destination.get("disapprovedCountries") or [])
            ):
                countries[country] += 1

        primary = issues[0] if issues else {}
        issue_title = primary.get("description") or primary.get("detail") or ("Under review" if status == "Pending" else "—")
        issue_code = str(primary.get("code") or issue_title)
        issue_group_id = _issue_id(issue_code) if issues else None
        issue_group_ids = [_issue_id(str(item.get("code") or item.get("description") or "unknown")) for item in issues]
        product = {
            "id": str(raw.get("offerId") or raw.get("name", "").rsplit("/", 1)[-1]),
            "name": attributes.get("title") or raw.get("offerId") or "Untitled product",
            "category": _category(attributes),
            "status": status,
            "issue": issue_title,
            "issueCode": issue_code if issues else None,
            "issueId": issue_group_id,
            "issueIds": issue_group_ids,
            "severity": severity,
            "price": price,
            "updated": _relative_time((raw.get("productStatus") or {}).get("lastUpdateDate")),
            "image": attributes.get("imageLink"),
            "link": attributes.get("link"),
            "brand": attributes.get("brand"),
        }
        products.append(product)

        for issue in issues:
            code = str(issue.get("code") or issue.get("description") or "unknown")
            key = code.lower()
            entry = groups.setdefault(
                key,
                {
                    "id": _issue_id(code),
                    "title": issue.get("description") or issue.get("detail") or code.replace("_", " ").title(),
                    "description": issue.get("detail") or issue.get("description") or "Google reported a product data issue.",
                    "affected_ids": set(),
                    "severity": "critical" if str(issue.get("severity", "")).upper() == "DISAPPROVED" else "warning",
                    "impact": "Disapproved" if str(issue.get("severity", "")).upper() == "DISAPPROVED" else "Limited visibility",
                    "category": issue.get("attribute") or issue.get("reportingContext") or "Product data",
                    "recommendation": _guidance(code, str(issue.get("description", ""))),
                    "documentationUri": issue.get("documentation"),
                },
            )
            entry["affected_ids"].add(product["id"])
            if str(issue.get("severity", "")).upper() == "DISAPPROVED":
                entry["severity"] = "critical"
                entry["impact"] = "Disapproved"

    priority_issues = []
    for entry in groups.values():
        affected = len(entry.pop("affected_ids"))
        priority_issues.append({**entry, "affected": affected})
    priority_issues.sort(key=lambda item: (item["severity"] != "critical", -item["affected"], item["title"]))
    meta = {
        "counts": counts,
        "target_country": countries.most_common(1)[0][0] if countries else "",
        "currency": currencies.most_common(1)[0][0] if currencies else "",
    }
    return products, priority_issues, meta


def process_account_issues(raw_issues: list[dict]) -> list[dict]:
    severity_map = {"CRITICAL": "critical", "ERROR": "warning", "SUGGESTION": "info"}
    result = []
    for index, issue in enumerate(raw_issues, 1):
        google_severity = str(issue.get("severity", "SEVERITY_UNSPECIFIED")).upper()
        destinations = [item.get("reportingContext") for item in issue.get("impactedDestinations", []) if item.get("reportingContext")]
        result.append(
            {
                "id": issue.get("name", "").rsplit("/", 1)[-1] or f"ACC-{index:03d}",
                "title": issue.get("title") or "Merchant Center account issue",
                "type": ", ".join(destinations) or "Account diagnostic",
                "severity": severity_map.get(google_severity, "warning"),
                "description": issue.get("detail") or "Google reported an account-level issue.",
                "action": "Open Google guidance" if issue.get("documentationUri") else "Review in Merchant Center",
                "href": issue.get("documentationUri"),
            }
        )
    return result


def product_approval_checks(priority_issues: list[dict]) -> list[dict]:
    def matching(*terms: str) -> list[dict]:
        return [item for item in priority_issues if any(term in f"{item['title']} {item['category']}".lower() for term in terms)]

    definitions = [
        (
            "identifiers",
            "GTIN / MPN / Brand",
            ("gtin", "mpn", "brand", "identifier"),
            "Correct identifiers let Google match offers to its product catalog.",
            ISSUE_GUIDANCE["gtin"],
        ),
        (
            "price-availability",
            "Price & availability mismatch",
            ("price", "availability"),
            "Shoppers must see the same price and stock state that Google received.",
            ISSUE_GUIDANCE["price"],
        ),
        (
            "product-pages",
            "Product page problems",
            ("landing", "mobile page", "page"),
            "Google must be able to validate the exact offer on its submitted landing page.",
            ISSUE_GUIDANCE["landing"],
        ),
        (
            "images",
            "Product image quality",
            ("image",),
            "Images must be crawlable and accurately represent the product without overlays.",
            ISSUE_GUIDANCE["image"],
        ),
    ]
    checks = []
    for check_id, title, terms, why, fix in definitions:
        issues = matching(*terms)
        affected = sum(item["affected"] for item in issues)
        critical = any(item["severity"] == "critical" for item in issues)
        checks.append(
            {
                "id": check_id,
                "title": title,
                "finding": f"{affected} affected products across {len(issues)} Google diagnostic types." if issues else "No matching Google diagnostics were found in this audit.",
                "status": "blocker" if critical else "risk" if issues else "passed",
                "priority": "High" if critical else "Medium" if issues else "Low",
                "why": why,
                "fix": fix if issues else "No immediate change is required; monitor this check after future feed updates.",
            }
        )
    return checks


def calculate_score(counts: Counter, account_issues: list[dict]) -> int:
    total = sum(counts.values())
    product_score = 0.0 if total == 0 else (
        counts["Approved"] + 0.55 * counts["Warning"] + 0.25 * counts["Pending"]
    ) / total * 100
    account_penalty = sum(12 if item["severity"] == "critical" else 4 if item["severity"] == "warning" else 1 for item in account_issues)
    return max(0, min(100, round(product_score - account_penalty)))


def grade(score: int) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Looking strong"
    if score >= 55:
        return "Needs attention"
    return "Critical"


def build_payload(
    account: MerchantAccount,
    raw_products: list[dict],
    raw_account_issues: list[dict],
    website_checks: list[dict],
    previous_payload: dict | None = None,
) -> dict:
    products, priority_issues, meta = process_products(raw_products)
    account_issues = process_account_issues(raw_account_issues)
    counts: Counter = meta["counts"]
    score = calculate_score(counts, account_issues)
    previous_summary = (previous_payload or {}).get("summary", {})
    previous_score = int(previous_summary.get("healthScore", score))
    previous_approved = int(previous_summary.get("approved", counts["Approved"]))
    previous_checked = int(previous_summary.get("productsChecked", len(products)))
    previous_action = int(previous_summary.get("critical", counts["Disapproved"])) + int(previous_summary.get("warnings", counts["Warning"]))
    current_action = counts["Disapproved"] + counts["Warning"]
    critical_account = next((item for item in account_issues if item["severity"] == "critical"), None)
    status = "needs_attention" if critical_account else "healthy"
    status_label = critical_account["title"] if critical_account else "Account in good standing"
    status_detail = (
        critical_account["description"]
        if critical_account
        else (account_issues[0]["description"] if account_issues else "Google reported no account-level issues in the latest audit.")
    )
    total_actions = current_action + len(account_issues)
    estimated_days = max(1, min(14, (total_actions + 49) // 50)) if total_actions else 0
    estimated = "No immediate fixes" if estimated_days == 0 else f"{estimated_days}–{min(14, estimated_days + 1)} days"
    target_code = meta["target_country"]
    approval_checks = website_checks + product_approval_checks(priority_issues)
    return {
        "account": {
            "id": f"MC-{account.merchant_id}",
            "name": account.name,
            "website": account.website_url or "",
            "country": COUNTRY_NAMES.get(target_code, target_code or "Not reported"),
            "targetMarket": COUNTRY_NAMES.get(target_code, target_code or "Not reported"),
            "currency": meta["currency"] or "Not reported",
            "status": status,
            "statusLabel": status_label,
            "statusDetail": status_detail,
            "connectedAt": account.connected_at.strftime("%b %d, %Y"),
            "lastAudit": "Just now",
        },
        "summary": {
            "healthScore": score,
            "previousScore": previous_score,
            "grade": grade(score),
            "productsChecked": len(products),
            "previousProductsChecked": previous_checked,
            "approved": counts["Approved"],
            "previousApproved": previous_approved,
            "warnings": counts["Warning"],
            "critical": counts["Disapproved"],
            "pending": counts["Pending"],
            "accountIssues": len(account_issues),
            "issuesResolved": max(0, previous_action - current_action),
            "estimatedFixTime": estimated,
        },
        "productDistribution": [
            {"name": "Approved", "value": counts["Approved"], "color": "#287a62"},
            {"name": "Warnings", "value": counts["Warning"], "color": "#d98b32"},
            {"name": "Critical", "value": counts["Disapproved"], "color": "#de624d"},
            {"name": "Pending", "value": counts["Pending"], "color": "#7a73c9"},
        ],
        "priorityIssues": priority_issues,
        "accountIssues": account_issues,
        "approvalChecks": approval_checks,
        "products": products,
    }


def run_audit_job(audit_id: str) -> None:
    db = SessionLocal()
    audit = db.get(Audit, audit_id)
    if audit is None:
        db.close()
        return
    try:
        audit.status = "running"
        audit.started_at = utcnow()
        _set_progress(db, audit, 5, "Connecting securely to Merchant Center")
        account = db.get(MerchantAccount, audit.merchant_account_id)
        if account is None:
            raise RuntimeError("Connected Merchant Center account no longer exists")
        client = GoogleClient()
        access_token = client.access_token(db, account.user_id)

        _set_progress(db, audit, 20, "Loading account and homepage details")
        homepage = client.get_homepage(access_token, account.merchant_id)
        if homepage.get("uri"):
            account.website_url = homepage["uri"]
            db.commit()

        _set_progress(db, audit, 35, "Loading the processed product catalog")
        raw_products = client.list_products(access_token, account.merchant_id)

        _set_progress(db, audit, 60, "Checking product and account diagnostics")
        raw_account_issues = client.list_account_issues(access_token, account.merchant_id)

        _set_progress(db, audit, 75, "Reviewing the connected website")
        website_checks = audit_website(account.website_url)

        _set_progress(db, audit, 90, "Calculating health score and priorities")
        previous = db.scalar(
            select(Audit)
            .where(
                Audit.merchant_account_id == account.id,
                Audit.status == "completed",
                Audit.id != audit.id,
            )
            .order_by(Audit.completed_at.desc())
        )
        payload = build_payload(account, raw_products, raw_account_issues, website_checks, previous.payload if previous else None)
        audit.payload = payload
        audit.health_score = payload["summary"]["healthScore"]
        audit.status = "completed"
        audit.progress = 100
        audit.progress_label = "Audit complete"
        audit.completed_at = utcnow()
        db.commit()
    except Exception as exc:  # job failures are persisted and returned by the status endpoint
        db.rollback()
        audit = db.get(Audit, audit_id)
        if audit:
            audit.status = "failed"
            audit.error_message = str(exc)[:2000]
            audit.progress_label = "Audit failed"
            audit.completed_at = utcnow()
            db.commit()
    finally:
        db.close()

