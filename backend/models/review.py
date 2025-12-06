from beanie import Document, PydanticObjectId
from typing import Optional
from pydantic import Field
from typing import List

class Review(Document):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    
    restaurant_name: str    # 식당 이름
    location: str           # 위치 (예: 강남, 홍대)
    husband_rating: float = 0.0  # 남편 별점
    wife_rating: float = 0.0     # 아내 별점           
    husbandcomment: str            # 한줄 평 or 리뷰 내용
    wifecomment: str
    visit_date: Optional[str] = None # 방문 날짜 (YYYY-MM-DD)
    naver_url: Optional[str] = None
    image_urls: List[str] = []
    category: Optional[str] = None
    

    class Settings:
        name = "reviews"    # MongoDB 컬렉션 이름
        
    class Config:
        populate_by_name = True
        json_encoders = { PydanticObjectId: str }
