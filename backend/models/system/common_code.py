from beanie import Document, PydanticObjectId
from typing import Optional
from pydantic import Field

class CommonCode(Document):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    
    group_code: str      # 그룹 코드 (예: "FOOD_CATEGORY")
    group_name: str      # 그룹명 (예: "음식 카테고리")
    code_id: str         # 코드 ID (예: "KOREAN")
    code_name: str       # 코드명 (예: "한식")
    sort_order: int = 0  # 정렬 순서
    use_yn: str = "Y"    # 사용 여부 (Y/N)

    class Settings:
        name = "common_codes"  # MongoDB 컬렉션명
        
    class Config:
        populate_by_name = True
        json_encoders = { PydanticObjectId: str }
