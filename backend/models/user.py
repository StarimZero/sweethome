from beanie import Document
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class User(Document):
    username: str                       # 로그인 ID (불변)
    password_hash: str
    nickname: str = ""                  # 화면 표시명 (비어있으면 username 사용)
    role: str = "member"                # admin / member
    is_active: bool = True
    created_at: datetime = datetime.now()

    class Settings:
        name = "users"


class UserLogin(BaseModel):
    username: str
    password: str
    remember: bool = False              # 로그인 상태 유지(체크 시 토큰 30일)


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict                          # { username, nickname, role }


class UserCreate(BaseModel):
    username: str
    password: str
    nickname: str = ""
    role: str = "member"


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordReset(BaseModel):
    new_password: str
