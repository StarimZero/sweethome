from beanie import Document
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

# 1. AI 정보 서브 모델 (DB에 내장됨)
class AINote(BaseModel):
    status: str = "PENDING"  # PENDING / COMPLETED / FAILED
    description: str = ""
    taste: str = ""
    aroma: str = ""
    variety: str = ""
    pairing: str = ""

# 2. 메인 문서 모델
class LiquorReview(Document):
    name: str                           # 주류명
    category: str                       # 종류 (코드값 or 텍스트)
    purchase_place: Optional[str] = ""  # 구매처
    price: Optional[int] = 0            # 가격
    visit_date: Optional[str] = ""      # 구매/시음 날짜

    # 다중 데이터 (리스트)
    pairing_foods: List[str] = []       # 함께한 음식
    image_urls: List[str] = []          # 이미지 URL들

    # 평가 데이터
    rating_husband: Optional[float] = 0.0
    rating_wife: Optional[float] = 0.0
    comment_husband: Optional[str] = ""
    comment_wife: Optional[str] = ""
    
    # [추가] 통합 평점 (정렬용, 저장 시 계산)
    rating: float = 0.0 

    # [추가] AI 분석 노트 (기본값: 대기 상태)
    ai_note: AINote = AINote()

    # 구버전 호환용 (사용 안 함)
    image_url: Optional[str] = None       
    pairing_food: Optional[str] = None

    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "liquor_reviews"
