from types import SimpleNamespace

from app.audit_service import build_payload, process_products


def product(offer_id: str, issue: dict | None = None) -> dict:
    return {
        "offerId": offer_id,
        "feedLabel": "US",
        "productAttributes": {
            "title": f"Product {offer_id}",
            "link": f"https://shop.example/products/{offer_id}",
            "productTypes": ["Apparel > Shirts"],
            "price": {"amountMicros": "19990000", "currencyCode": "USD"},
        },
        "productStatus": {
            "lastUpdateDate": "2026-09-27T00:00:00Z",
            "destinationStatuses": [{"reportingContext": "SHOPPING_ADS", "approvedCountries": ["US"]}],
            "itemLevelIssues": [issue] if issue else [],
        },
    }


def account() -> SimpleNamespace:
    return SimpleNamespace(
        merchant_id="123456",
        name="Example Store",
        website_url="https://shop.example",
        connected_at=__import__("datetime").datetime(2026, 9, 27),
    )


def test_product_issue_is_live_and_grouped() -> None:
    issue = {
        "code": "invalid_gtin",
        "severity": "DISAPPROVED",
        "description": "Invalid GTIN",
        "detail": "The submitted GTIN is invalid.",
        "attribute": "gtins",
    }
    products, groups, meta = process_products([product("A", issue), product("B", issue), product("C")])
    assert [item["status"] for item in products] == ["Disapproved", "Disapproved", "Approved"]
    assert groups[0]["affected"] == 2
    assert groups[0]["recommendation"].startswith("Submit the manufacturer-assigned GTIN")
    assert meta["currency"] == "USD"


def test_payload_counts_and_score_use_google_results() -> None:
    warning = {"code": "missing_brand", "severity": "DEMOTED", "description": "Missing brand", "attribute": "brand"}
    disapproved = {"code": "price_mismatch", "severity": "DISAPPROVED", "description": "Price mismatch", "attribute": "price"}
    payload = build_payload(
        account(),
        [product("A"), product("B", warning), product("C", disapproved)],
        [],
        [],
    )
    assert payload["summary"]["productsChecked"] == 3
    assert payload["summary"]["approved"] == 1
    assert payload["summary"]["warnings"] == 1
    assert payload["summary"]["critical"] == 1
    assert 0 <= payload["summary"]["healthScore"] <= 100

