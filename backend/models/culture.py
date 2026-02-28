from beanie import Document
from typing import Optional, List
from datetime import datetime


class CultureReview(Document):
    title: str                              # 제목 (영화명, 공연명 등)
    category: str                           # 카테고리 (CULTURE 그룹 코드값)
    visit_date: Optional[str] = ""          # 관람일 (YYYY-MM-DD)
    location: Optional[str] = ""            # 장소 (극장, 갤러리 등)

    # 평가 데이터
    rating_husband: Optional[float] = 0.0
    rating_wife: Optional[float] = 0.0
    rating: float = 0.0                     # 통합 평점 (저장 시 계산)
    comment_husband: Optional[str] = ""
    comment_wife: Optional[str] = ""

    # 이미지
    image_urls: List[str] = []

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "culture_reviews"
