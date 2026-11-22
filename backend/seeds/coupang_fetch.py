"""
쿠팡 주문목록에서 아직 Buypedia 에 안 넣은 주문 상품을 뽑아오는 스크립트 (읽기만 함).

준비:
  1) 쿠팡 전용 Chrome 을 디버그 포트로 띄우고 쿠팡에 로그인해 둠
     "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9225 --user-data-dir=C:\\Users\\Yeong\\.coupang-chrome
  2) 도구용 패키지: pip install -r requirements-tools.txt  (서버 배포에는 필요 없음)

실행:
    cd backend
    python -m seeds.coupang_fetch --prod                 # 운영 DB 기준으로 새 상품 뽑기 (최근 2페이지 = 주문 10건)
    python -m seeds.coupang_fetch --prod --pages 5       # 더 과거까지
    python -m seeds.coupang_fetch --prod --year 2026 --pages 999   # 2026년 주문 전부
    python -m seeds.coupang_fetch --prod --out new.json  # 결과를 JSON 으로 저장
    python -m seeds.coupang_fetch --prod --ignore 6731245116 8375526424   # 다시 안 보기 (상품번호)

결과의 각 항목:
  coupang_order_id / coupang_product_id / coupang_vendor_item_id / coupang_name
  purchase_date, price(개당 할인가), quantity, image_url
  known: 같은 쿠팡 상품을 예전에 넣은 적 있으면 그때의 category/brand/product_name/amount/unit
→ 분류해서 add_buypedia.py 로 등록 (별점 없이 넣으면 '평가 대기')

이미 넣은 주문(주문번호+옵션번호), 취소된 상품, 다시 안 보기한 상품은 빠짐.
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from models.buypedia import BuypediaRecord, BuypediaIgnore

ORDER_LIST_URL = "https://mc.coupang.com/ssr/desktop/order/list"
KST = timezone(timedelta(hours=9))


def db_target(prod):
    if prod:
        url = os.getenv("MONGODB_URL_PROD")
        if not url:
            sys.exit("backend/.env 에 MONGODB_URL_PROD 가 없어요.")
        db_name = os.getenv("DB_NAME_PROD") or os.getenv("DB_NAME", "sweethome")
    else:
        url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        db_name = os.getenv("DB_NAME", "sweethome")
    return url, db_name


def bigger_image(url):
    # 주문목록 썸네일(120px) → 상품 이미지 크기(492px). 같은 이미지의 다른 크기
    return url.replace("/120x120ex/", "/492x492ex/") if url else None


def read_orders(port, pages, year=None):
    """Chrome(디버그 포트)에 붙어서 주문목록 페이지들의 내장 JSON 을 읽음."""
    from playwright.sync_api import sync_playwright

    items = []
    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
        except Exception:
            sys.exit(f"Chrome(포트 {port})에 연결하지 못했어요. 쿠팡 전용 Chrome 을 먼저 띄워 주세요.")
        page = browser.contexts[0].new_page()
        try:
            for index in range(pages):
                if index:
                    page.wait_for_timeout(1200)  # 사람이 넘기는 속도로 천천히
                query = f"requestYear={year}&pageIndex={index}" if year else f"pageIndex={index}"
                page.goto(f"{ORDER_LIST_URL}?{query}", wait_until="domcontentloaded")
                if "login.coupang.com" in page.url:
                    sys.exit("쿠팡 로그인이 풀렸어요. 9225 Chrome 에서 다시 로그인해 주세요.")
                raw = page.evaluate("() => document.getElementById('__NEXT_DATA__')?.textContent")
                if not raw:
                    sys.exit("주문목록 데이터를 찾지 못했어요. 쿠팡 화면 구조가 바뀌었을 수 있어요.")
                order_domain = json.loads(raw)["props"]["pageProps"]["domains"]["desktopOrder"]
                for order in order_domain.get("orderList", []):
                    ordered = datetime.fromtimestamp(order["orderedAt"] / 1000, KST)
                    for group in order.get("deliveryGroupList", []):
                        for prod in group.get("productList", []):
                            items.append({
                                "coupang_order_id": str(order["orderId"]),
                                "coupang_product_id": str(prod["productId"]),
                                "coupang_vendor_item_id": str(prod["vendorItemId"]),
                                "coupang_name": prod.get("vendorItemName") or prod.get("productName"),
                                "product_name_raw": prod.get("productName"),
                                "purchase_date": ordered.strftime("%Y-%m-%d"),
                                "price": prod.get("discountedUnitPrice") or prod.get("unitPrice"),
                                "quantity": prod.get("quantity", 1),
                                "image_url": bigger_image(prod.get("imagePath")),
                                "canceled": bool(prod.get("allCanceled")),
                            })
                print(f"  {index + 1}페이지 읽음 (누적 상품 {len(items)}개)", flush=True)
                if not order_domain.get("orderPagination", {}).get("hasNext"):
                    break
        finally:
            page.close()
            browser.close()  # CDP 연결만 끊음. Chrome 창은 그대로
    return items


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9225)
    ap.add_argument("--pages", type=int, default=2, help="읽을 주문목록 페이지 수 (1페이지 = 주문 5건)")
    ap.add_argument("--year", type=int, help="이 연도 주문만 (예: 2026). 없으면 최근 6개월")
    ap.add_argument("--prod", action="store_true", help="운영 DB 기준으로 중복 확인")
    ap.add_argument("--out", help="새 상품 목록을 저장할 JSON 파일")
    ap.add_argument("--ignore", nargs="+", metavar="상품번호", help="다시 안 보기 등록")
    args = ap.parse_args()

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    url, db_name = db_target(args.prod)
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=10000)
    await init_beanie(database=client[db_name], document_models=[BuypediaRecord, BuypediaIgnore])
    print(f"DB: {'운영' if args.prod else '로컬'} ({db_name})")

    if args.ignore:
        for pid in args.ignore:
            if await BuypediaIgnore.find_one(BuypediaIgnore.coupang_product_id == pid):
                print(f"- 이미 다시 안 보기: {pid}")
                continue
            await BuypediaIgnore(coupang_product_id=pid, created_at=datetime.now()).insert()
            print(f"✓ 다시 안 보기: {pid}")
        return

    items = await asyncio.to_thread(read_orders, args.port, args.pages, args.year)
    if args.year:
        items = [it for it in items if it["purchase_date"].startswith(str(args.year))]

    imported = {(r.coupang_order_id, r.coupang_vendor_item_id)
                for r in await BuypediaRecord.find(BuypediaRecord.coupang_order_id != None).to_list()}  # noqa: E711
    ignored = {i.coupang_product_id for i in await BuypediaIgnore.find_all().to_list()}

    # 예전에 넣은 같은 쿠팡 상품 → 그때 정한 분류를 재사용
    known = {}
    for r in await BuypediaRecord.find(BuypediaRecord.coupang_product_id != None).sort("-created_at").to_list():  # noqa: E711
        known.setdefault(r.coupang_product_id, {
            "category": r.category, "brand": r.brand, "product_name": r.product_name,
            "amount": r.amount, "unit": r.unit,
        })

    new_items, skipped = [], {"이미 넣음": 0, "취소": 0, "다시 안 보기": 0}
    seen = set()
    for it in items:
        key = (it["coupang_order_id"], it["coupang_vendor_item_id"])
        if key in seen:
            continue
        seen.add(key)
        if key in imported:
            skipped["이미 넣음"] += 1
        elif it["canceled"]:
            skipped["취소"] += 1
        elif it["coupang_product_id"] in ignored:
            skipped["다시 안 보기"] += 1
        else:
            if it["coupang_product_id"] in known:
                it["known"] = known[it["coupang_product_id"]]
            new_items.append(it)

    print(f"읽은 상품 {len(seen)}개 → 새 상품 {len(new_items)}개 "
          f"(건너뜀: {', '.join(f'{k} {v}' for k, v in skipped.items() if v) or '없음'})")
    for it in new_items:
        mark = " [예전에 산 상품]" if "known" in it else ""
        print(f"  {it['purchase_date']} | {it['coupang_product_id']} | {it['coupang_name']} | "
              f"{it['price']:,}원 x{it['quantity']}{mark}")

    if args.out:
        Path(args.out).write_text(json.dumps(new_items, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"저장: {args.out}")


if __name__ == "__main__":
    asyncio.run(main())
