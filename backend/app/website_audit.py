from __future__ import annotations

import ipaddress
import json
import re
import socket
from collections import deque
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup

from .config import get_settings


USER_AGENT = "MerchantAudit/1.0 (+website compliance audit requested by account owner)"
POLICY_TERMS = {
    "refund": ("refund", "return"),
    "shipping": ("shipping", "delivery"),
    "terms": ("terms", "conditions"),
    "privacy": ("privacy",),
}
RISKY_CLAIMS = re.compile(
    r"\b(guaranteed results?|100% guaranteed|miracle|cure[- ]?all|risk[- ]?free|best in the world|instant cure)\b",
    re.IGNORECASE,
)
PHONE_RE = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)


@dataclass
class CrawledPage:
    url: str
    status_code: int
    title: str
    text: str
    soup: BeautifulSoup
    json_ld: list[dict]


def _public_host(url: str) -> bool:
    hostname = urlparse(url).hostname
    if not hostname:
        return False
    try:
        addresses = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for result in addresses:
        address = ipaddress.ip_address(result[4][0])
        if address.is_private or address.is_loopback or address.is_link_local or address.is_reserved or address.is_multicast:
            return False
    return True


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", "", parsed.query, ""))


def _json_ld(soup: BeautifulSoup) -> list[dict]:
    values: list[dict] = []
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            decoded = json.loads(tag.string or tag.get_text())
        except (TypeError, json.JSONDecodeError):
            continue
        candidates = decoded if isinstance(decoded, list) else [decoded]
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            graph = candidate.get("@graph")
            if isinstance(graph, list):
                values.extend(item for item in graph if isinstance(item, dict))
            values.append(candidate)
    return values


def crawl_store(start_url: str) -> tuple[list[CrawledPage], list[str]]:
    settings = get_settings()
    if urlparse(start_url).scheme not in {"http", "https"} or not _public_host(start_url):
        raise ValueError("Store URL is not a publicly reachable HTTP(S) address")

    start_url = _normalize_url(start_url)
    start = urlparse(start_url)
    robots = RobotFileParser()

    queue: deque[str] = deque([start_url])
    seen: set[str] = set()
    pages: list[CrawledPage] = []
    broken: list[str] = []
    candidate_links: list[str] = []
    timeout = httpx.Timeout(settings.request_timeout_seconds)

    with httpx.Client(
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
    ) as client:
        try:
            robots_response = client.get(urljoin(start_url, "/robots.txt"))
            if robots_response.is_success:
                robots.parse(robots_response.text.splitlines())
            else:
                robots = None
        except httpx.HTTPError:
            robots = None
        while queue and len(pages) < settings.website_audit_max_pages:
            url = queue.popleft()
            if url in seen:
                continue
            seen.add(url)
            if robots and not robots.can_fetch(USER_AGENT, url):
                broken.append(f"Blocked by robots.txt: {url}")
                continue
            try:
                response = client.get(url)
            except httpx.HTTPError:
                broken.append(url)
                continue
            content_type = response.headers.get("content-type", "")
            if response.status_code >= 400:
                broken.append(url)
                continue
            if "text/html" not in content_type:
                continue
            soup = BeautifulSoup(response.text, "html.parser")
            for element in soup(["script", "style", "noscript", "svg"]):
                if element.name != "script" or element.get("type") != "application/ld+json":
                    element.extract()
            page = CrawledPage(
                url=str(response.url),
                status_code=response.status_code,
                title=(soup.title.string.strip() if soup.title and soup.title.string else ""),
                text=" ".join(soup.get_text(" ", strip=True).split()),
                soup=soup,
                json_ld=_json_ld(soup),
            )
            pages.append(page)

            for anchor in soup.select("a[href]"):
                href = anchor.get("href", "").strip()
                if href.startswith(("mailto:", "tel:", "javascript:", "#")):
                    continue
                linked = _normalize_url(urljoin(str(response.url), href))
                parsed = urlparse(linked)
                if parsed.scheme not in {"http", "https"} or parsed.netloc != start.netloc:
                    continue
                text = f"{anchor.get_text(' ', strip=True)} {parsed.path}".lower()
                priority = any(term in text for values in POLICY_TERMS.values() for term in values)
                priority = priority or any(term in text for term in ("contact", "about", "product", "shop"))
                if priority:
                    queue.appendleft(linked)
                else:
                    candidate_links.append(linked)

            while candidate_links and len(queue) < settings.website_audit_max_pages * 2:
                queue.append(candidate_links.pop(0))

    return pages, broken


def _check(
    check_id: str,
    title: str,
    finding: str,
    status: str,
    priority: str,
    why: str,
    fix: str,
) -> dict:
    return {
        "id": check_id,
        "title": title,
        "finding": finding,
        "status": status,
        "priority": priority,
        "why": why,
        "fix": fix,
    }


