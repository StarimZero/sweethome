import re
from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth.security import get_current_user, assert_owner_or_admin
from models.buypedia import BuypediaRecord
from models.system.common_code import CommonCode
from routers.buypedia_items import PRICE_WEIGHTS, PRICE_NORMAL, price_priority, grams_per_piece
from models.user import User

router = APIRouter(prefix="/api/buypedia", tags=["Buypedia"])

REBUY_VALUES = {"YES", "SOSO", "NO"}


# ---------------------------------------------------------------
# 제품 묶기 / 순위 계산
# ---------------------------------------------------------------

def _norm(text: Optional[str]) -> str:
    """묶음 키용: 공백 제거 + 소문자. '황금 올리브' == '황금올리브'."""
    return re.sub(r"\s+", "", text or "").lower()


def product_key(category: str, brand: str, product_name: str) -> str:
    return f"{category}|{_norm(brand)}|{_norm(product_name)}"


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 2) if values else None


def _latest(records, field):
    """최신 기록부터 보며 처음으로 값이 있는 것."""
    for r in records:
        value = getattr(r, field)
        if value:
            return value
    return None


def _unit_price(record):
    """단가: g/ml 는 100g·100ml당, 개수는 개당. 계산할 수 없으면 None.
    품목에 '1개 ≈ N g' 환산이 있으면 개수로 산 것도 100g당으로 바꿈 (예: 양배추 1통 ≈ 1.5kg)."""
    if not record.price or not record.amount or not record.unit:
        return None
    if record.unit == "개":
        per = grams_per_piece(record.item_type or "", record.product_name)
        if per:
            value = record.price / (record.amount * per) * 100
            return (round(value, 1) if value < 100 else round(value)), "100g", True
    if record.unit in ("g", "ml"):
        value, basis = record.price / record.amount * 100, f"100{record.unit}"
    else:
        value, basis = record.price / record.amount, "개"
    # 100원 미만(생수 등)은 차이가 보이게 소수 한 자리까지
    return (round(value, 1) if value < 100 else round(value)), basis, False


def _is_blacklisted(rebuy_husband, rebuy_wife) -> bool:
    """의견을 낸 사람이 모두 '안 산다'면 블랙리스트."""
    opinions = [o for o in (rebuy_husband, rebuy_wife) if o]
    return bool(opinions) and all(o == "NO" for o in opinions)


# --- 종합 점수 (순위 기준). 숫자를 바꾸려면 여기만 고치면 된다 ---
# 2026-11-22 사용자가 같은 품목 A/B 비교 24개(1차 8 + 2차 16, 가격 포함)에 답한 순서를 모두 만족하도록 맞춘 값.
#   종합 = 별점(없으면 추정 별점) × 구매 배수 × 가격 배수 ÷ 최대 구매 배수  → 5점 만점
#   만족 범위: BUY_MULT_MAX 0.375~0.395 (7번·13번 답이 서로 당겨서 좁음)
#   가격을 얼마나 볼지는 품목마다 다름 (생수 같은 건 가격 우선, 과자 같은 건 가격 무관) → routers/buypedia_items.py
BUY_MULT_MAX = 0.385      # 구매 배수 = 1 + 0.385 × (1 − 1/구매횟수). 1번 ×1.00, 2번 ×1.19, 5번 ×1.31, 10번 ×1.35
UNRATED_CEIL = 4.0        # 추정 별점 = 4 − 1.25/구매횟수. 많이 살수록 4점에 가까워짐
UNRATED_GAP = 1.25        # 1번 산 평가 전 제품 = 2.75점으로 봄


def buy_multiplier(count: int) -> float:
    return round(1 + BUY_MULT_MAX * (1 - 1 / max(1, count)), 3)


def estimated_rating(count: int) -> float:
    return round(UNRATED_CEIL - UNRATED_GAP / max(1, count), 2)


def price_multiplier(price_ratio: Optional[float], priority: str = PRICE_NORMAL) -> float:
    """price_ratio = 품목 최저 단가 / 내 단가 (≤ 1). 단가를 모르면 영향 없음. priority = 품목의 가격 중요도."""
    if not price_ratio:
        return 1.0
    return round(price_ratio ** PRICE_WEIGHTS[priority], 3)


def total_score(avg: Optional[float], count: int, price_ratio: Optional[float] = None,
                priority: str = PRICE_NORMAL) -> float:
    """별점이 낮으면 많이 사도 소용없고(곱하기), 다시 샀다는 것 자체가 큰 신호(첫 재구매에서 크게 오름).
    같은 품목에서 더 싸면 올라가는 정도는 품목의 가격 중요도(우선/보통/무관)에 따라."""
    rating = avg if avg is not None else estimated_rating(count)
    mult = buy_multiplier(count) * price_multiplier(price_ratio, priority)
    return round(rating * mult / (1 + BUY_MULT_MAX), 2)


