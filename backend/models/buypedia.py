from beanie import Document, PydanticObjectId
from typing import Optional, List
from datetime import datetime


# Buypedia: 구매한 제품(마트/배달/온라인)의 평점 기록.
# 기록 1건 = 한 번 사 먹은 것. 같은 제품을 또 사면 기록이 쌓이고,
# 순위표는 (카테고리 + 브랜드 + 제품명)이 같은 기록끼리 묶어서 계산한다.
class BuypediaRecord(Document):
    category: str                          # 카테고리 코드 (BUYPEDIA_CAT)
    brand: str                             # 브랜드 (예: 비비고, BBQ)
    product_name: str                      # 제품명 (예: 왕교자, 황금올리브)
    item_type: Optional[str] = None        # 품목 (예: 만두, 생수, 대파). 서로 대신할 수 있는 것끼리 같은 품목 → 순위는 품목 안에서
    purchase_type: Optional[str] = None    # 구매 방식 코드 (BUYPEDIA_BUY: 배달/마트/온라인)
    purchase_date: Optional[str] = ""      # 구매일 (YYYY-MM-DD)
    purchase_place: Optional[str] = ""     # 구매처. 배달은 지점명 (예: BBQ 강남점)
    price: Optional[int] = None            # 가격 (원)
    amount: Optional[float] = None         # 용량 숫자 (예: 1400)
    unit: Optional[str] = None             # 용량 단위: g / ml / 개

    # 별점: None = 그 사람은 안 먹음 (0점과 구분)
    rating_husband: Optional[float] = None
    rating_wife: Optional[float] = None
    comment_husband: Optional[str] = ""
    comment_wife: Optional[str] = ""

    # 재구매 의사 (사람별): YES(또 산다) / SOSO(보통) / NO(안 산다) / None(미입력)
    rebuy_husband: Optional[str] = None
    rebuy_wife: Optional[str] = None

    image_urls: List[str] = []

    # 쿠팡에서 가져온 기록 (중복 방지 + 같은 상품 알아보기)
    coupang_order_id: Optional[str] = None        # 주문번호
    coupang_product_id: Optional[str] = None      # 상품번호 (같은 상품 재구매 판별)
    coupang_vendor_item_id: Optional[str] = None  # 옵션 번호 (주문번호와 함께 중복 키)
    coupang_name: Optional[str] = None            # 쿠팡 원래 상품명 (옵션 포함)

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    created_by: Optional[PydanticObjectId] = None  # 작성자 user_id

    class Settings:
        name = "buypedia_records"


# 쿠팡 가져오기에서 "다시 안 보기"한 상품 (휴지, 운동화 등 평가 대상이 아닌 것)
class BuypediaIgnore(Document):
    coupang_product_id: str
    name: str = ""
    created_at: datetime = datetime.now()

    class Settings:
        name = "buypedia_ignores"
