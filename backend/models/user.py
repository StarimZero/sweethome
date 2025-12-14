from beanie import Document
from pydantic import BaseModel
from typing import Optional

class User(Document):
    username: str
    password_hash: str
    
    class Settings:
        name = "users"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
