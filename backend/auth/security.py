import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models.user import User

# 비밀키 설정 (환경변수에서 가져옴)
SECRET_KEY = os.getenv("SECRET_KEY", "sweethome_secret_key_dev_only") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 현재 로그인한 사용자 가져오기 (라우터 보호용)
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await User.find_one(User.username == username)
    if user is None:
        raise credentials_exception
    return user


# admin 전용 가드 (사용자 관리 API용)
async def get_current_admin(current_user: User = Depends(get_current_user)):
    if getattr(current_user, "role", "member") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return current_user


# 본인(작성자) 또는 admin만 통과시키는 권한 검사 헬퍼
def assert_owner_or_admin(item, current_user: User):
    """item.created_by가 current_user와 같거나, current_user가 admin이면 통과."""
    owner_id = getattr(item, "created_by", None)
    role = getattr(current_user, "role", "member")
    if role == "admin":
        return
    if owner_id is not None and str(owner_id) == str(current_user.id):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="본인이 작성한 항목 또는 관리자만 수정/삭제할 수 있습니다.",
    )