def apply_price_scores(products: List[dict], category_names: dict) -> None:
    """같은 품목(카테고리+품목) 안에서 단가를 비교해 종합 점수에 가격을 반영. 단가 기준(100g/100ml/개)이 다르면 비교 안 함."""
    for p in products:
        p["price_priority"] = price_priority(category_names.get(p["category"], ""), p.get("item_type") or "")
    groups = {}
    for p in products:
        if p.get("item_type"):
            groups.setdefault((p["category"], p["item_type"]), []).append(p)
    for items in groups.values():
        # 품목에서 가장 많이 쓰인 단가 기준만 비교. 기준이 다른 제품(무게를 모르는 반반팩 등)은 가격 비교에서 뺌
        bases = [p["unit_basis"] for p in items if p.get("unit_price")]
        basis = max(set(bases), key=bases.count) if bases else None
        same = [p["unit_price"] for p in items if p.get("unit_price") and p["unit_basis"] == basis]
        cheapest = min(same) if len(same) > 1 else None
        for p in items:
            comparable = cheapest and p.get("unit_price") and p["unit_basis"] == basis
            p["price_compared"] = bool(comparable)
            ratio = (cheapest / p["unit_price"]) if comparable else None
            p["price_mult"] = price_multiplier(ratio, p["price_priority"])
            p["score"] = total_score(p["avg"], p["count"], ratio, p["price_priority"])


def rank_sort_key(item: dict):
    """순위 정렬: 1) 종합 점수 높은 순  2) 구매 횟수 많은 순  3) 최근에 산 순"""
    return (-item["score"], -item["count"], -_date_num(item.get("last_date")))


def _date_num(text: Optional[str]) -> int:
    # "2026-11-15" → 20261115 (내림차순 정렬용)
    digits = re.sub(r"\D", "", text or "")
    return int(digits) if digits else 0


def _sort_records(records):
    """최신 기록이 앞에 오도록 (구매일 → 등록시각)."""
    return sorted(
        records,
        key=lambda r: (r.purchase_date or "", r.created_at or datetime.min),
        reverse=True,
    )


def summarize_product(records: List[BuypediaRecord]) -> dict:
    records = _sort_records(records)
    latest = records[0]
    avg_h = _avg(r.rating_husband for r in records)
    avg_w = _avg(r.rating_wife for r in records)
    rebuy_h = _latest(records, "rebuy_husband")
    rebuy_w = _latest(records, "rebuy_wife")
    image = next((r.image_urls[0] for r in records if r.image_urls), None)
    # 구매 횟수는 주문 단위: 한 주문에서 옵션 2개를 사도 1번
    count = len({r.coupang_order_id or str(r.id) for r in records})
    avg = _avg([avg_h, avg_w])  # 두 사람을 같은 비중으로
    # 단가는 가장 최근에 산 가격 기준 (지금 사면 얼마인지에 가까움)
    unit = next((u for u in (_unit_price(r) for r in records) if u), None)
    return {
        "key": product_key(latest.category, latest.brand, latest.product_name),
        "category": latest.category,
        "brand": latest.brand,
        "product_name": latest.product_name,
        "item_type": _latest(records, "item_type"),  # 품목: 같은 품목끼리만 비교
        "count": count,
        "avg_husband": avg_h,
        "avg_wife": avg_w,
        "avg": avg,
        "buy_mult": buy_multiplier(count),
        "est_rating": None if avg is not None else estimated_rating(count),
        "price_mult": 1.0,  # 품목 안 가격 비교 후 apply_price_scores 가 채움
        "score": total_score(avg, count),
        "rated": avg is not None,  # 별점이 하나도 없으면 '평가 전' (순위표에는 그대로 나옴)
        "rebuy_husband": rebuy_h,
        "rebuy_wife": rebuy_w,
        "blacklisted": _is_blacklisted(rebuy_h, rebuy_w),
        "last_date": latest.purchase_date or "",
        "last_price": _latest(records, "price"),
        "unit_price": unit[0] if unit else None,   # 예: 24
        "unit_basis": unit[1] if unit else None,   # 예: "100ml" → 100ml당 24원
        "unit_estimated": unit[2] if unit else False,  # 개수를 무게로 환산한 추정 단가
        "last_place": _latest(records, "purchase_place"),
        "purchase_type": _latest(records, "purchase_type"),
        "image_url": image,
    }


def summarize_brands(products: List[dict]) -> List[dict]:
    groups = {}
    for p in products:
        groups.setdefault((p["category"], _norm(p["brand"])), []).append(p)
    brands = []
    for items in groups.values():
        rated = [p for p in items if p["avg"] is not None]
        live = [p for p in items if not p["blacklisted"]] or items
        brands.append({
            "key": f"{items[0]['category']}|{_norm(items[0]['brand'])}",
            "category": items[0]["category"],
            "brand": items[0]["brand"],
            "product_count": len(items),
            "count": sum(p["count"] for p in items),
            "avg": _avg(p["avg"] for p in rated),
            "score": max(p["score"] for p in live),  # 브랜드 점수 = 그 브랜드 대표 제품의 종합 점수
            "rated": bool(rated),
            "blacklisted": all(p["blacklisted"] for p in items),
            "last_date": max(p["last_date"] for p in items),
            "best_product": min(live, key=rank_sort_key)["product_name"],
        })
    return sorted(brands, key=rank_sort_key)


