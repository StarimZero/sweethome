"""
산 제품 기록을 DB(buypedia_records)에 바로 넣는 스크립트. 화면 입력 없이 JSON 파일로 등록.

실행:
    cd backend
    .\\venv\\Scripts\\activate
    python -m seeds.add_buypedia 파일.json --prod --dry-run  # 운영 DB, 저장 없이 확인만
    python -m seeds.add_buypedia 파일.json --prod            # 운영 DB(배포 사이트)에 등록
    python -m seeds.add_buypedia --prod --recent 5           # 최근 등록 5건 보기
    python -m seeds.add_buypedia --prod --categories         # 카테고리/구매방식 코드 보기

DB 선택: 기본은 .env 의 MONGODB_URL(로컬 연습용).
  --prod 를 붙이면 MONGODB_URL_PROD 사용 (DB 이름은 DB_NAME_PROD, 없으면 DB_NAME)

JSON 형식: 객체 1개 또는 객체 배열. 필드는 models/buypedia.py 의 BuypediaRecord 와 같음.
  - category 는 코드값(code_id) 또는 코드명(예: "만두") 둘 다 가능.
    없는 카테고리면 --new-category 를 붙였을 때만 새로 만듦 (오타로 카테고리가 늘어나는 것 방지)
  - purchase_type 은 코드값 또는 "배달"/"마트"/"온라인"
  - 별점을 안 넣으면(null) 그 사람은 안 먹은 것으로 처리
  - rebuy_husband / rebuy_wife: "YES" / "SOSO" / "NO" (또는 "또 산다"/"보통"/"안 산다")
  - 같은 브랜드 + 제품명 + 구매일이 이미 있으면 건너뜀 (중복 방지)
    쿠팡 주문(coupang_order_id 있음)은 주문번호 + 옵션번호로 중복 판단
  - 별점을 둘 다 비우면 '평가 대기'로 들어감 (쿠팡 가져오기는 보통 이렇게 넣음)
  - coupang_fetch.py --out 결과 항목에 category/brand/product_name 만 채워서 그대로 넣어도 됨
  - item_type(품목)을 안 넣으면 seeds/buypedia_item_types.py 규칙으로 붙임. 규칙에 없으면 직접 넣을 것
  - 작성자: --user 아이디 (기본 younghun91)
"""

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from models.buypedia import BuypediaRecord
from models.system.common_code import CommonCode
from models.user import User
from seeds.buypedia_item_types import item_type_of

CATEGORY_GROUP = "BUYPEDIA_CAT"
CATEGORY_GROUP_NAME = "Buypedia 카테고리"
BUY_GROUP = "BUYPEDIA_BUY"
DEFAULT_USER = "younghun91"
REBUY_ALIASES = {"또 산다": "YES", "또산다": "YES", "보통": "SOSO", "안 산다": "NO", "안산다": "NO"}


def db_target(prod):
    if prod:
        url = os.getenv("MONGODB_URL_PROD")
        if not url:
            sys.exit("backend/.env 에 MONGODB_URL_PROD 가 없어요. Render 의 MONGODB_URL 값을 넣어 주세요.")
        db_name = os.getenv("DB_NAME_PROD") or os.getenv("DB_NAME", "sweethome")
    else:
        url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        db_name = os.getenv("DB_NAME", "sweethome")
    host = url.split("://", 1)[-1].split("@")[-1].split("/")[0].split("?")[0]
    return url, db_name, host


def norm(text):
    return re.sub(r"\s+", "", text or "").lower()


async def codes_of(group):
    return await CommonCode.find({"group_code": group, "use_yn": "Y"}).sort("sort_order").to_list()


def resolve_code(value, codes):
    if not value:
        return None
    for c in codes:
        if value in (c.code_id, c.code_name) or norm(value) == norm(c.code_name):
            return c.code_id
    return None


async def add_category(name, codes):
    order = max((c.sort_order for c in codes), default=0) + 1
    code = CommonCode(
        group_code=CATEGORY_GROUP, group_name=CATEGORY_GROUP_NAME,
        code_id=f"BPC_{datetime.now():%y%m%d%H%M%S%f}"[:22], code_name=name.strip(),
        sort_order=order, use_yn="Y",
    )
    await code.insert()
    codes.append(code)
    print(f"  + 새 카테고리: {code.code_name} ({code.code_id})")
    return code.code_id


