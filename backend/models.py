from beanie import Document
from pydantic import Field
from typing import Optional

# SQL의 'Base' 상속 대신, Beanie의 'Document'를 상속받습니다.
class Recipe(Document):
    chef: str
    name: str
    description: str
    difficulty: str
    image_url: Optional[str] = None

    class Settings:
        # MongoDB 컬렉션 이름 (SQL의 테이블 이름과 같음)
        name = "recipes"
        
    class Config:
        # 문서 예시 (Swagger UI에서 보임)
        json_schema_extra = {
            "example": {
                "chef": "husband",
                "name": "라면",
                "description": "맛있는 라면",
                "difficulty": "하",
                "image_url": ""
            }
        }