def _group_by_product(records: List[BuypediaRecord]):
    groups = {}
    for r in records:
        groups.setdefault(product_key(r.category, r.brand, r.product_name), []).append(r)
    return groups


# ---------------------------------------------------------------
# 입력 정리
# ---------------------------------------------------------------

def _clean_text(text: Optional[str]) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _validate(data: dict):
    labels = {"brand": "브랜드", "product_name": "제품명", "category": "카테고리"}
    for field, label in labels.items():
        if field in data:
            data[field] = _clean_text(data[field])
            if not data[field]:
                raise HTTPException(status_code=400, detail=f"{label}을(를) 입력해 주세요.")
    if "item_type" in data:
        data["item_type"] = _clean_text(data["item_type"]) or None
    for field in ("purchase_place", "comment_husband", "comment_wife"):
        if field in data and data[field] is not None:
            data[field] = data[field].strip()
    for field in ("rating_husband", "rating_wife"):
        value = data.get(field)
        if value is not None and not (0 <= value <= 5):
            raise HTTPException(status_code=400, detail="별점은 0~5 사이여야 해요.")
    for field in ("rebuy_husband", "rebuy_wife"):
        if field in data and data[field] not in REBUY_VALUES:
            data[field] = None
    if "image_urls" in data:
        data["image_urls"] = [u.strip() for u in data["image_urls"] or [] if u and u.strip()]
    return data


# ---------------------------------------------------------------
# API
# ---------------------------------------------------------------

async def _category_names() -> dict:
    codes = await CommonCode.find(CommonCode.group_code == "BUYPEDIA_CAT").to_list()
    return {c.code_id: c.code_name for c in codes}


# 순위표: 제품별 / 브랜드별 집계 (전체 카테고리)
@router.get("/ranking")
async def get_ranking():
    records = await BuypediaRecord.find_all().to_list()
    products = [summarize_product(rs) for rs in _group_by_product(records).values()]
    apply_price_scores(products, await _category_names())
    products.sort(key=rank_sort_key)
    return {"products": products, "brands": summarize_brands(products)}


# 제품 상세: 그 제품의 요약 + 기록 목록(최신순)
@router.get("/product")
async def get_product(key: str):
    category = key.split("|", 1)[0]
    records = await BuypediaRecord.find(BuypediaRecord.category == category).to_list()
    groups = _group_by_product(records)
    if key not in groups:
        raise HTTPException(status_code=404, detail="Not found")
    # 가격 점수는 같은 품목의 다른 제품과 비교해야 해서 카테고리 전체를 요약한 뒤 고름
    products = {k: summarize_product(rs) for k, rs in groups.items()}
    apply_price_scores(list(products.values()), await _category_names())
    return {"product": products[key], "records": _sort_records(groups[key])}


# 평가 대기: 남편/아내 별점이 둘 다 비어 있는 기록 (쿠팡에서 가져와 아직 안 먹어본 것 등)
@router.get("/pending", response_model=List[BuypediaRecord])
async def get_pending():
    records = await BuypediaRecord.find({"rating_husband": None, "rating_wife": None}).to_list()
    return _sort_records(records)


# 기록 목록
@router.get("", response_model=List[BuypediaRecord])
async def get_records(category: Optional[str] = None):
    query = {"category": category} if category else {}
    return await BuypediaRecord.find(query).sort("-purchase_date", "-created_at").to_list()


# 등록
@router.post("", response_model=BuypediaRecord)
async def create_record(
    record: BuypediaRecord,
    current_user: User = Depends(get_current_user),
):
    data = _validate(record.model_dump(exclude={"id", "revision_id"}))
    doc = BuypediaRecord(**data)
    doc.created_by = current_user.id
    doc.created_at = doc.updated_at = datetime.now()
    await doc.insert()
    return doc


# 기록 상세
@router.get("/{id}", response_model=BuypediaRecord)
async def get_record(id: PydanticObjectId):
    record = await BuypediaRecord.get(id)
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    return record


# 수정
@router.put("/{id}", response_model=BuypediaRecord)
async def update_record(
    id: PydanticObjectId,
    record_data: BuypediaRecord,
    current_user: User = Depends(get_current_user),
):
    record = await BuypediaRecord.get(id)
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    assert_owner_or_admin(record, current_user)

    data = record_data.model_dump(exclude_unset=True, exclude={"id", "revision_id"})
    for field in ("created_by", "created_at"):
        data.pop(field, None)
    data = _validate(data)
    data["updated_at"] = datetime.now()
    await record.update({"$set": data})
    return await BuypediaRecord.get(id)


# 삭제
@router.delete("/{id}")
async def delete_record(
    id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    record = await BuypediaRecord.get(id)
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    assert_owner_or_admin(record, current_user)
    await record.delete()
    return {"message": "Deleted"}
