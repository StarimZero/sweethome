from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
# from dotenv import load_dotenv # Render에는 .env 파일이 없으므로 주석 처리하거나 에러 안 나게 둠

# 모델을 가져옵니다 (models/__init__.py에 __all_models__ 정의되어 있다고 가정)
# 만약 에러 나면 직접 import 하세요: from models.cooking import Recipe ...
from models import __all_models__

# load_dotenv() # 로컬에서만 필요

async def init_db():
    # 1. 환경변수에서 주소 가져오기 (기본값: 로컬)
    # Render 환경변수 설정할 때 이름을 'MONGODB_URL'로 할 것이므로 맞춤
    db_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    
    # DB 이름도 환경변수 없으면 'sweethome_db' 자동 사용
    db_name = os.getenv("DB_NAME", "sweethome")

    # 2. 클라이언트 생성
    client = AsyncIOMotorClient(db_url)
    
    # 3. Beanie 초기화
    await init_beanie(database=client[db_name], document_models=__all_models__)
