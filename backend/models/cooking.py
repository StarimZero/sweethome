from beanie import Document
from typing import Optional

class Recipe(Document):
    chef: str               # 요리사 (husband/wife)
    name: str               # 요리 이름
    description: str        # 설명 (이게 빠져 있었음!)
    difficulty: str         # 난이도 (상/중/하)
    image_url: Optional[str] = None # 이미지 주소 (선택 사항)

    class Settings:
        name = "recipes"    # MongoDB 컬렉션 이름
        
    class Config:
        # 문서 예시 (Swagger 등에서 보임)
        json_schema_extra = {
            "example": {
                "chef": "husband",
                "name": "김치볶음밥",
                "description": "맛있는 김치볶음밥",
                "difficulty": "하",
                "image_url": "https://..."
            }
        }
