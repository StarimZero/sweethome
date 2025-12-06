from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
from dotenv import load_dotenv
# 모델을 가져옵니다
from models import __all_models__

load_dotenv()

async def init_db():
    # 1. .env에서 주소 가져오기
    db_url = os.getenv("DATABASE_URL")
    db_name = os.getenv("DB_NAME")

    # 2. MongoDB 클라이언트 생성 (비동기)
    client = AsyncIOMotorClient(db_url)
    
    # 3. Beanie 초기화 (DB와 모델 연결)
    await init_beanie(database=client[db_name], document_models=__all_models__)
