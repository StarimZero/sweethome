"""
뜨개록(Knitting) 메뉴에서 사용하는 공통코드를 등록하는 시드 스크립트.

실행:
    cd backend
    .\venv\Scripts\activate  (Windows) / source venv/bin/activate (Linux/Mac)
    python -m seeds.knitting_codes

특징:
  - 멱등성(idempotent): 이미 동일한 (group_code, code_id)가 있으면 건너뜀
  - 안전: 기존 데이터를 수정/삭제하지 않음
"""

import asyncio
import os
import sys
from pathlib import Path

# backend 디렉토리를 import path에 추가 (모듈로 실행 안 했을 때 대비)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from models.system.common_code import CommonCode


# (그룹코드, 그룹명, [(코드ID, 코드명), ...])
KNITTING_CODE_GROUPS = [
    (
        "KNITTING_CATEGORY", "뜨개 카테고리",
        [
            ("SWEATER",   "스웨터"),
            ("CARDIGAN",  "가디건"),
            ("MUFFLER",   "머플러/숄"),
            ("HAT",       "모자"),
            ("GLOVES",    "장갑/벙어리"),
            ("SOCKS",     "양말"),
            ("BAG",       "가방"),
            ("DOLL",      "인형/소품"),
            ("BLANKET",   "담요"),
            ("ETC",       "기타"),
        ],
    ),
    (
        "KNITTING_STATUS", "뜨개 진행 상태",
        [
            ("WAIT", "대기"),
            ("CO",   "CO (시작)"),
            ("WIP",  "WIP (진행중)"),
            ("FO",   "FO (완성)"),
        ],
    ),
    (
        "KNITTING_TECHNIQUE", "뜨개 기법",
        [
            ("STOCKINETTE", "메리야스"),
            ("PURL",        "안뜨기"),
            ("CABLE",       "케이블"),
            ("FAIR_ISLE",   "페어아일"),
            ("INTARSIA",    "인타르시아"),
            ("BRIOCHE",     "브리오시"),
            ("LACE",        "레이스"),
            ("SHORT_ROW",   "숏로우"),
            ("MAGIC_LOOP",  "매직루프"),
            ("STEEK",       "스틱"),
        ],
    ),
    (
        "KNITTING_PURPOSE", "뜨개 용도",
        [
            ("GIFT",    "선물"),
            ("MINE",    "나의 사용"),
            ("SELL",    "판매"),
            ("DISPLAY", "전시"),
            ("ETC",     "기타"),
        ],
    ),
    (
        "KNITTING_WEAR_FREQ", "착용/사용 빈도",
        [
            ("RARELY",     "거의 안 입음"),
            ("SOMETIMES",  "가끔 입음"),
            ("OFTEN",      "자주 입음"),
            ("VERY_OFTEN", "매우 자주 입음"),
        ],
    ),
    (
        "YARN_UNIT", "실 수량 단위",
        [
            ("BALL",   "볼"),
            ("GRAM",   "g"),
            ("METER",  "m"),
            ("SKEIN",  "타래"),
            ("HANK",   "카세"),
        ],
    ),
    (
        "CURRENCY", "통화 단위",
        [
            ("KRW", "KRW (원)"),
            ("USD", "USD ($)"),
            ("EUR", "EUR (€)"),
            ("JPY", "JPY (¥)"),
            ("GBP", "GBP (£)"),
        ],
    ),
]


async def seed():
    load_dotenv()
    db_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "sweethome")

    client = AsyncIOMotorClient(db_url)
    await init_beanie(database=client[db_name], document_models=[CommonCode])

    inserted = 0
    skipped = 0

    for group_code, group_name, codes in KNITTING_CODE_GROUPS:
        for sort_order, (code_id, code_name) in enumerate(codes, start=1):
            existing = await CommonCode.find_one(
                CommonCode.group_code == group_code,
                CommonCode.code_id == code_id,
            )
            if existing:
                skipped += 1
                continue

            doc = CommonCode(
                group_code=group_code,
                group_name=group_name,
                code_id=code_id,
                code_name=code_name,
                sort_order=sort_order,
                use_yn="Y",
            )
            await doc.insert()
            inserted += 1
            print(f"  + [{group_code}] {code_id} = {code_name}")

    print()
    print(f"✅ 시드 완료: 신규 등록 {inserted}건, 기존 유지 {skipped}건")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