async def print_recent(n, codes):
    names = {c.code_id: c.code_name for c in codes}
    total = await BuypediaRecord.find_all().count()
    print(f"전체 {total}건, 최근 등록 {n}건:")
    for d in await BuypediaRecord.find_all().sort("-created_at").limit(n).to_list():
        print(f"- {d.created_at:%Y-%m-%d %H:%M} | {names.get(d.category, d.category)} | {d.brand} {d.product_name}"
              f" | 구매 {d.purchase_date} | 평점 {d.rating_husband}/{d.rating_wife}")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?")
    ap.add_argument("--categories", action="store_true")
    ap.add_argument("--new-category", action="store_true", help="없는 카테고리는 새로 만들기")
    ap.add_argument("--user", default=DEFAULT_USER)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--prod", action="store_true", help="운영 DB(MONGODB_URL_PROD)에 접속")
    ap.add_argument("--recent", type=int, metavar="N", help="최근 등록 N건 보기")
    args = ap.parse_args()

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    url, db_name, host = db_target(args.prod)
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=10000)
    await init_beanie(database=client[db_name], document_models=[BuypediaRecord, CommonCode, User])
    print(f"DB: {'운영' if args.prod else '로컬'} ({host} / {db_name})")

    cat_codes = await codes_of(CATEGORY_GROUP)
    buy_codes = await codes_of(BUY_GROUP)
    if args.recent:
        await print_recent(args.recent, cat_codes)
        return
    if args.categories or not args.file:
        for c in cat_codes + buy_codes:
            print(f"  [{c.group_code}] {c.code_id:<22} {c.code_name}")
        return

    owner = await User.find_one(User.username == args.user)
    if not owner:
        sys.exit(f"작성자 계정 '{args.user}' 을 못 찾았어요. --user 아이디 로 지정해 주세요.")

    items = json.loads(Path(args.file).read_text(encoding="utf-8"))
    if isinstance(items, dict):
        items = [items]

    for item in items:
        label_name = f"{item.get('brand', '')} {item.get('product_name', '')}".strip()
        if not item.get("brand") or not item.get("product_name"):
            print(f"✗ '{label_name}': brand / product_name 은 꼭 있어야 해요.")
            continue

        cat = resolve_code(item.get("category", ""), cat_codes)
        if not cat:
            if args.new_category and item.get("category") and not args.dry_run:
                cat = await add_category(item["category"], cat_codes)
            elif args.new_category and item.get("category"):
                print(f"(dry-run) 새 카테고리 '{item['category']}' 를 만들 예정")
                cat = "(새 카테고리)"
            else:
                print(f"✗ '{label_name}': 카테고리 '{item.get('category')}' 없음. --categories 로 확인하거나 --new-category")
                continue
        item["category"] = cat
        if not item.get("item_type"):  # 품목이 없으면 규칙으로 붙임
            cat_name = next((c.code_name for c in cat_codes if c.code_id == cat), "")
            item["item_type"] = item_type_of(cat_name, item["brand"], item["product_name"])

        if item.get("purchase_type"):
            item["purchase_type"] = resolve_code(item["purchase_type"], buy_codes)
        for field in ("rebuy_husband", "rebuy_wife"):
            if item.get(field):
                item[field] = REBUY_ALIASES.get(item[field], item[field])
                if item[field] not in ("YES", "SOSO", "NO"):
                    item[field] = None

        # coupang_fetch.py 결과를 그대로 넘겨도 되게: image_url → image_urls, 쓰지 않는 키 제거
        if item.get("image_url") and not item.get("image_urls"):
            item["image_urls"] = [item["image_url"]]
        for extra in ("image_url", "known", "canceled", "quantity", "product_name_raw"):
            item.pop(extra, None)

        if item.get("coupang_order_id"):
            # 쿠팡 주문은 주문번호 + 옵션번호로 중복 판단 (같은 날 같은 상품을 두 번 주문해도 구분)
            exists = await BuypediaRecord.find_one({
                "coupang_order_id": item["coupang_order_id"],
                "coupang_vendor_item_id": item.get("coupang_vendor_item_id"),
            })
        else:
            dup = await BuypediaRecord.find({"purchase_date": item.get("purchase_date", "")}).to_list()
            exists = any(norm(d.brand) == norm(item["brand"]) and norm(d.product_name) == norm(item["product_name"]) for d in dup)
        if exists:
            print(f"- 이미 있음, 건너뜀: {label_name} ({item.get('purchase_date')})")
            continue

        label = f"{label_name} / {cat} / {item.get('purchase_date', '')}"
        if args.dry_run:
            print(f"(dry-run) {label} / 작성자 {owner.username}")
            continue

        doc = BuypediaRecord(**item)
        doc.created_by = owner.id
        # 운영 서버(Render)는 UTC 로 저장하므로 같은 기준에 맞춤
        now = datetime.now(timezone.utc).replace(tzinfo=None) if args.prod else datetime.now()
        doc.created_at = doc.updated_at = now
        await doc.insert()
        print(f"✓ 등록: {label} (id={doc.id})")


if __name__ == "__main__":
    asyncio.run(main())
