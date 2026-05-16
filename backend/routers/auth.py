from fastapi import APIRouter, Depends, HTTPException, status
from models.user import User, UserLogin, Token
from auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await User.find_one(User.username == user_data.username)
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="비활성화된 계정입니다.")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": getattr(user, "role", "member")},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "nickname": getattr(user, "nickname", "") or user.username,
            "role": getattr(user, "role", "member"),
        },
    }


# 현재 로그인 사용자 정보 (새로고침 시 프론트에서 호출)
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "nickname": getattr(current_user, "nickname", "") or current_user.username,
        "role": getattr(current_user, "role", "member"),
    }
