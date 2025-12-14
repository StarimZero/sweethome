from fastapi import APIRouter, HTTPException, status
from models.user import User, UserLogin, Token
from auth.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# 1. 회원가입 (최초 1회 관리자 생성용, 이후 주석 처리 권장)
@router.post("/signup", response_model=User)
async def signup(user_data: UserLogin):
    user_exists = await User.find_one(User.username == user_data.username)
    if user_exists:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user_data.password)
    new_user = User(username=user_data.username, password_hash=hashed_password)
    await new_user.insert()
    return new_user

# 2. 로그인
@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await User.find_one(User.username == user_data.username)
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
