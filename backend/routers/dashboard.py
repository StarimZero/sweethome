import asyncio
from datetime import date, datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends

from auth.security import get_current_user
from models.user import User

router = APIRouter(
    prefix="/api/couple",  # 주소도 couple로 변경
    tags=["Couple"]
)

@router.get("/home")
def get_couple_home():
    # 예시 데이터 (나중에는 DB에서 진짜 데이터를 가져옵니다)
    start_date = date(2022, 11, 10)
    wedding_day = date(2025, 10, 18)
    today = date.today()
    d_day = (today - start_date).days + 1
    w_day = (today - wedding_day).days + 1

    return {
        "couple_name": "호랭이연고부부",
        "d_day": d_day,
        "Wedding" : w_day
    }


# ---------------------------------------------------------------
# 홈 화면 아래 대시보드: 메뉴별 기록 수, DB 사용량
# ---------------------------------------------------------------

KST = timezone(timedelta(hours=9))
# MongoDB Atlas 무료(M0) 클러스터 저장 한도. 요금제를 바꾸면 이 값만 고치면 됨
DB_LIMIT_MB = 512

# (컬렉션, 화면 이름, 주소). 순서대로 홈에 보임
MENUS = [
    ("reviews", "맛집 리뷰", "/review"),
    ("liquor_reviews", "주류", "/liquor"),
    ("buypedia_records", "Buypedia", "/buypedia"),
    ("culture_reviews", "문화생활", "/culture"),
    ("recipes", "요리", "/cooking"),
    ("travels", "여행", "/travel"),
    ("diaries", "소곤소곤", "/diary"),
    ("calendar_events", "캘린더", "/calendar"),
    ("bucketlist", "버킷리스트", "/bucket"),
    ("knitting_records", "뜨개록", "/knitting"),
    ("family_members", "가계도", "/family"),
    ("buzzwords", "유행어", "/buzzword"),
]
# 기록은 아니지만 자리를 차지하는 것
SYSTEM = [
    ("ask_logs", "챗봇 질문 기록"),
    ("buzzword_audios", "유행어 녹음 파일"),
]


async def _coll_stats(db, name: str, month_oid: ObjectId) -> dict:
    """건수·이번 달 추가 수(_id 생성 시각 기준)·차지하는 크기(KB)."""
    col = db[name]
    count, this_month = await asyncio.gather(
        col.estimated_document_count(), col.count_documents({"_id": {"$gte": month_oid}}))
    size_kb = 0.0
    if count:
        try:
            s = await db.command("collStats", name)
            size_kb = round((s.get("storageSize", 0) + s.get("totalIndexSize", 0)) / 1024, 1)
        except Exception:
            pass
    return {"collection": name, "count": count, "this_month": this_month, "size_kb": size_kb}


@router.get("/stats")
async def get_home_stats(current_user: User = Depends(get_current_user)):
    db = User.get_pymongo_collection().database
    now = datetime.now(KST)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_oid = ObjectId.from_datetime(month_start.astimezone(timezone.utc))

    rows = await asyncio.gather(*[_coll_stats(db, c, month_oid) for c, _, _ in MENUS],
                                *[_coll_stats(db, c, month_oid) for c, _ in SYSTEM])
    menus = [{**r, "label": label, "path": path} for r, (_, label, path) in zip(rows, MENUS)]
    system = [{**r, "label": label} for r, (_, label) in zip(rows[len(MENUS):], SYSTEM)]

    # 클러스터 전체 사용량 (Atlas 한도는 클러스터 단위라 다른 DB 도 합산)
    used_bytes, by_db = 0, []
    try:
        for name in await db.client.list_database_names():
            if name in ("admin", "local", "config"):
                continue
            s = await db.client[name].command("dbStats")
            size = s.get("storageSize", 0) + s.get("indexSize", 0)
            used_bytes += size
            by_db.append({"name": name, "size_mb": round(size / 1048576, 2)})
    except Exception:
        s = await db.command("dbStats")
        used_bytes = s.get("storageSize", 0) + s.get("indexSize", 0)

    # 이번 달 챗봇 사용량 (두 사람 합)
    ask = await db["ask_logs"].aggregate([
        {"$match": {"created_at": {"$gte": month_start.astimezone(timezone.utc).replace(tzinfo=None)}}},
        {"$group": {"_id": None, "questions": {"$sum": 1}, "tokens": {"$sum": "$total_tokens"}}},
    ]).to_list(None)

    used_mb = round(used_bytes / 1048576, 1)
    return {
        "menus": menus,
        "system": system,
        "total_records": sum(m["count"] for m in menus),
        "added_this_month": sum(m["this_month"] for m in menus),
        "db": {"used_mb": used_mb, "limit_mb": DB_LIMIT_MB,
               "percent": round(used_mb / DB_LIMIT_MB * 100, 1), "by_db": by_db},
        "ask_this_month": {"questions": ask[0]["questions"] if ask else 0, "tokens": ask[0]["tokens"] if ask else 0},
        "month": now.strftime("%Y-%m"),
    }
