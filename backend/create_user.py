import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from passlib.context import CryptContext
from models.user import User  # User 모델 경로 확인 필요
# 만약 에러나면: from backend.models.user import User

# [설정] DB 접속 정보 (본인 환경에 맞게 수정)
# 로컬 테스트 중이라면: mongodb://localhost:27017
DB_URL = "mongodb://localhost:27017"
DB_NAME = "sweethome"

# 암호화 설정 (백엔드 코드와 동일하게)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    # 1. DB 연결
    client = AsyncIOMotorClient(DB_URL)
    # [중요] 초기화할 때 User 모델 하나만 있어도 됨 (유저 생성용이니까)
    await init_beanie(database=client[DB_NAME], document_models=[User])

    # 2. 생성할 계정 정보
    target_username = "holango"
    target_password = "1130"

    # 3. 기존에 있으면 삭제 (확실하게 하기 위해)
    old_user = await User.find_one(User.username == target_username)
    if old_user:
        print(f"이미 존재하는 유저({target_username})를 삭제합니다...")
        await old_user.delete()

    # 4. 새 유저 생성 (비밀번호 해싱)
    hashed_pw = pwd_context.hash(target_password)
    new_user = User(username=target_username, password_hash=hashed_pw)
    
    await new_user.insert()
    print("--------------------------------------------------")
    print(f"✅ 유저 생성 완료!")
    print(f"아이디: {target_username}")
    print(f"비밀번호: {target_password}")
    print(f"DB에 저장된 해시: {hashed_pw}")
    print("--------------------------------------------------")

if __name__ == "__main__":
    # 윈도우 환경 등에서 이벤트 루프 에러 방지용
    try:
        asyncio.run(create_admin())
    except Exception as e:
        print(f"에러 발생: {e}")
