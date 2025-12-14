# backend/models/cooking.py
from beanie import Document, PydanticObjectId
from typing import Optional
from pydantic import Field

class Recipe(Document):
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    chef: str               
    name: str               
    description: Optional[str] = None
    difficulty: str         
    image_url: Optional[str] = None 

    class Settings:
        name = "recipes"
        
    class Config:
        populate_by_name = True
        json_encoders = { PydanticObjectId: str }
