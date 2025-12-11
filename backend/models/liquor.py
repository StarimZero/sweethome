from beanie import Document
from typing import Optional, List
from datetime import datetime

class LiquorReview(Document):
    name: str                              # 주류명
    category: str                          # 종류
    
    purchase_place: Optional[str] = ""     # 구매처
    
    # ★ 음식 목록 (여러 개)
    pairing_foods: List[str] = []          
    
    # ★ 이미지 목록 (여러 개)
    image_urls: List[str] = []             
    
    rating_husband: Optional[float] = 0.0
    rating_wife: Optional[float] = 0.0
    comment_husband: Optional[str] = ""
    comment_wife: Optional[str] = ""
    visit_date: Optional[str] = ""
    price: Optional[int] = 0
    
    # 구버전 호환용
    image_url: Optional[str] = None       

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "liquor_reviews"
