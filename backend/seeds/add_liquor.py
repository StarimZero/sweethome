"""
마신 술을 DB(liquor_reviews)에 바로 넣는 스크립트. 화면 입력 없이 JSON 파일로 등록.

실행:
    cd backend
    .\\venv\\Scripts\\activate
    python -m seeds.add_liquor 파일.json --prod --dry-run  # 운영 DB, 저장 없이 확인만
    python -m seeds.add_liquor 파일.json --prod            # 운영 DB(배포 사이트)에 등록
    python -m seeds.add_liquor --prod --recent 5           # 최근 등록 5건 보기
    python -m seeds.add_liquor --prod --categories         # 주류 종류/와인 나라 코드 보기

DB 선택: 기본은 .env 의 MONGODB_URL(로컬 연습용).
  --prod 를 붙이면 MONGODB_URL_PROD 사용 (DB 이름은 DB_NAME_PROD, 없으면 DB_NAME)

JSON 형식: 객체 1개 또는 객체 배열. 필드는 models/liquor.py 의 LiquorReview 와 같음.
  - category 는 코드값(code_id) 또는 코드명(예: "사케") 둘 다 가능 → SUL 그룹 코드값으로 변환
  - 와인(SUL_W)이면 wine_type 은 나라 이름(예: "이탈리아") 또는 코드값 → WINE_C 코드값으로 변환
    (WINE_C 는 레드/화이트가 아니라 나라 코드. 화면과 같음)
  - ai_note 를 채워두면 Gemini 호출 없이 바로 COMPLETED 로 저장
  - rating 은 남편/아내 평점 평균으로 자동 계산
  - 같은 이름 + 같은 visit_date 가 이미 있으면 건너뜀 (중복 방지)
  - 작성자: --user 아이디 (기본 younghun91)
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from models.liquor import LiquorReview, AINote
from models.system.common_code import CommonCode
from models.user import User

# 등록 화면(LiquorInsertPage)과 같은 코드 그룹
CATEGORY_GROUP = "SUL"
WINE_GROUP = "WINE_C"
WINE_CATEGORY = "SUL_W"
DEFAULT_USER = "younghun91"


def db_target(prod):
    """접속 주소와 DB 이름. 주소는 비밀번호가 있으니 출력용으로 host 만 따로 돌려줌."""
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


async def codes_of(group):
    return await CommonCode.find({"group_code": group, "use_yn": "Y"}).to_list()


async def print_recent(n, codes):
    names = {c.code_id: c.code_name for c in codes}
    users = {u.id: u.username for u in await User.find_all().to_list()}
    total = await LiquorReview.find_all().count()
    print(f"전체 {total}건, 최근 등록 {n}건:")
    for d in await LiquorReview.find_all().sort("-created_at").limit(n).to_list():
        print(f"- {d.created_at:%Y-%m-%d %H:%M} | {d.name} | {names.get(d.category, d.category)}"
              f"{'/' + names.get(d.wine_type, d.wine_type) if d.wine_type else ''}"
              f" | 마신 날 {d.visit_date} | 평점 {d.rating_husband}/{d.rating_wife} | {users.get(d.created_by, '-')}")


def resolve_category(value, codes):
    if not value:
        return None
    for c in codes:
        if value in (c.code_id, c.code_name):
            return c.code_id
    for c in codes:  # 부분 일치 (예: "사케" → "사케/청주")
        if value in c.code_name:
            return c.code_id
    return None


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?")
    ap.add_argument("--categories", action="store_true")
    ap.add_argument("--user", default=DEFAULT_USER)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--prod", action="store_true", help="운영 DB(MONGODB_URL_PROD)에 접속")
    ap.add_argument("--recent", type=int, metavar="N", help="최근 등록 N건 보기")
    args = ap.parse_args()

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    url, db_name, host = db_target(args.prod)
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=10000)
    await init_beanie(database=client[db_name], document_models=[LiquorReview, CommonCode, User])
    print(f"DB: {'운영' if args.prod else '로컬'} ({host} / {db_name})")

    codes = await codes_of(CATEGORY_GROUP)
    wine_codes = await codes_of(WINE_GROUP)
    if args.recent:
        await print_recent(args.recent, codes + wine_codes)
        return
    if args.categories or not args.file:
        for c in sorted(codes + wine_codes, key=lambda c: (c.group_code, c.sort_order)):
            print(f"  [{c.group_code}] {c.code_id:<15} {c.code_name}")
        return

    owner = await User.find_one(User.username == args.user)
    if not owner:
        sys.exit(f"작성자 계정 '{args.user}' 을 못 찾았어요. --user 아이디 로 지정해 주세요.")

    items = json.loads(Path(args.file).read_text(encoding="utf-8"))
    if isinstance(items, dict):
        items = [items]

    for item in items:
        cat = resolve_category(item.get("category", ""), codes)
        if not cat:
            print(f"✗ '{item.get('name')}': 종류 '{item.get('category')}' 코드를 못 찾음. --categories 로 확인")
            continue
        item["category"] = cat

        if cat == WINE_CATEGORY and item.get("wine_type"):
            wine = resolve_category(item["wine_type"], wine_codes)
            if not wine:
                print(f"✗ '{item.get('name')}': 와인 나라 '{item['wine_type']}' 코드를 못 찾음. --categories 로 확인")
                continue
            item["wine_type"] = wine
        elif cat != WINE_CATEGORY:
            item["wine_type"] = None  # 화면과 동일: 와인이 아니면 비움

        if await LiquorReview.find_one({"name": item["name"], "visit_date": item.get("visit_date", "")}):
            print(f"- 이미 있음, 건너뜀: {item['name']} ({item.get('visit_date')})")
            continue

        doc = LiquorReview(**item)
        scores = [s for s in (doc.rating_husband, doc.rating_wife) if s]
        doc.rating = round(sum(scores) / len(scores), 1) if scores else 0.0
        if doc.ai_note.description:
            doc.ai_note.status = "COMPLETED"
        doc.created_by = owner.id
        # 운영 서버(Render)는 UTC 로 저장하므로 같은 기준에 맞춤
        now = datetime.now(timezone.utc).replace(tzinfo=None) if args.prod else datetime.now()
        doc.created_at = doc.updated_at = now

        label = f"{doc.name} / {cat}{'/' + doc.wine_type if doc.wine_type else ''} / {doc.visit_date}"
        if args.dry_run:
            print(f"(dry-run) {label} / 작성자 {owner.username}")
        else:
            await doc.insert()
            print(f"✓ 등록: {label} (id={doc.id})")


if __name__ == "__main__":
    asyncio.run(main())
