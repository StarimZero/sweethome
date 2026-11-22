"""
Buypedia 메뉴에서 사용하는 공통코드를 등록하는 시드 스크립트.

실행:
    cd backend
    .\\venv\\Scripts\\activate  (Windows) / source venv/bin/activate (Linux/Mac)
    python -m seeds.buypedia_codes          # 로컬 DB (.env 의 MONGODB_URL)
    python -m seeds.buypedia_codes --prod   # 운영 DB (MONGODB_URL_PROD)

특징:
  - 멱등성(idempotent): 이미 동일한 (group_code, code_id)가 있으면 건너뜀
  - 안전: 기존 데이터를 수정/삭제하지 않음
  - 카테고리는 화면(등록 페이지)에서 즉석으로 더 추가할 수 있음. 여기는 시작용 기본값.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from models.system.common_code import CommonCode


# (그룹코드, 그룹명, [(코드ID, 코드명), ...])
BUYPEDIA_CODE_GROUPS = [
    (
        "BUYPEDIA_CAT", "Buypedia 카테고리",
        [
            ("CHICKEN",  "치킨"),
            ("PIZZA",    "피자"),
            ("JOKBAL",   "족발/보쌈"),
            ("DUMPLING", "만두"),
            ("RAMEN",    "라면"),
            ("SNACK",    "과자"),
            ("FROZEN",   "냉동식품"),
        ],
    ),
    (
        "BUYPEDIA_BUY", "Buypedia 구매 방식",
        [
            ("DELIVERY", "배달"),
            ("MART",     "마트"),
            ("ONLINE",   "온라인"),
            ("ETC",      "기타"),
        ],
    ),
]


async def seed(prod: bool):
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    if prod:
        db_url = os.getenv("MONGODB_URL_PROD")
        if not db_url:
            sys.exit("backend/.env 에 MONGODB_URL_PROD 가 없어요.")
        db_name = os.getenv("DB_NAME_PROD") or os.getenv("DB_NAME", "sweethome")
    else:
        db_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        db_name = os.getenv("DB_NAME", "sweethome")

    client = AsyncIOMotorClient(db_url, serverSelectionTimeoutMS=10000)
    await init_beanie(database=client[db_name], document_models=[CommonCode])
    print(f"DB: {'운영' if prod else '로컬'} ({db_name})")

    inserted = 0
    skipped = 0

    for group_code, group_name, codes in BUYPEDIA_CODE_GROUPS:
        for sort_order, (code_id, code_name) in enumerate(codes, start=1):
            existing = await CommonCode.find_one(
                CommonCode.group_code == group_code,
                CommonCode.code_id == code_id,
            )
            if existing:
                skipped += 1
                continue

            await CommonCode(
                group_code=group_code,
                group_name=group_name,
                code_id=code_id,
                code_name=code_name,
                sort_order=sort_order,
                use_yn="Y",
            ).insert()
            inserted += 1
            print(f"  + [{group_code}] {code_id} = {code_name}")

    print()
    print(f"✅ 시드 완료: 신규 등록 {inserted}건, 기존 유지 {skipped}건")
    client.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--prod", action="store_true", help="운영 DB(MONGODB_URL_PROD)에 접속")
    asyncio.run(seed(ap.parse_args().prod))
