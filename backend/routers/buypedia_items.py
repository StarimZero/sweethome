"""Buypedia 품목별 설정: 가격을 순위에 얼마나 반영할지.

2026-11-22 사용자 기준:
  - 생수처럼 맛 차이가 크지 않은 것 → 가격이 싼 게 위 (가격 우선)
  - 과자처럼 특색 있는 것 → 가격 무관
  - 그 사이 → 보통 (가격은 살짝만)
카테고리 기본값을 두고, 품목 단위로 예외를 둔다. 카테고리/품목 이름이 바뀌면 여기도 맞출 것.
"""

PRICE_FIRST, PRICE_NORMAL, PRICE_IGNORE = "우선", "보통", "무관"

# 가격 배수 = (품목 최저 단가 / 내 단가) ^ 가중
PRICE_WEIGHTS = {
    PRICE_FIRST: 2.0,   # 17% 비싸면 ×0.69 — 싼 게 확실히 위 (2차 17·20·21번 답)
    PRICE_NORMAL: 0.2,  # 17% 비싸면 ×0.97 — 거의 별점·구매로 정해짐
    PRICE_IGNORE: 0.0,  # 가격 영향 없음 (2차 18·19·22번 답)
}

CATEGORY_PRICE = {
    "채소": PRICE_FIRST, "달걀": PRICE_FIRST, "쌀": PRICE_FIRST, "생활용품": PRICE_FIRST,
    "과자": PRICE_IGNORE, "라면": PRICE_IGNORE, "만두": PRICE_IGNORE, "어묵": PRICE_IGNORE,
    "빵/떡": PRICE_IGNORE, "차/커피": PRICE_IGNORE, "음료": PRICE_IGNORE, "돈까스": PRICE_IGNORE,
    "치킨": PRICE_IGNORE, "피자": PRICE_IGNORE, "족발/보쌈": PRICE_IGNORE,
}

ITEM_PRICE = {
    "생수": PRICE_FIRST, "식용유": PRICE_FIRST, "냉동옥수수": PRICE_FIRST, "설탕": PRICE_FIRST,
    "잠봉": PRICE_IGNORE, "조미료": PRICE_IGNORE, "숙취해소제": PRICE_IGNORE, "헤어에센스": PRICE_IGNORE,
}


def price_priority(category_name: str, item_type: str) -> str:
    return ITEM_PRICE.get(item_type) or CATEGORY_PRICE.get(category_name) or PRICE_NORMAL


# --- 단가 환산: 개수로 산 걸 무게로 바꿔 같은 품목끼리 단가 비교 (2026-11-22 사용자 승인한 추정치) ---
# 품목 기본값 (1개당 g)
GRAMS_PER_PIECE = {
    "양배추": 1500,   # 1통 ≈ 1.5kg
    "당근": 200,      # 1개 ≈ 200g
    "무": 1500,       # 1개 ≈ 1.5kg
}
# 제품명에 이 말이 있으면 품목 기본값 대신 (1개당 g)
GRAMS_PER_PIECE_BY_NAME = {
    "절단무": 500,    # 절단무 2입 ≈ 1kg
}


def grams_per_piece(item_type: str, product_name: str):
    for word, grams in GRAMS_PER_PIECE_BY_NAME.items():
        if word in (product_name or ""):
            return grams
    return GRAMS_PER_PIECE.get(item_type)