def audit_website(website_url: str | None) -> list[dict]:
    if not website_url:
        return [
            _check(
                "website-unavailable",
                "Website connection",
                "No homepage URL is configured in Merchant Center.",
                "blocker",
                "Critical",
                "Google needs a verified store URL to validate products and the purchase experience.",
                "Add, verify, and claim the store homepage in Merchant Center, then run the audit again.",
            )
        ]

    try:
        pages, broken = crawl_store(website_url)
    except (ValueError, httpx.HTTPError) as exc:
        return [
            _check(
                "crawlability",
                "Crawlability",
                f"The live website scan could not start: {exc}",
                "blocker",
                "Critical",
                "If the store cannot be reached safely, Google may also be unable to validate submitted offers.",
                "Confirm the homepage is public, uses HTTPS, and does not block automated access, then rerun the audit.",
            )
        ]

    if not pages:
        return [
            _check(
                "crawlability",
                "Crawlability",
                "No public HTML page could be read from the configured store URL.",
                "blocker",
                "Critical",
                "Google must be able to crawl the store and landing pages to approve offers.",
                "Remove login walls, bot blocks, and unintended robots restrictions from public store pages.",
            )
        ]

    all_text = " ".join(page.text for page in pages)
    all_links = [
        (anchor.get_text(" ", strip=True) + " " + anchor.get("href", "")).lower()
        for page in pages
        for anchor in page.soup.select("a[href]")
    ]
    policy_hits = {
        policy: any(any(term in link for term in terms) for link in all_links)
        for policy, terms in POLICY_TERMS.items()
    }
    email_found = bool(EMAIL_RE.search(all_text))
    phone_found = bool(PHONE_RE.search(all_text))
    organization_found = any(
        str(item.get("@type", "")).lower() in {"organization", "localbusiness", "onlinestore"}
        for page in pages
        for item in page.json_ld
    )
    product_nodes = [
        item
        for page in pages
        for item in page.json_ld
        if "product" in str(item.get("@type", "")).lower()
    ]
    offers_complete = sum(
        1
        for item in product_nodes
        if item.get("name") and item.get("image") and isinstance(item.get("offers"), (dict, list))
    )
    risky_matches = sorted(set(match.group(0) for match in RISKY_CLAIMS.finditer(all_text)))

    checks = [
        _check(
            "trust-signals",
            "Misrepresentation / trust signals",
            "Business identity signals were found across the scanned pages." if organization_found else "No clear Organization or LocalBusiness identity markup was found.",
            "passed" if organization_found else "risk",
            "Low" if organization_found else "Medium",
            "Consistent business identity helps Google and shoppers verify who operates the store.",
            "Keep the legal business name and address consistent in the footer, contact page, checkout, policies, and Merchant Center." if organization_found else "Publish the legal business identity and add valid Organization structured data that matches Merchant Center.",
        ),
        _check(
            "business-information",
            "Business information",
            f"Public contact scan found {'email' if email_found else 'no email'} and {'phone' if phone_found else 'no phone'}.",
            "passed" if email_found and phone_found else "blocker",
            "Low" if email_found and phone_found else "Critical",
            "Google and customers need a clear way to identify and contact the merchant.",
            "Publish a monitored support email, phone number, legal name, address, and support hours on an accessible contact page.",
        ),
        _check(
            "policies",
            "Refund / Shipping / Terms / Privacy",
            f"Detected {sum(policy_hits.values())} of 4 expected policy links: " + ", ".join(name for name, found in policy_hits.items() if found),
            "passed" if all(policy_hits.values()) else "blocker",
            "Low" if all(policy_hits.values()) else "Critical",
            "Visible and consistent customer policies are required to verify the purchase and post-purchase experience.",
            "Add dedicated, footer-linked refund, shipping, terms, and privacy pages with concrete timeframes, costs, and exclusions.",
        ),
        _check(
            "structured-data",
            "Product structured data",
            f"Found {len(product_nodes)} Product JSON-LD records; {offers_complete} include a name, image, and Offer.",
            "passed" if product_nodes and offers_complete == len(product_nodes) else "blocker",
            "Low" if product_nodes and offers_complete == len(product_nodes) else "High",
            "Complete Product and Offer markup helps Google verify visible price, currency, and availability.",
            "Add valid Product and Offer JSON-LD to every landing-page template and keep it identical to the visible page and feed.",
        ),
        _check(
            "broken-urls",
            "Broken / product URLs",
            "No broken internal pages were encountered in the sampled crawl." if not broken else f"The sampled crawl found {len(broken)} blocked or failing internal URLs.",
            "passed" if not broken else "blocker",
            "Low" if not broken else "High",
            "Unavailable or blocked landing pages cannot be validated or approved.",
            "Return stable 200 responses for canonical product and policy URLs and remove unintended robots or bot restrictions.",
        ),
        _check(
            "risky-content",
            "Risky wording / content",
            "No high-risk guarantee or cure wording was detected in the sampled pages." if not risky_matches else f"Potentially risky claims detected: {', '.join(risky_matches[:5])}.",
            "passed" if not risky_matches else "risk",
            "Low" if not risky_matches else "Medium",
            "Unsupported guarantees, health claims, or misleading superlatives can create policy and trust concerns.",
            "Replace unverifiable claims with specific, evidence-based wording and show relevant conditions beside each claim.",
        ),
    ]
    return checks

