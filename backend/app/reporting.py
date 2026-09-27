from __future__ import annotations

import base64
import csv
import io
from xml.sax.saxutils import escape

import httpx
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .config import get_settings


def products_csv(payload: dict) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["Product ID", "Name", "Status", "Issue", "Severity", "Category", "Price", "Updated", "Product URL"])
    for product in payload.get("products", []):
        writer.writerow(
            [
                product.get("id", ""),
                product.get("name", ""),
                product.get("status", ""),
                product.get("issue", ""),
                product.get("severity", ""),
                product.get("category", ""),
                product.get("price", ""),
                product.get("updated", ""),
                product.get("link", ""),
            ]
        )
    return ("\ufeff" + output.getvalue()).encode("utf-8")


def audit_pdf(payload: dict) -> bytes:
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"MerchantAudit - {payload['account']['name']}",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=colors.HexColor("#1f2b21"), spaceAfter=8))
    styles.add(ParagraphStyle(name="CenteredScore", parent=styles["Heading1"], alignment=TA_CENTER, fontSize=32, textColor=colors.HexColor("#287a62"), spaceAfter=4))
    styles.add(ParagraphStyle(name="Muted", parent=styles["BodyText"], fontSize=8, textColor=colors.HexColor("#647067"), leading=11))
    styles.add(ParagraphStyle(name="Issue", parent=styles["BodyText"], fontSize=9, leading=12, spaceAfter=4))

    account = payload["account"]
    summary = payload["summary"]
    story = [
        Paragraph("MerchantAudit", styles["ReportTitle"]),
        Paragraph(f"Live Google Merchant Center audit for <b>{escape(account['name'])}</b>", styles["Heading2"]),
        Paragraph(f"Merchant ID {escape(account['id'].replace('MC-', ''))} · {escape(account.get('website') or 'No website reported')} · {escape(account.get('targetMarket', ''))}", styles["Muted"]),
        Spacer(1, 8 * mm),
        Paragraph(str(summary["healthScore"]), styles["CenteredScore"]),
        Paragraph(f"<para align='center'><b>{escape(summary['grade'])}</b> · GMC health score out of 100</para>", styles["BodyText"]),
        Spacer(1, 6 * mm),
    ]

    metrics = [
        ["Products checked", "Approved", "Warnings", "Disapproved", "Pending"],
        [
            f"{summary['productsChecked']:,}",
            f"{summary['approved']:,}",
            f"{summary['warnings']:,}",
            f"{summary['critical']:,}",
            f"{summary['pending']:,}",
        ],
    ]
    table = Table(metrics, colWidths=[33 * mm] * 5)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf1e8")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#647067")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7),
        ("FONTSIZE", (0, 1), (-1, 1), 13),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d9dfd4")),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([table, Spacer(1, 8 * mm), Paragraph("Priority product issues", styles["Heading2"])])

    issues = payload.get("priorityIssues", [])
    if issues:
        for index, issue in enumerate(issues[:20], 1):
            story.append(Paragraph(f"<b>{index}. {escape(issue['title'])}</b> — {issue['affected']} affected · {escape(issue['impact'])}", styles["Issue"]))
            story.append(Paragraph(escape(issue.get("recommendation", "")), styles["Muted"]))
            story.append(Spacer(1, 2 * mm))
    else:
        story.append(Paragraph("Google reported no product-level issues in this audit.", styles["BodyText"]))

    story.extend([Spacer(1, 5 * mm), Paragraph("Account diagnostics", styles["Heading2"])])
    account_issues = payload.get("accountIssues", [])
    if account_issues:
        for issue in account_issues:
            story.append(Paragraph(f"<b>{escape(issue['title'])}</b> — {escape(issue['description'])}", styles["Issue"]))
    else:
        story.append(Paragraph("Google reported no account-level issues in this audit.", styles["BodyText"]))

    story.extend([PageBreak(), Paragraph("Approval-readiness checks", styles["Heading1"])])
    for check in payload.get("approvalChecks", []):
        status = "PASSED" if check["status"] == "passed" else check["priority"].upper()
        story.append(Paragraph(f"<b>{escape(check['title'])}</b> · {escape(status)}", styles["Heading3"]))
        story.append(Paragraph(escape(check["finding"]), styles["BodyText"]))
        story.append(Paragraph(f"<b>Next action:</b> {escape(check['fix'])}", styles["Muted"]))
        story.append(Spacer(1, 3 * mm))

    story.extend([Spacer(1, 8 * mm), Paragraph("This report is generated from read-only Google Merchant API data and a sampled public website crawl. Re-run the audit after material feed or website changes.", styles["Muted"])])
    document.build(story)
    return output.getvalue()


def send_resend_email(to_email: str, subject: str, html: str, attachment: bytes | None = None) -> str:
    settings = get_settings()
    if not settings.resend_api_key:
        raise RuntimeError("RESEND_API_KEY is not configured")
    body: dict = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if attachment is not None:
        body["attachments"] = [
            {
                "filename": "merchant-audit-report.pdf",
                "content": base64.b64encode(attachment).decode("ascii"),
            }
        ]
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json=body,
        timeout=settings.request_timeout_seconds,
    )
    if response.is_error:
        try:
            detail = response.json().get("message")
        except ValueError:
            detail = response.reason_phrase
        raise RuntimeError(f"Resend delivery failed: {detail}")
    return str(response.json().get("id", ""))

