from beanie import Document, PydanticObjectId
from typing import Optional
from pydantic import Field

class Recipe(Document):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    chef: str               
    name: str               
    description: Optional[str] = None
    
    # [수정] 기존 데이터에 값이 없어도 에러가 안 나도록 Optional 처리
    cooking_type: Optional[str] = None  
    
    # 만약 기본값을 주고 싶다면 아래처럼 설정
    # cooking_type: str = "기타"

    image_url: Optional[str] = None 

    class Settings:
        name = "recipes"
        
    class Config:
        populate_by_name = True
        json_encoders = { PydanticObjectId: str }
